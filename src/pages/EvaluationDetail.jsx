import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getEvaluation, getDecision, registerDecision, getEvaluationPdf } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CAMPOS_DISPONIBLES } from './scoring-models-constants';
import Button from '../components/ui/Button';

const RISK_LABELS = {
  VERY_LOW: 'Muy Bajo',
  LOW: 'Bajo',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
  VERY_HIGH: 'Muy Alto',
  REJECTED: 'Rechazado',
};

const DECISION_OPTIONS = [
  { value: 'APPROVED', label: 'Aprobar' },
  { value: 'REJECTED', label: 'Rechazar' },
  { value: 'MANUAL_REVIEW', label: 'Revisión Manual' },
  { value: 'ESCALATED', label: 'Escalar' },
];

const DECISION_LABELS = {
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  MANUAL_REVIEW: 'Revisión Manual',
  ESCALATED: 'Escalado',
};

function getVariableLabel(snakeValue) {
  const found = CAMPOS_DISPONIBLES.find(c => c.value === snakeValue);
  return found ? found.label : snakeValue;
}

function RiskBadge({ level }) {
  return (
    <span className={`badge badge-${level}`}>
      {RISK_LABELS[level] || level}
    </span>
  );
}

function DecisionBadge({ decision }) {
  return (
    <span className={`badge badge-${decision}`}>
      {DECISION_LABELS[decision] || decision}
    </span>
  );
}

