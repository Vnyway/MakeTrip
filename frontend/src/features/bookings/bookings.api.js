import { api } from '../../lib/api';

export async function listMyBookings() {
  const { data } = await api.get('/api/bookings/mine');
  return data.items || [];
}

export async function getBookingById(bookingId) {
  const { data } = await api.get(`/api/bookings/${bookingId}`);
  return data.booking;
}

export async function createBooking(payload) {
  const { data } = await api.post('/api/bookings', payload);
  return data.booking;
}

export async function updateBookingStatus(bookingId, status) {
  const { data } = await api.patch(`/api/bookings/${bookingId}`, { status });
  return data.booking;
}

