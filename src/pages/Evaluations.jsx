import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function EvaluationLookup({ onNavigate }) {
  const [evalId, setEvalId] = useState('');

  function go(e) {
    e.preventDefault();
    const trimmed = evalId.trim();
    if (trimmed) onNavigate(trimmed);
  }

  return (
    <form onSubmit={go} className="search-bar">
      <input
        placeholder="UUID de la evaluación..."
        value={evalId}
        onChange={e => setEvalId(e.target.value)}
        style={{ fontFamily: 'monospace', fontSize: '.85rem' }}
      />
      <button type="submit" disabled={!evalId.trim()}>Ver Evaluación</button>
    </form>
  );
}

export default function Evaluations() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const canEvaluate = ['ADMIN', 'ANALYST'].includes(auth?.role);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Evaluaciones</h2>
          <p>Historial de evaluaciones crediticias</p>
        </div>
        {canEvaluate && (
          <button onClick={() => navigate('/evaluaciones/nueva')}>
            ▶ Nueva Evaluación
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-body">
          <div className="alert info" style={{ marginBottom: 0 }}>
            El listado de evaluaciones no está disponible en la API actual.
            Para consultar una evaluación específica, ingresá su ID directamente.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">
          <h3>Consultar Evaluación por ID</h3>
        </div>
        <div className="card-body">
          <EvaluationLookup onNavigate={id => navigate(`/evaluaciones/${id}`)} />
        </div>
      </div>

      {canEvaluate && (
        <div className="card">
          <div className="card-header">
            <h3>Nueva Evaluación</h3>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '.875rem', color: 'var(--navy-600)', marginBottom: '1rem' }}>
              Seleccioná un solicitante y ejecutá el scoring contra el modelo activo.
            </p>
            <button onClick={() => navigate('/evaluaciones/nueva')}>
              ▶ Iniciar Evaluación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
