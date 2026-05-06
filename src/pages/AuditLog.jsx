import { useEffect, useState } from 'react';
import { getAuditLogs, getAuditExportUrl } from '../api/client';

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadAudit(page);
  }, [page]);

  async function loadAudit(p) {
    setLoading(true);
    setError('');
    try {
      const data = await getAuditLogs({ page: p, size: pageSize });
      // Handle both paginated and array responses
      if (Array.isArray(data)) {
        setRows(data);
        setTotalPages(1);
        setTotalElements(data.length);
      } else {
        setRows(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(ts) {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return ts;
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h2>Auditoría</h2>
          <p>{totalElements} eventos registrados</p>
        </div>
        <a href={getAuditExportUrl()} download="auditoria.csv">
          <button className="btn-secondary">⬇ Exportar CSV</button>
        </a>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="loading-wrapper"><div className="spinner"></div> Cargando registros...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>No hay registros de auditoría.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Recurso</th>
                <th>ID Recurso</th>
                <th>IP</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: '.78rem', fontFamily: 'monospace', color: 'var(--navy-600)', whiteSpace: 'nowrap' }}>
                    {formatDate(r.timestamp)}
                  </td>
                  <td style={{ fontWeight: 500 }}>{r.usuarioId || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{r.accion || '—'}</td>
                  <td style={{ fontSize: '.8rem' }}>{r.recurso || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.75rem', color: 'var(--navy-600)' }}>
                    {r.recursoId ? r.recursoId.substring(0, 8) + '...' : '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '.78rem' }}>{r.ip || '—'}</td>
                  <td>
                    <span className={r.resultado === 'SUCCESS' ? 'audit-result-OK' : 'audit-result-FAILURE'}>
                      {r.resultado || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-sm btn-secondary"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                ← Anterior
              </button>
              <span>Página {page + 1} de {totalPages}</span>
              <button
                className="btn-sm btn-secondary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
