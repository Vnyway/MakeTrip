import { api } from '../../lib/api';

function cleanParams(params = {}) {
  const payload = { ...params };
  Object.keys(payload).forEach((key) => {
    if (payload[key] === '' || payload[key] == null) {
      delete payload[key];
    }
  });
  return payload;
}

export async function getRecommendations(params = {}) {
  const { data } = await api.get('/api/recommendations', {
    params: cleanParams(params),
  });
  return {
    recommendations: data.recommendations || [],
    meta: data.meta || null,
  };
}

