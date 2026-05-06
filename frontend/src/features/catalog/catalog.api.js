import { api } from '../../lib/api';

export async function getServices(params) {
  const { data } = await api.get('/api/services', { params });
  return data;
}
