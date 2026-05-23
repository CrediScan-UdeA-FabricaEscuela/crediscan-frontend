const BASE_URL = window.location.hostname === 'localhost' && window.location.port === '5173'
  ? 'http://localhost:8080'
  : (import.meta.env.VITE_API_URL || '');

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

/**
 * Búsqueda paginada con filtros. fechaDesde y fechaHasta son requeridos (ISO datetime).
 * Filtros opcionales: niveles[], puntajeMin, puntajeMax, decisiones[], analista, page, size.
 */
export function searchEvaluations({
  fechaDesde,
  fechaHasta,
  niveles,
  puntajeMin,
  puntajeMax,
  decisiones,
  analista,
  page = 0,
  size = 25,
} = {}) {
  const params = new URLSearchParams();
  params.set('fecha_desde', fechaDesde);
  params.set('fecha_hasta', fechaHasta);
  params.set('page', page);
  params.set('size', size);
  if (niveles?.length) niveles.forEach(n => params.append('nivel', n));
  if (puntajeMin != null && puntajeMin !== '') params.set('puntaje_min', puntajeMin);
  if (puntajeMax != null && puntajeMax !== '') params.set('puntaje_max', puntajeMax);
  if (decisiones?.length) decisiones.forEach(d => params.append('decision', d));
  if (analista) params.set('analista', analista);
  return request(`/api/v1/evaluaciones?${params}`);
}

export function getEvaluationStats(criteria) {
  const params = new URLSearchParams();
  params.set('fecha_desde', criteria.fechaDesde);
  params.set('fecha_hasta', criteria.fechaHasta);
  if (criteria.niveles?.length) criteria.niveles.forEach(n => params.append('nivel', n));
  if (criteria.puntajeMin != null && criteria.puntajeMin !== '') params.set('puntaje_min', criteria.puntajeMin);
  if (criteria.puntajeMax != null && criteria.puntajeMax !== '') params.set('puntaje_max', criteria.puntajeMax);
  if (criteria.decisiones?.length) criteria.decisiones.forEach(d => params.append('decision', d));
  if (criteria.analista) params.set('analista', criteria.analista);
  return request(`/api/v1/evaluaciones/estadisticas?${params}`);
}

export function getEvaluationsExportUrl(criteria, formato = 'CSV') {
  const params = new URLSearchParams();
  params.set('formato', formato);
  params.set('fecha_desde', criteria.fechaDesde);
  params.set('fecha_hasta', criteria.fechaHasta);
  if (criteria.niveles?.length) criteria.niveles.forEach(n => params.append('nivel', n));
  if (criteria.puntajeMin != null && criteria.puntajeMin !== '') params.set('puntaje_min', criteria.puntajeMin);
  if (criteria.puntajeMax != null && criteria.puntajeMax !== '') params.set('puntaje_max', criteria.puntajeMax);
  if (criteria.decisiones?.length) criteria.decisiones.forEach(d => params.append('decision', d));
  if (criteria.analista) params.set('analista', criteria.analista);
  return `${BASE_URL}/api/v1/evaluaciones/export?${params}`;
}

export function getClassificationSummary({ fechaDesde, fechaHasta } = {}) {
  const params = new URLSearchParams();
  if (fechaDesde) params.set('fechaDesde', fechaDesde);
  if (fechaHasta) params.set('fechaHasta', fechaHasta);
  return request(`/api/v1/evaluaciones/clasificacion?${params}`);
}

export function getClassificationByLevel(level, { fechaDesde, fechaHasta, page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page, size });
  if (fechaDesde) params.set('fechaDesde', fechaDesde);
  if (fechaHasta) params.set('fechaHasta', fechaHasta);
  return request(`/api/v1/evaluaciones/clasificacion/${level}?${params}`);
}

export function compareEvaluations(eval1, eval2) {
  return request(`/api/v1/evaluaciones/comparar?eval1=${eval1}&eval2=${eval2}`);
}

/** @deprecated Usar searchEvaluations con filtros. Mantenido temporalmente. */
export function getEvaluations() {
  return searchEvaluations({
    fechaDesde: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    fechaHasta: new Date().toISOString(),
    size: 100,
  });
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

export function getEvaluationDetail(id) {
  return request(`/api/v1/evaluaciones/${id}/detalle`);
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

// ── Scoring Engine / Simulation (HU-14) ──
export function simulateScore({ modeloId, valoresVariables }) {
  return request('/api/v1/scoring/simular', {
    method: 'POST',
    body: JSON.stringify({ modeloId, valoresVariables }),
  });
}

export function saveScenario({ modeloId, nombre, descripcion, valoresVariables }) {
  return request('/api/v1/scoring/simulaciones', {
    method: 'POST',
    body: JSON.stringify({ modeloId, nombre, descripcion, valoresVariables }),
  });
}

export function listScenarios(modeloId) {
  return request(`/api/v1/scoring/simulaciones?modeloId=${modeloId}`);
}

export function runScenario(scenarioId) {
  return request(`/api/v1/scoring/simulaciones/${scenarioId}/ejecutar`, {
    method: 'POST',
  });
}

// ── Compare Scoring Models (HU-08) ──
export function compareScoringModels(baseId, comparadoId) {
  return request(`/api/v1/modelos-scoring/comparar?base=${baseId}&comparado=${comparadoId}`);
}

// ── Reports (HU-15/16/17) ──

// HU-15: Distribución de riesgo
export function getRiskDistribution({ fechaDesde, fechaHasta, tipoEmpleo } = {}) {
  const params = new URLSearchParams();
  if (fechaDesde) params.set('fecha_desde', fechaDesde);
  if (fechaHasta) params.set('fecha_hasta', fechaHasta);
  if (tipoEmpleo) params.set('tipo_empleo', tipoEmpleo);
  return request(`/api/v1/reportes/distribucion-riesgo?${params}`);
}

export function getRiskDistributionPdfUrl({ fechaDesde, fechaHasta, tipoEmpleo } = {}) {
  const params = new URLSearchParams();
  if (fechaDesde) params.set('fecha_desde', fechaDesde);
  if (fechaHasta) params.set('fecha_hasta', fechaHasta);
  if (tipoEmpleo) params.set('tipo_empleo', tipoEmpleo);
  return `${BASE_URL}/api/v1/reportes/distribucion-riesgo/pdf?${params}`;
}

// HU-16: Efectividad del modelo (nota: param names son 'desde' y 'hasta', no 'fecha_desde')
export function getModelEffectiveness({ desde, hasta, analistaId } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (analistaId) params.set('analistaId', analistaId);
  return request(`/api/v1/reportes/efectividad-modelo?${params}`);
}

export function getModelEffectivenessPdfUrl({ desde, hasta, analistaId } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (analistaId) params.set('analistaId', analistaId);
  return `${BASE_URL}/api/v1/reportes/efectividad-modelo/pdf?${params}`;
}

// HU-17: Actividad de analistas
export function getAnalystActivity({ desde, hasta } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  return request(`/api/v1/reportes/actividad-analistas?${params}`);
}

export function getAnalystActivityPdfUrl({ desde, hasta } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  return `${BASE_URL}/api/v1/reportes/actividad-analistas/pdf?${params}`;
}

export function getAnalystActivityCsvUrl({ desde, hasta } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  return `${BASE_URL}/api/v1/reportes/actividad-analistas/csv?${params}`;
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
