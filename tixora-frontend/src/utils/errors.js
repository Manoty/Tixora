export function getErrorMessage(err) {
  if (!err.response) {
    return 'Network error. Please check your connection.';
  }

  const data = err.response.data;

  if (!data) return `Error ${err.response.status}. Please try again.`;

  // Our custom shape
  if (typeof data.error === 'string') return data.error;

  // DRF default
  if (typeof data.detail === 'string') return data.detail;

  // Field errors
  if (typeof data === 'object') {
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      return `${firstKey}: ${Array.isArray(val) ? val[0] : val}`;
    }
  }

  return 'Something went wrong. Please try again.';
}

/**
 * Extract field-level errors for form display.
 */
export function getFieldErrors(err) {
  if (!err.response?.data) return {};
  const data = err.response.data;
  return data.details || (typeof data === 'object' ? data : {});
}