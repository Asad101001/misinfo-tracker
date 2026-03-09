const BASE = '/api'

export const api = {
  health:   () => fetch(`${BASE}/health`).then(r => r.json()),
  stats:    () => fetch(`${BASE}/stats`).then(r => r.json()),
  posts:    (params = '') => fetch(`${BASE}/posts${params}`).then(r => r.json()),
  post:     (id) => fetch(`${BASE}/posts/${id}`).then(r => r.json()),
  claims:   (params = '') => fetch(`${BASE}/claims${params}`).then(r => r.json()),
  velocity: () => fetch(`${BASE}/velocity`).then(r => r.json()),
  collect:  () => fetch(`${BASE}/collect`, { method: 'POST' }).then(r => r.json()),
}
