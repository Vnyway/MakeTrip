import { api } from '../../lib/api';

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

