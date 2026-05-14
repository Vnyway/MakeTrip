import { api } from '../../lib/api';

export async function getProfile() {
  const { data } = await api.get('/api/profile');
  return data;
}

