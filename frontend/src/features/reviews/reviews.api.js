import { api } from '../../lib/api';

export async function getMyReviews() {
  const { data } = await api.get('/api/reviews/mine');
  return data.items || [];
}