export default function EvaluationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const role = auth?.role;

  const canDecide = ['ADMIN', 'RISK_MANAGER'].includes(role);

  const [evaluation, setEvaluation] = useState(null);
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [decisionForm, setDecisionForm] = useState({ decision: 'APPROVED', observations: '' });
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const ev = await getEvaluation(id);
        setEvaluation(ev);
        // Try to load existing decision
        try {
          const dec = await getDecision(id);
          setDecision(dec);
        } catch {
          // No decision yet — that's fine
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function onDecisionSubmit(e) {
    e.preventDefault();
    if (decisionForm.observations.length < 20) {
      setDecisionError('Las observaciones deben tener al menos 20 caracteres.');
      return;
    }
    setSubmittingDecision(true);
    setDecisionError('');
    try {
      const dec = await registerDecision(id, decisionForm);
      setDecision(dec);
    } catch (err) {
      setDecisionError(err.message);
    } finally {
      setSubmittingDecision(false);
    }
  }

  async function downloadPdf() {
    setPdfError('');
    try {
      const res = await fetch(getEvaluationPdf(id), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `evaluacion-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setPdfError(`No se pudo descargar el PDF: ${err.message}`);
    }
  }

  if (loading) return <div className="loading-wrapper"><div className="spinner"></div> Cargando evaluación...</div>;
  if (error) return (
    <div>
      <button className="back-link" onClick={() => navigate('/evaluaciones')}>← Volver</button>
      <div className="alert error">{error}</div>
    </div>
  );
  if (!evaluation) return null;

  const scorePercent = Math.min(100, Math.max(0, evaluation.totalScore));
  const scoreBarClass = scorePercent >= 70 ? 'evaldetail-bar-good' : scorePercent >= 40 ? 'evaldetail-bar-mid' : 'evaldetail-bar-bad';

  return (
    <div>
      <button className="back-link" onClick={() => navigate('/evaluaciones')}>
        ← Volver a Evaluaciones
      </button>

      <div className="page-header">
        <div className="page-title-group">
          <h2>Resultado de Evaluación</h2>
          <p className="cell-mono">{id}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={downloadPdf}>Descargar PDF</Button>
      </div>
      {pdfError && <div className="alert error">{pdfError}</div>}

      {/* KO Banner */}
      {evaluation.knockedOut && (
        <div className="ko-banner">
          <span className="ko-banner-icon">⛔</span>
          <div className="ko-banner-text">
            <strong>Evaluación bloqueada por regla KO.</strong>
            {evaluation.knockoutReasons && (
              <ul style={{ marginTop: '.35rem', paddingLeft: '1.2rem' }}>
                {(Array.isArray(evaluation.knockoutReasons)
                  ? evaluation.knockoutReasons
                  : [evaluation.knockoutReasons]
                ).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            {evaluation.knockouts && evaluation.knockouts.filter(k => k.triggered).length > 0 && (
              <ul style={{ marginTop: '.35rem', paddingLeft: '1.2rem' }}>
                {evaluation.knockouts.filter(k => k.triggered).map((k, i) => <li key={i}>{k.ruleName}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Score Summary Card */}
      <div className="card evaldetail-card-spaced">
        <div className="card-body">
          <div className="score-section">
            <div className="score-cell">
              <div className="score-big">{evaluation.totalScore ?? '—'}</div>
              <div className="score-label">Puntaje Total</div>
            </div>
            <div className="score-cell">
              <div>
                <RiskBadge level={evaluation.riskLevel} />
              </div>
              <div className="score-label">Nivel de Riesgo</div>
            </div>
            <div className="score-cell">
              <div className={`evaldetail-ko-value ${evaluation.knockedOut ? 'ko' : 'ok'}`}>
                {evaluation.knockedOut ? 'SÍ' : 'NO'}
              </div>
              <div className="score-label">KO Activado</div>
            </div>
            <div className="score-cell">
              <div className="decision-field-value">
                {evaluation.evaluatedBy || '—'}
              </div>
              <div className="score-label">Evaluado por</div>
            </div>
            <div className="score-cell">
              <div className="decision-field-value">
                {evaluation.evaluatedAt ? new Date(evaluation.evaluatedAt).toLocaleString('es-CO') : '—'}
              </div>
              <div className="score-label">Fecha</div>
            </div>
          </div>

          {/* Score bar */}
          <div className="evaldetail-score-bar-wrapper">
            <div className="evaldetail-score-bar-labels">
              <span>0</span>
              <span>Puntaje: {evaluation.totalScore}</span>
              <span>100</span>
            </div>
            <div className="evaldetail-score-bar-track">
              <div
                className={`evaldetail-score-bar-fill ${scoreBarClass}`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown Table */}
      {evaluation.details && evaluation.details.length > 0 && (
        <div className="card evaldetail-card-spaced">
          <div className="card-header">
            <h3>Desglose por Variable</h3>
          </div>
          <div className="table-wrapper evaldetail-table-inset">
            <table>
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Valor Raw</th>
                  <th>Puntaje</th>
                  <th>Peso</th>
                  <th>Puntaje Ponderado</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.details.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{getVariableLabel(d.variableName)}</td>
                    <td style={{ fontFamily: 'monospace' }}>{d.rawValue}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <div style={{
                          width: '40px', height: '4px', background: 'var(--navy-200)',
                          borderRadius: '2px', overflow: 'hidden', display: 'inline-block'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, d.score)}%`,
                            background: d.score >= 70 ? 'var(--green)' : d.score >= 40 ? 'var(--amber)' : 'var(--red)',
                          }} />
                        </div>
                        {d.score}
                      </div>
                    </td>
                    <td>{(d.weight * 100).toFixed(0)}%</td>
                    <td style={{ fontWeight: 600 }}>{(d.score * d.weight).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit Decision */}
      <div className="decision-card">
        <h3>Decisión Crediticia</h3>

        {decision ? (
          <div>
            <div className="decision-display">
              <div className="decision-field">
                <span className="decision-field-label">Decisión</span>
                <DecisionBadge decision={decision.decision} />
              </div>
              <div className="decision-field">
                <span className="decision-field-label">Decidido por</span>
                <span className="decision-field-value">{decision.decidedBy}</span>
              </div>
              <div className="decision-field">
                <span className="decision-field-label">Fecha</span>
                <span className="decision-field-value">
                  {decision.decidedAt ? new Date(decision.decidedAt).toLocaleString('es-CO') : '—'}
                </span>
              </div>
              {decision.resolutionDeadlineAt && (
                <div className="decision-field">
                  <span className="decision-field-label">Límite resolución</span>
                  <span className="decision-field-value">
                    {new Date(decision.resolutionDeadlineAt).toLocaleString('es-CO')}
                  </span>
                </div>
              )}
            </div>
            {decision.observations && (
              <div className="evaldetail-observations">
                <strong className="decision-field-label">Observaciones</strong>
                <p>{decision.observations}</p>
              </div>
            )}
          </div>
        ) : canDecide ? (
          <form onSubmit={onDecisionSubmit}>
            {decisionError && <div className="alert error">{decisionError}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label>Decisión *</label>
                <select
                  value={decisionForm.decision}
                  onChange={e => setDecisionForm({ ...decisionForm, decision: e.target.value })}
                >
                  {DECISION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group form-full">
                <label>Observaciones * (mínimo 20 caracteres)</label>
                <textarea
                  value={decisionForm.observations}
                  onChange={e => setDecisionForm({ ...decisionForm, observations: e.target.value })}
                  placeholder="Justificación de la decisión crediticia..."
                  required
                  minLength={20}
                />
                <span className={`evaldetail-char-count ${decisionForm.observations.length >= 20 ? 'valid' : 'invalid'}`}>
                  {decisionForm.observations.length} / 20 caracteres mínimos
                </span>
              </div>
            </div>
            <Button type="submit" disabled={submittingDecision}>
              {submittingDecision ? 'Registrando...' : 'Registrar Decisión'}
            </Button>
          </form>
        ) : (
          <div className="alert info" style={{ marginBottom: 0 }}>
            Aún no hay una decisión registrada para esta evaluación.
          </div>
        )}
      </div>
    </div>
  );
}
