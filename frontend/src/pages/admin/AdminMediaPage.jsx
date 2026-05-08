import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  createServiceMediaPresign,
  registerServiceMedia,
  listServiceMedia,
  getServiceMediaReadUrl,
} from '../../features/admin/admin.api';
import { getErrorMessage } from '../../lib/errors';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

function validateFile(file) {
  if (!file) return 'Select a file first.';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, PNG, and WEBP files are allowed.';
  if (file.size > MAX_BYTES) return 'Max file size is 5MB.';
  return null;
}

function uploadToPresignedUrl({ uploadUrl, file, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress?.(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Upload failed with status ${xhr.status}.`));
    };

    xhr.onerror = () => reject(new Error('Network error while uploading file.'));
    xhr.send(file);
  });
}

export function AdminMediaPage() {
  const [serviceId, setServiceId] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastPayload, setLastPayload] = useState(null);
  const [readErrors, setReadErrors] = useState({});

  const mediaQuery = useQuery({
    queryKey: ['admin', 'service-media', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const items = await listServiceMedia(serviceId);
      const withReadUrls = await Promise.all(
        items.map(async (item) => {
          try {
            const readUrl = await getServiceMediaReadUrl(serviceId, item.id);
            return { ...item, read_url: readUrl };
          } catch (error) {
            return { ...item, read_url: null, read_error: getErrorMessage(error, 'Could not get read URL.') };
          }
        }),
      );
      return withReadUrls;
    },
    enabled: Boolean(serviceId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (payload) => {
      const selected = payload?.file ?? file;
      const selectedServiceId = payload?.serviceId ?? serviceId;
      const selectedSort = payload?.sortOrder ?? sortOrder;

      const validationError = validateFile(selected);
      if (validationError) throw new Error(validationError);
      if (!selectedServiceId) throw new Error('Provide service id.');

      const presign = await createServiceMediaPresign(selectedServiceId, selected.type);
      await uploadToPresignedUrl({
        uploadUrl: presign.upload_url,
        file: selected,
        onProgress: setUploadProgress,
      });
      const media = await registerServiceMedia(selectedServiceId, {
        key: presign.key,
        media_type: 'image',
        sort_order: Number(selectedSort),
      });

      return media;
    },
    onSuccess: () => {
      toast.success('Media uploaded and linked.');
      setUploadProgress(0);
      setFile(null);
      mediaQuery.refetch();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not upload media.'));
    },
  });

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Admin Media</h1>
        <p className="mt-2 text-sm text-accent">Presign -&gt; upload to S3 -&gt; register key -&gt; read URL preview flow.</p>
      </header>

      <article className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const payload = { serviceId, sortOrder, file };
            setLastPayload(payload);
            uploadMutation.mutate(payload);
          }}
        >
          <input
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
            placeholder="Service ID (uuid)"
            required
          />
          <input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
            placeholder="Sort order"
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="w-full rounded-lg border border-mint-200 bg-surface px-3 py-2 text-sm"
            required
          />
          {file ? (
            <p className="text-xs text-accent">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          ) : null}
          {uploadMutation.isPending ? (
            <div className="rounded-lg border border-mint-200 bg-surface p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-accent">
                <span>Uploading to S3</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-mint-200">
                <div className="h-full bg-brand transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : null}
          <button type="submit" className="btn-primary" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Uploading...' : 'Upload media'}
          </button>
          {uploadMutation.isError && lastPayload ? (
            <button
              type="button"
              className="btn-soft ml-2"
              onClick={() => {
                setUploadProgress(0);
                uploadMutation.mutate(lastPayload);
              }}
            >
              Retry upload
            </button>
          ) : null}
        </form>
      </article>

      <article className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand">Service Media</h2>
          <button type="button" className="btn-soft" onClick={() => mediaQuery.refetch()} disabled={!serviceId}>
            Refresh
          </button>
        </div>
        {!serviceId ? (
          <p className="text-sm text-accent">Enter a service id above to load media list.</p>
        ) : mediaQuery.isLoading ? (
          <p className="text-sm text-accent">Loading media...</p>
        ) : !(mediaQuery.data || []).length ? (
          <p className="text-sm text-accent">No media attached to this service yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(mediaQuery.data || []).map((item) => (
              <article key={item.id} className="overflow-hidden rounded-lg border border-mint-200 bg-surface p-3">
                <div className="mb-2 text-xs text-accent">
                  <p>ID: {item.id}</p>
                  <p>Sort: {item.sort_order}</p>
                </div>
                {item.read_url ? (
                  <img src={item.read_url} alt={item.id} className="h-36 w-full rounded-md object-cover" />
                ) : (
                  <div className="h-36 rounded-md bg-mint-200" />
                )}
                {!item.read_url ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-red-600">{item.read_error || 'Could not load preview URL.'}</p>
                    <button
                      type="button"
                      className="btn-soft text-xs"
                      onClick={async () => {
                        try {
                          const url = await getServiceMediaReadUrl(serviceId, item.id);
                          mediaQuery.refetch();
                          setReadErrors((prev) => ({ ...prev, [item.id]: null }));
                          window.open(url, '_blank', 'noopener,noreferrer');
                        } catch (error) {
                          setReadErrors((prev) => ({
                            ...prev,
                            [item.id]: getErrorMessage(error, 'Could not get read URL.'),
                          }));
                        }
                      }}
                    >
                      Retry read URL
                    </button>
                    {readErrors[item.id] ? <p className="text-xs text-red-600">{readErrors[item.id]}</p> : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
