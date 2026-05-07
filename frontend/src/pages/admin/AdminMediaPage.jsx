import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createServiceMediaPresign, registerServiceMedia } from '../../features/admin/admin.api';
import { getErrorMessage } from '../../lib/errors';

export function AdminMediaPage() {
  const [serviceId, setServiceId] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [file, setFile] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Select a file first.');
      if (!serviceId) throw new Error('Provide service id.');

      const presign = await createServiceMediaPresign(serviceId, file.type || 'image/jpeg');

      const uploadResponse = await fetch(presign.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload to storage failed.');
      }

      const media = await registerServiceMedia(serviceId, {
        key: presign.key,
        media_type: 'image',
        sort_order: Number(sortOrder),
      });

      return media;
    },
    onSuccess: () => {
      toast.success('Media uploaded and linked.');
      setFile(null);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not upload media.')),
  });

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Admin Media</h1>
        <p className="mt-2 text-sm text-accent">Attach media to a service using presigned S3 upload flow.</p>
      </header>

      <article className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            uploadMutation.mutate();
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
          <button type="submit" className="btn-primary" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Uploading...' : 'Upload media'}
          </button>
        </form>
      </article>
    </section>
  );
}
