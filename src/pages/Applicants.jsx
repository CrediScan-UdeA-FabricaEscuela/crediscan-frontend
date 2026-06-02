import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApplicants } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { UsersIcon } from '../components/icons';

const PAGE_SIZE = 10;

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

  const from = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = page * PAGE_SIZE + rows.length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Solicitantes</h2>
          <p>{totalElements} registros totales</p>
        </div>
        <Button onClick={() => navigate('/solicitantes/nuevo')}>+ Nuevo Solicitante</Button>
      </div>

      <form onSubmit={onSearch} className="search-bar">
        <input
          placeholder="Buscar por nombre o identificación..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Button type="submit">Buscar</Button>
        {query && (
          <Button
            variant="secondary"
            type="button"
            onClick={() => { setQuery(''); setPage(0); load('', 0); }}
          >
            Limpiar
          </Button>
        )}
      </form>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="loading-wrapper"><div className="spinner"></div> Cargando...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <UsersIcon size={40} />
          </div>
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
                  <td className="cell-name">
                    <Avatar name={r.nombre} size="sm" />
                    <span>{r.nombre}</span>
                  </td>
                  <td className="cell-mono">{r.identificacion}</td>
                  <td>
                    <span className={`badge badge-empleo-${r.tipo_empleo}`}>
                      {r.tipo_empleo}
                    </span>
                  </td>
                  <td>${Number(r.ingresos_mensuales).toLocaleString('es-CO')}</td>
                  <td>{r.antiguedad_laboral} meses</td>
                  <td>{r.phone || r.telefono || '—'}</td>
                  <td className="cell-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/solicitantes/${r.id}/editar`)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/solicitantes/${r.id}/financiero`)}
                    >
                      Financiero
                    </Button>
                    {canEvaluate && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => navigate(`/evaluaciones/nueva?applicantId=${r.id}`)}
                      >
                        Evaluar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <span className="pagination-info">
              Mostrando {from}–{to} de {totalElements} registros
            </span>
            <div className="pagination-controls">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                ← Anterior
              </Button>
              <span>Página {page + 1} de {totalPages || 1}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
