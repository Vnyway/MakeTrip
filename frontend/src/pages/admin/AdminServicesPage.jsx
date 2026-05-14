import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  createAdminService,
  deleteAdminService,
  listAdminServices,
  updateAdminService,
  listCountries,
  listCities,
  createServiceMediaPresign,
  registerServiceMedia,
  listTags,
  setServiceTags,
} from '../../features/admin/admin.api';
import { TAGS } from '../../features/catalog/catalog.constants';
import { getErrorMessage } from '../../lib/errors';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function baseForm(kind = 'hotel') {
  return {
    title: '',
    description: '',
    country_id: '',
    city_id: '',
    price_usd: 0,
    status: 'active',
    kind,
    restaurant_cuisine: '',
    activity_kind: '',
    flight_origin_country_id: '',
    flight_origin_city_id: '',
    flight_destination_country_id: '',
    flight_destination_city_id: '',
    tags: [],
  };
}

function TagMultiSelect({ selected, onChange, compact = false }) {
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? '' : 'mt-1'}`}>
      {TAGS.map((tag) => {
        const active = selected.includes(tag.slug);
        return (
          <button
            key={tag.slug}
            type="button"
            onClick={() =>
              onChange(active ? selected.filter((s) => s !== tag.slug) : [...selected, tag.slug])
            }
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
              active
                ? 'border-brand bg-brand text-white'
                : 'border-mint-200 bg-white text-accent hover:border-brand hover:text-brand'
            }`}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}

function validateImage(file) {
  if (!file) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Only JPG, PNG, and WEBP files are allowed.';
  if (file.size > MAX_IMAGE_BYTES) return 'Max image size is 5MB.';
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
      reject(new Error(`Image upload failed with status ${xhr.status}.`));
    };

    xhr.onerror = () => reject(new Error('Network error while uploading image.'));
    xhr.send(file);
  });
}

function toPayload(form) {
  const common = {
    title: form.title,
    description: form.description || null,
    country_id: Number(form.country_id),
    city_id: Number(form.city_id),
    price_usd: Number(form.price_usd),
    status: form.status,
    kind: form.kind,
  };
  if (form.kind === 'hotel') return { ...common, hotel: {} };
  if (form.kind === 'restaurant') return { ...common, restaurant: { cuisine: form.restaurant_cuisine || null } };
  if (form.kind === 'activity') return { ...common, activity: { activity_kind: form.activity_kind || 'general' } };
  return {
    ...common,
    flight: {
      origin_city_id: Number(form.flight_origin_city_id),
      destination_city_id: Number(form.flight_destination_city_id),
    },
  };
}

