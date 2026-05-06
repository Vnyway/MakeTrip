export function getErrorMessage(error, fallback = 'Something went wrong.') {
  const apiMessage = error?.response?.data?.message;

  if (typeof apiMessage === 'string' && apiMessage.trim()) {
    return apiMessage;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
