import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApplicants } from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMPLEO_LABELS = {
  EMPLEADO: 'Empleado',
  INDEPENDIENTE: 'Independiente',
  PENSIONADO: 'Pensionado',
  DESEMPLEADO: 'Desempleado',
};

export default function Applicants() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { auth } = useAuth();

  const canEvaluate = ['ADMIN', 'ANALYST'].includes(auth?.role);

  async function load(q, p) {
    setLoading(true);
    setError('');
    try {
      const data = await searchApplicants(q, p);
      setRows(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(query, page); }, [page]);

  function onSearch(e) {
    e.preventDefault();
    setPage(0);
    load(query, 0);
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Solicitantes</h2>
          <p>{totalElements} registros totales</p>
        </div>
        <button onClick={() => navigate('/solicitantes/nuevo')}>+ Nuevo Solicitante</button>
      </div>

      <form onSubmit={onSearch} className="search-bar">
        <input
          placeholder="Buscar por nombre o identificación..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit">Buscar</button>
        {query && (
          <button type="button" className="btn-secondary" onClick={() => { setQuery(''); setPage(0); load('', 0); }}>
            Limpiar
          </button>
        )}
      </form>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="loading-wrapper"><div className="spinner"></div> Cargando...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <p>No se encontraron solicitantes.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Identificación</th>
                <th>Tipo Empleo</th>
                <th>Ingresos / mes</th>
                <th>Antigüedad</th>
                <th>Teléfono</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.nombre}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{r.identificacion}</td>
                  <td><span className="badge badge-DRAFT">{EMPLEO_LABELS[r.tipo_empleo] || r.tipo_empleo}</span></td>
                  <td>${Number(r.ingresos_mensuales).toLocaleString('es-CO')}</td>
                  <td>{r.antiguedad_laboral} meses</td>
                  <td>{r.phone || r.telefono || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => navigate(`/solicitantes/${r.id}/editar`)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-sm btn-ghost"
                        onClick={() => navigate(`/solicitantes/${r.id}/financiero`)}
                      >
                        Financiero
                      </button>
                      {canEvaluate && (
                        <button
                          className="btn-sm btn-success"
                          onClick={() => navigate(`/evaluaciones/nueva?applicantId=${r.id}`)}
                        >
                          Evaluar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              className="btn-sm btn-secondary"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              ← Anterior
            </button>
            <span>Página {page + 1} de {totalPages || 1}</span>
            <button
              className="btn-sm btn-secondary"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
