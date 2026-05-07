import { api } from '../../lib/api';

export async function getProfile() {
  const { data } = await api.get('/api/profile');
  return data;
}

export async function updatePreferences(payload) {
  const { data } = await api.put('/api/profile/preferences', payload);
  return data.preferences;
}

