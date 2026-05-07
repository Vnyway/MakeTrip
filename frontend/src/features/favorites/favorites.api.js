import { api } from '../../lib/api';

export async function listFavorites() {
  const { data } = await api.get('/api/favorites');
  return data.items || [];
}

export async function addFavorite(serviceId) {
  await api.post('/api/favorites', { service_id: serviceId });
}

export async function removeFavorite(serviceId) {
  await api.delete(`/api/favorites/${serviceId}`);
}
