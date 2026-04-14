const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  getCategories: () => request('GET', '/categories'),
  getFactors:    () => request('GET', '/factors'),
  createFactor:  (data) => request('POST', '/factors', data),
  deleteFactor:  (id) => request('DELETE', `/factors/${id}`),
  getEntries:    () => request('GET', '/entries'),
  createEntry:   (data) => request('POST', '/entries', data),
  deleteEntry:   (id) => request('DELETE', `/entries/${id}`),
}