export function AdminServicesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(baseForm());
  const [createImageFiles, setCreateImageFiles] = useState([]);
  const [createImageSortOrder, setCreateImageSortOrder] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadQueueState, setUploadQueueState] = useState({ current: 0, total: 0 });
  const countriesQuery = useQuery({
    queryKey: ['geo', 'countries'],
    queryFn: listCountries,
  });
  const countries = countriesQuery.data || [];

  const citiesQuery = useQuery({
    queryKey: ['geo', 'cities', 'service', form.country_id],
    queryFn: () => listCities(form.country_id),
    enabled: Boolean(form.country_id),
  });

  const originCitiesQuery = useQuery({
    queryKey: ['geo', 'cities', 'flight-origin', form.flight_origin_country_id],
    queryFn: () => listCities(form.flight_origin_country_id),
    enabled: Boolean(form.flight_origin_country_id),
  });

  const destinationCitiesQuery = useQuery({
    queryKey: ['geo', 'cities', 'flight-destination', form.flight_destination_country_id],
    queryFn: () => listCities(form.flight_destination_country_id),
    enabled: Boolean(form.flight_destination_country_id),
  });

  const query = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: listAdminServices,
  });

  useEffect(() => {
    if (!countries.length) return;
    setForm((prev) => {
      if (prev.country_id) return prev;
      return {
        ...prev,
        country_id: String(countries[0].id),
        flight_origin_country_id: String(countries[0].id),
        flight_destination_country_id: String(countries[0].id),
      };
    });
  }, [countries]);

  useEffect(() => {
    const list = citiesQuery.data || [];
    if (!list.length) return;
    setForm((prev) => {
      if (!prev.country_id || prev.city_id) return prev;
      return { ...prev, city_id: String(list[0].id) };
    });
  }, [citiesQuery.data]);

  useEffect(() => {
    const list = originCitiesQuery.data || [];
    if (!list.length) return;
    setForm((prev) => {
      if (!prev.flight_origin_country_id || prev.flight_origin_city_id) return prev;
      return { ...prev, flight_origin_city_id: String(list[0].id) };
    });
  }, [originCitiesQuery.data]);

  useEffect(() => {
    const list = destinationCitiesQuery.data || [];
    if (!list.length) return;
    setForm((prev) => {
      if (!prev.flight_destination_country_id || prev.flight_destination_city_id) return prev;
      return { ...prev, flight_destination_city_id: String(list[0].id) };
    });
  }, [destinationCitiesQuery.data]);

  const createMutation = useMutation({
    mutationFn: async ({ servicePayload, imageFiles, imageSortOrder }) => {
      for (const file of imageFiles || []) {
        const validationError = validateImage(file);
        if (validationError) {
          throw new Error(`${file.name}: ${validationError}`);
        }
      }

      const createdService = await createAdminService(servicePayload);

      if (imageFiles?.length) {
        const baseSort = Number(imageSortOrder || 0);
        setUploadQueueState({ current: 0, total: imageFiles.length });

        for (let index = 0; index < imageFiles.length; index += 1) {
          const imageFile = imageFiles[index];
          setUploadQueueState({ current: index + 1, total: imageFiles.length });

          const presign = await createServiceMediaPresign(createdService.id, imageFile.type);
          await uploadToPresignedUrl({
            uploadUrl: presign.upload_url,
            file: imageFile,
            onProgress: setUploadProgress,
          });
          await registerServiceMedia(createdService.id, {
            key: presign.key,
            media_type: 'image',
            sort_order: baseSort + index,
          });
        }
      }

      if (servicePayload.tags?.length) {
        await setServiceTags(createdService.id, servicePayload.tags);
      }

      return createdService;
    },
    onSuccess: async () => {
      toast.success(createImageFiles.length ? 'Service created with images.' : 'Service created.');
      setForm(baseForm(form.kind));
      setCreateImageFiles([]);
      setCreateImageSortOrder(0);
      setUploadProgress(0);
      setUploadQueueState({ current: 0, total: 0 });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
    onError: (error) => {
      setUploadProgress(0);
      setUploadQueueState({ current: 0, total: 0 });
      toast.error(getErrorMessage(error, 'Could not create service.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateAdminService(id, body),
    onSuccess: async () => {
      toast.success('Service updated.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update service.')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminService,
    onSuccess: async () => {
      toast.success('Service deleted.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete service.')),
  });

  const setTagsMutation = useMutation({
    mutationFn: ({ id, slugs }) => setServiceTags(id, slugs),
    onSuccess: async () => {
      toast.success('Tags updated.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'services'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update tags.')),
  });

  const items = query.data || [];
  const cityOptions = citiesQuery.data || [];
  const originCityOptions = originCitiesQuery.data || [];
  const destinationCityOptions = destinationCitiesQuery.data || [];
  const countryNameById = useMemo(
    () => Object.fromEntries(countries.map((c) => [String(c.id), c.name])),
    [countries],
  );

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-mint-200 bg-white p-5 shadow-card">
        <h1 className="text-3xl font-bold tracking-tight text-brand">Admin Services</h1>
      </header>

      <article className="rounded-xl border border-mint-200 bg-white p-4 shadow-card">
        <h2 className="text-lg font-semibold text-brand">Create Service</h2>
        <p className="mt-1 text-xs text-accent">Fill required fields first: title, type, country, city, and price.</p>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate({
              servicePayload: { ...toPayload(form), tags: form.tags },
              imageFiles: createImageFiles,
              imageSortOrder: createImageSortOrder,
            });
          }}
        >
          <label className="text-xs text-accent">
            Title
            <input
              className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
              placeholder="Grand Luxury Resort"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
          </label>
          <label className="text-xs text-accent">
            Service Type
            <select
              className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
              value={form.kind}
              onChange={(e) =>
                setForm((p) => ({
                  ...baseForm(e.target.value),
                  title: p.title,
                  country_id: p.country_id,
                  city_id: p.city_id,
                  flight_origin_country_id: p.flight_origin_country_id,
                  flight_origin_city_id: p.flight_origin_city_id,
                  flight_destination_country_id: p.flight_destination_country_id,
                  flight_destination_city_id: p.flight_destination_city_id,
                }))
              }
            >
              <option value="hotel">hotel</option>
              <option value="restaurant">restaurant</option>
              <option value="activity">activity</option>
              <option value="flight">flight</option>
            </select>
          </label>
          <label className="text-xs text-accent">
            Country
            <select
              className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
              value={form.country_id}
              required
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  country_id: e.target.value,
                  city_id: '',
                }))
              }
            >
              <option value="">Select country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-accent">
            City
            <select
              className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
              value={form.city_id}
              disabled={!form.country_id || citiesQuery.isLoading}
              required
              onChange={(e) => setForm((p) => ({ ...p, city_id: e.target.value }))}
            >
              <option value="">{form.country_id ? 'Select city' : 'Select country first'}</option>
              {cityOptions.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-accent">
            Price (USD)
            <input
              type="number"
              className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
              value={form.price_usd}
              onChange={(e) => setForm((p) => ({ ...p, price_usd: e.target.value }))}
            />
          </label>
          <label className="text-xs text-accent">
            Status
            <select
              className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="active">active</option>
              <option value="draft">draft</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          {form.kind === 'restaurant' ? (
            <label className="text-xs text-accent sm:col-span-2">
              Cuisine
              <input
                className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
                placeholder="Italian / Japanese / etc"
                value={form.restaurant_cuisine}
                onChange={(e) => setForm((p) => ({ ...p, restaurant_cuisine: e.target.value }))}
              />
            </label>
          ) : null}
          {form.kind === 'activity' ? (
            <label className="text-xs text-accent sm:col-span-2">
              Activity Kind
              <input
                className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
                placeholder="museum / hiking / wellness"
                value={form.activity_kind}
                onChange={(e) => setForm((p) => ({ ...p, activity_kind: e.target.value }))}
              />
            </label>
          ) : null}
          {form.kind === 'flight' ? (
            <>
              <label className="text-xs text-accent">
                Origin Country
                <select
                  className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
                  value={form.flight_origin_country_id}
                  required
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      flight_origin_country_id: e.target.value,
                      flight_origin_city_id: '',
                    }))
                  }
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-accent">
                Origin City
                <select
                  className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
                  value={form.flight_origin_city_id}
                  disabled={!form.flight_origin_country_id || originCitiesQuery.isLoading}
                  required
                  onChange={(e) => setForm((p) => ({ ...p, flight_origin_city_id: e.target.value }))}
                >
                  <option value="">{form.flight_origin_country_id ? 'Select city' : 'Select country first'}</option>
                  {originCityOptions.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-accent">
                Destination Country
                <select
                  className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
                  value={form.flight_destination_country_id}
                  required
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      flight_destination_country_id: e.target.value,
                      flight_destination_city_id: '',
                    }))
                  }
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-accent">
                Destination City
                <select
                  className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
                  value={form.flight_destination_city_id}
                  disabled={!form.flight_destination_country_id || destinationCitiesQuery.isLoading}
                  required
                  onChange={(e) => setForm((p) => ({ ...p, flight_destination_city_id: e.target.value }))}
                >
                  <option value="">
                    {form.flight_destination_country_id ? 'Select city' : 'Select country first'}
                  </option>
                  {destinationCityOptions.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label className="text-xs text-accent sm:col-span-2 lg:col-span-4">
            Description
            <textarea
              className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
              placeholder="Short description for this service"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>

          <div className="text-xs text-accent sm:col-span-2 lg:col-span-4">
            Tags
            <TagMultiSelect
              selected={form.tags}
              onChange={(tags) => setForm((p) => ({ ...p, tags }))}
            />
          </div>

          <label className="text-xs text-accent sm:col-span-2 lg:col-span-3">
            Service images (optional)
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setCreateImageFiles(Array.from(event.target.files || []))}
              className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand file:mr-3 file:rounded file:border-0 file:bg-mint-100 file:px-2 file:py-1"
            />
            <span className="mt-1 block text-[11px] text-accent">
              Allowed: JPG/PNG/WEBP, max 5MB each. You can select multiple files.
            </span>
            {createImageFiles.length ? (
              <span className="mt-1 block text-[11px] text-brand">
                Selected: {createImageFiles.length} file(s) {createImageFiles.map((f) => f.name).join(', ')}
              </span>
            ) : null}
          </label>

          <label className="text-xs text-accent">
            Image sort order
            <input
              type="number"
              min={0}
              value={createImageSortOrder}
              onChange={(event) => setCreateImageSortOrder(event.target.value)}
              className="mt-1 w-full rounded border border-mint-200 px-2 py-2 text-sm text-brand"
            />
          </label>

          {createMutation.isPending && createImageFiles.length ? (
            <div className="rounded-lg border border-mint-200 bg-surface p-3 sm:col-span-2 lg:col-span-4">
              <div className="mb-1 flex items-center justify-between text-xs text-accent">
                <span>
                  Uploading images to S3 ({uploadQueueState.current}/{uploadQueueState.total})
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-mint-200">
                <div className="h-full bg-brand transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : null}

          <button type="submit" className="btn-primary w-fit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create service'}
          </button>
        </form>
      </article>

      <div className="overflow-x-auto rounded-xl border border-mint-200 bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-surface">
            <tr className="text-left text-accent">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-mint-200">
                <td className="px-3 py-2 text-brand">{item.title}</td>
                <td className="px-3 py-2 text-accent">{item.kind}</td>
                <td className="px-3 py-2 text-accent">
                  {countryNameById[String(item.country_id)] || `Country #${item.country_id}`}
                </td>
                <td className="px-3 py-2 text-accent">${Number(item.price_usd || 0).toFixed(0)}</td>
                <td className="px-3 py-2">
                  <select
                    value={item.status}
                    onChange={(event) =>
                      updateMutation.mutate({
                        id: item.id,
                        body: { status: event.target.value },
                      })
                    }
                    className="rounded-md border border-mint-200 bg-white px-2 py-1 text-xs"
                  >
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="inactive">inactive</option>
                  </select>
                </td>
                <td className="px-3 py-2 max-w-[220px]">
                  <TagMultiSelect
                    selected={item.tags || []}
                    compact
                    onChange={(slugs) => setTagsMutation.mutate({ id: item.id, slugs })}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="btn-soft border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
