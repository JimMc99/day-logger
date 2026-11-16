
const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: body !== undefined
      ? JSON.stringify(body)
      : undefined
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  if (res.status === 204) return null

  return res.json()
}

export const api = {

  // Health
  getHealth: () =>
    request('GET', '/health'),

  // Babies
  getBabies: () =>
    request('GET', '/babies'),

  createBaby: data =>
    request('POST', '/babies', data),

  // Activities
  getEntryTypes: () =>
    request('GET', '/entry-types'),

  createEntryType: data =>
    request('POST', '/entry-types', data),

  updateEntryType: (id, data) =>
    request('PATCH', `/entry-types/${id}`, data),

  // Activity options
  createOption: (typeId, data) =>
    request('POST', `/entry-types/${typeId}/options`, data),

  updateOption: (typeId, optionId, data) =>
    request(
      'PATCH',
      `/entry-types/${typeId}/options/${optionId}`,
      data
    ),

  // Entries
  getEntries: (babyId = 1, limit = 200) =>
    request(
      'GET',
      `/entries?baby_id=${babyId}&limit=${limit}`
    ),

  getEntry: id =>
    request('GET', `/entries/${id}`),

  createEntry: data =>
    request('POST', '/entries', data),

  updateEntry: (id, data) =>
    request('PATCH', `/entries/${id}`, data),

  deleteEntry: id =>
    request('DELETE', `/entries/${id}`)
}
