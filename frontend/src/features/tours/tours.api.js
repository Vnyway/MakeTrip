import { api } from '../../lib/api';

export async function listTours() {
  const { data } = await api.get('/api/tours');
  return data.tours || [];
}

export async function createTour(payload) {
  const { data } = await api.post('/api/tours', payload);
  return data.tour;
}

export async function updateTour(tourId, payload) {
  const { data } = await api.patch(`/api/tours/${tourId}`, payload);
  return data.tour;
}

export async function deleteTour(tourId) {
  await api.delete(`/api/tours/${tourId}`);
}

export async function getTourDetails(tourId) {
  const { data } = await api.get(`/api/tours/${tourId}`);
  return data;
}

export async function addTourItem(tourId, payload) {
  const { data } = await api.post(`/api/tours/${tourId}/items`, payload);
  return data.item;
}

export async function updateTourItem(tourId, itemId, payload) {
  const { data } = await api.patch(`/api/tours/${tourId}/items/${itemId}`, payload);
  return data.item;
}

export async function deleteTourItem(tourId, itemId) {
  await api.delete(`/api/tours/${tourId}/items/${itemId}`);
}

