import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApplicants, getEvaluations } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [totalApplicants, setTotalApplicants] = useState(null);
  const [evalMonth, setEvalMonth] = useState(null);
  const [pendientes, setPendientes] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = auth?.role;
  const canEvaluate = ['ADMIN', 'ANALYST'].includes(role);

  useEffect(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();

    Promise.all([
      searchApplicants('', 0, 1).catch(() => null),
      getEvaluations().catch(() => []),
    ]).then(([applicantsData, evals]) => {
      setTotalApplicants(applicantsData?.page?.totalElements ?? 0);

      const list = Array.isArray(evals) ? evals : (evals?.content || []);
      const delMes = list.filter(e => {
        const d = new Date(e.evaluatedAt);
        return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
      });
      setEvalMonth(delMes.length);
      setPendientes(list.filter(e => !e.knockedOut && !e.hasCreditDecision).length);
    }).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>{greeting}, {auth?.username}</h2>
          <p>Panel principal — {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">👤</div>
          <div>
            <div className="stat-value">{loading ? '—' : totalApplicants}</div>
            <div className="stat-label">Solicitantes registrados</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">✓</div>
          <div>
            <div className="stat-value">{loading ? '—' : evalMonth}</div>
            <div className="stat-label">Evaluaciones del mes</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">⚠</div>
          <div>
            <div className="stat-value">{loading ? '—' : pendientes}</div>
            <div className="stat-label">Pendientes de decisión</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">◈</div>
          <div>
            <div className="stat-value">{role}</div>
            <div className="stat-label">Tu rol</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3>Acciones rápidas</h3>
        </div>
        <div className="card-body">
          <div className="quick-actions">
            <button onClick={() => navigate('/solicitantes/nuevo')}>
              + Nuevo Solicitante
            </button>
            {canEvaluate && (
              <button className="btn-success" onClick={() => navigate('/evaluaciones/nueva')}>
                ▶ Nueva Evaluación
              </button>
            )}
            <button className="btn-secondary" onClick={() => navigate('/solicitantes')}>
              Ver Solicitantes
            </button>
            <button className="btn-secondary" onClick={() => navigate('/evaluaciones')}>
              Ver Evaluaciones
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Bienvenido a CrediScan</h3>
        </div>
        <div className="card-body">
          <p style={{ fontSize: '.875rem', color: 'var(--navy-600)', lineHeight: '1.7' }}>
            CrediScan es el motor de scoring crediticio de la Fábrica de Escuela UdeA.
            Permite registrar solicitantes, cargar datos financieros, ejecutar evaluaciones
            con modelos configurables, registrar decisiones y auditar todas las acciones del sistema.
          </p>
          <ul style={{ fontSize: '.875rem', color: 'var(--navy-600)', marginTop: '.75rem', paddingLeft: '1.25rem', lineHeight: '2' }}>
            {canEvaluate && <li>Como <strong>{role}</strong>, podés registrar solicitantes y ejecutar evaluaciones.</li>}
            {role === 'RISK_MANAGER' && <li>Como <strong>Risk Manager</strong>, podés gestionar variables, modelos y decisiones.</li>}
            {role === 'ADMIN' && <li>Como <strong>Administrador</strong>, tenés acceso completo a todas las funciones.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
