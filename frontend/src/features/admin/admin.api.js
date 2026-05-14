import { api } from '../../lib/api';

export async function getAdminDashboard() {
  const { data } = await api.get('/api/admin/dashboard');
  return data;
}

export async function listAdminBookings() {
  const { data } = await api.get('/api/admin/bookings');
  return data.items || [];
}

export async function patchAdminBookingStatus(bookingId, status) {
  const { data } = await api.patch(`/api/admin/bookings/${bookingId}`, { status });
  return data.booking;
}

export async function listAdminReviews() {
  const { data } = await api.get('/api/admin/reviews');
  return data.items || [];
}

export async function deleteAdminReview(reviewId) {
  await api.delete(`/api/admin/reviews/${reviewId}`);
}

export async function listAdminServices() {
  const { data } = await api.get('/api/services', { params: { limit: 100, page: 1, sort: 'created_at desc' } });
  return data.items || [];
}

export async function createAdminService(payload) {
  const { data } = await api.post('/api/services', payload);
  return data.service;
}

export async function updateAdminService(serviceId, payload) {
  const { data } = await api.patch(`/api/services/${serviceId}`, payload);
  return data.service;
}

export async function deleteAdminService(serviceId) {
  await api.delete(`/api/services/${serviceId}`);
}

export async function createServiceMediaPresign(serviceId, contentType) {
  const { data } = await api.post(`/api/services/${serviceId}/media/presign`, {
    content_type: contentType,
  });
  return data;
}

export async function registerServiceMedia(serviceId, payload) {
  const { data } = await api.post(`/api/services/${serviceId}/media`, payload);
  return data.media;
}

export async function listServiceMedia(serviceId) {
  const { data } = await api.get(`/api/services/${serviceId}/media`);
  return data.items || [];
}

export async function getServiceMediaReadUrl(serviceId, mediaId) {
  const { data } = await api.get(`/api/services/${serviceId}/media/${mediaId}/read`);
  return data.download_url;
}

export async function listTags() {
  const { data } = await api.get('/api/tags');
  return data.items || [];
}

export async function setServiceTags(serviceId, slugs) {
  const { data } = await api.put(`/api/services/${serviceId}/tags`, { slugs });
  return data.tags;
}

export async function listCountries() {
  const { data } = await api.get('/api/geo/countries');
  return data.items || [];
}

export async function listCities(countryId) {
  const { data } = await api.get('/api/geo/cities', {
    params: countryId ? { country_id: countryId } : {},
  });
  return data.items || [];
}

