const BASE_URL = window.location.hostname === 'localhost' && window.location.port === '5173'
  ? 'http://localhost:8080'
  : '';

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

export function logout() {
  return request('/api/v1/auth/logout', { method: 'POST' }).catch(() => null);
}

// ── Applicants ──
export function searchApplicants(q = '', page = 0, size = 10) {
  const params = new URLSearchParams({ page, size });
  if (q) params.set('q', q);
  return request(`/api/v1/solicitantes?${params}`);
}

export function getApplicant(id) {
  return request(`/api/v1/solicitantes/${id}`);
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

// ── Financial Data ──
export function addFinancialData(applicantId, data) {
  return request(`/api/v1/solicitantes/${applicantId}/datos-financieros`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Scoring Variables ──
export function getScoringVariables() {
  return request('/api/v1/variables-scoring');
}

export function createScoringVariable(data) {
  return request('/api/v1/variables-scoring', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateScoringVariable(id, data) {
  return request(`/api/v1/variables-scoring/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Scoring Models ──
export function getScoringModels() {
  return request('/api/v1/modelos-scoring');
}

export function getScoringModel(id) {
  return request(`/api/v1/modelos-scoring/${id}`);
}

export async function getActiveModel() {
  const models = await request('/api/v1/modelos-scoring');
  const list = Array.isArray(models) ? models : (models?.content || []);
  return list.find(m => m.estado === 'ACTIVE') || null;
}

export function createScoringModel(data) {
  return request('/api/v1/modelos-scoring', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function activateModel(id) {
  return request(`/api/v1/modelos-scoring/${id}/activar`, {
    method: 'PUT',
  });
}

export function deleteScoringModel(id) {
  return request(`/api/v1/modelos-scoring/${id}`, {
    method: 'DELETE',
  });
}

// ── KO Rules ──
export function getKnockoutRules(modelId) {
  return request(`/api/v1/modelos-scoring/${modelId}/reglas-knockout`);
}

export function createKnockoutRule(modelId, data) {
  return request(`/api/v1/modelos-scoring/${modelId}/reglas-knockout`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateKnockoutRule(modelId, ruleId, data) {
  return request(`/api/v1/modelos-scoring/${modelId}/reglas-knockout/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteKnockoutRule(modelId, ruleId) {
  return request(`/api/v1/modelos-scoring/${modelId}/reglas-knockout/${ruleId}`, {
    method: 'DELETE',
  });
}

// ── Evaluations ──
export function getEvaluations() {
  return request('/api/v1/evaluaciones');
}

export function executeEvaluation(data) {
  return request('/api/v1/evaluaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getEvaluation(id) {
  return request(`/api/v1/evaluaciones/${id}`);
}

export function getEvaluationPdf(id) {
  return `${BASE_URL}/api/v1/evaluaciones/${id}/pdf`;
}

// ── Credit Decisions ──
export function registerDecision(evaluationId, data) {
  return request(`/api/v1/evaluaciones/${evaluationId}/decision`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getDecision(evaluationId) {
  return request(`/api/v1/evaluaciones/${evaluationId}/decision`);
}

// ── Scoring Engine ──
export function simulateScore(data) {
  return request('/api/v1/scoring/simular', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Audit ──
export function getAuditLogs(params = {}) {
  const qp = new URLSearchParams(params);
  return request(`/api/v1/auditoria?${qp}`);
}

export function getAuditExportUrl() {
  const token = localStorage.getItem('token');
  return `${BASE_URL}/api/v1/auditoria/export?token=${token}`;
}
