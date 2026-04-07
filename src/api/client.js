const BASE_URL = window.location.hostname === 'localhost' && window.location.port === '5173'
  ? 'http://localhost:8080'   // dev mode (npm run dev)
  : '';                        // docker (nginx proxies /api → backend)

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/';
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.message || `Error ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──
export function login(username, password) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function createUser(data) {
  return request('/api/v1/auth/usuarios', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function changeRole(userId, rol) {
  return request(`/api/v1/auth/usuarios/${userId}/rol`, {
    method: 'PATCH',
    body: JSON.stringify({ rol }),
  });
}

// ── Applicants ──
export function searchApplicants(q = '', page = 0, size = 10) {
  const params = new URLSearchParams({ page, size });
  if (q) params.set('q', q);
  return request(`/api/v1/solicitantes?${params}`);
}

export function registerApplicant(data) {
  return request('/api/v1/solicitantes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateApplicant(id, data) {
  return request(`/api/v1/solicitantes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
