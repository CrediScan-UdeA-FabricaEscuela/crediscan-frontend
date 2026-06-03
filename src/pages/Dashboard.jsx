import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApplicants, getEvaluations } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import {
  UsersIcon,
  ListIcon,
  AuditIcon,
  AdminIcon,
  PlusIcon,
  FileIcon,
} from '../components/icons';

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
      // Pendiente de decisión = evaluación sin decisionStatus registrado.
      // (Los campos knockedOut/hasCreditDecision no existen en la API; el real es decisionStatus.)
      setPendientes(list.filter(e => !e.decisionStatus).length);
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
        <div className="page-header-actions">
          <Button
            variant="outline"
            disabled
            title="Próximamente"
            icon={<FileIcon size={15} />}
          >
            Exportar reporte
          </Button>
          {canEvaluate && (
            <Button
              variant="primary"
              onClick={() => navigate('/evaluaciones/nueva')}
              icon={<PlusIcon size={15} />}
            >
              Nueva Evaluación
            </Button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          value={totalApplicants}
          label="Solicitantes registrados"
          icon={<UsersIcon size={20} />}
          accent="blue"
          loading={loading}
        />
        <StatCard
          value={evalMonth}
          label="Evaluaciones del mes"
          icon={<ListIcon size={20} />}
          accent="green"
          loading={loading}
        />
        <StatCard
          value={pendientes}
          label="Pendientes de decisión"
          icon={<AuditIcon size={20} />}
          accent="amber"
          loading={loading}
        />
        <StatCard
          value={role}
          label="Tu rol"
          icon={<AdminIcon size={20} />}
          accent="purple"
          loading={loading}
        />
      </div>

      <div className="card card-mb">
        <div className="card-header">
          <h3>Acciones rápidas</h3>
        </div>
        <div className="card-body">
          <div className="quick-actions">
            <Button
              variant="primary"
              onClick={() => navigate('/solicitantes/nuevo')}
              icon={<PlusIcon size={15} />}
            >
              Nuevo Solicitante
            </Button>
            {canEvaluate && (
              <Button
                variant="success"
                onClick={() => navigate('/evaluaciones/nueva')}
              >
                ▶ Nueva Evaluación
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => navigate('/solicitantes')}
            >
              Ver Solicitantes
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/evaluaciones')}
            >
              Ver Evaluaciones
            </Button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Bienvenido a CrediScan</h3>
        </div>
        <div className="card-body">
          <p className="welcome-description">
            CrediScan es el motor de scoring crediticio de la Fábrica de Escuela UdeA.
            Permite registrar solicitantes, cargar datos financieros, ejecutar evaluaciones
            con modelos configurables, registrar decisiones y auditar todas las acciones del sistema.
          </p>
          <ul className="welcome-list">
            {canEvaluate && <li>Como <strong>{role}</strong>, podés registrar solicitantes y ejecutar evaluaciones.</li>}
            {role === 'RISK_MANAGER' && <li>Como <strong>Risk Manager</strong>, podés gestionar variables, modelos y decisiones.</li>}
            {role === 'ADMIN' && <li>Como <strong>Administrador</strong>, tenés acceso completo a todas las funciones.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
