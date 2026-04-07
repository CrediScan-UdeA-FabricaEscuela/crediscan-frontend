import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApplicants } from '../api/client';

export default function Applicants() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function load(q, p) {
    setLoading(true);
    setError('');
    try {
      const data = await searchApplicants(q, p);
      setRows(data.content || []);
      setTotalPages(data.totalPages || 0);
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
        <h2>Solicitantes</h2>
        <button onClick={() => navigate('/solicitantes/nuevo')}>+ Nuevo</button>
      </div>

      <form onSubmit={onSearch} className="search-bar">
        <input
          placeholder="Buscar por nombre o identificacion..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : rows.length === 0 ? (
        <p className="empty">No se encontraron solicitantes.</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Identificacion</th>
                <th>Tipo Empleo</th>
                <th>Ingresos</th>
                <th>Antiguedad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.nombre}</td>
                  <td>{r.identificacion}</td>
                  <td>{r.tipo_empleo}</td>
                  <td>${Number(r.ingresos_mensuales).toLocaleString()}</td>
                  <td>{r.antiguedad_laboral} meses</td>
                  <td>
                    <button className="btn-sm" onClick={() => navigate(`/solicitantes/${r.id}/editar`)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <span>Pagina {page + 1} de {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        </>
      )}
    </div>
  );
}
