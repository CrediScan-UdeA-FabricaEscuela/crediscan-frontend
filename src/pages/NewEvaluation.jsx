import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchApplicants, getActiveModel, executeEvaluation } from '../api/client';

export default function NewEvaluation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill from query param
  const prefilledId = searchParams.get('applicantId');

  useEffect(() => {
    getActiveModel()
      .then(m => setActiveModel(m))
      .catch(() => setActiveModel(null))
      .finally(() => setLoadingModel(false));
  }, []);

  // If applicantId is in URL, load that applicant
  useEffect(() => {
    if (!prefilledId) return;
    searchApplicants('', 0, 100)
      .then(data => {
        const found = (data.content || []).find(a => a.id === prefilledId);
        if (found) setSelectedApplicant(found);
      })
      .catch(() => {});
  }, [prefilledId]);

  async function onSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError('');
    try {
      const data = await searchApplicants(searchQuery, 0, 10);
      setSearchResults(data.content || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function selectApplicant(a) {
    setSelectedApplicant(a);
    setSearchResults([]);
    setSearchQuery('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!selectedApplicant) { setError('Seleccioná un solicitante'); return; }
    if (!activeModel) { setError('No hay ningún modelo activo. Activá un modelo en la sección Modelos.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const evaluation = await executeEvaluation({
        applicantId: selectedApplicant.id,
        modelId: activeModel.id,
      });
      navigate(`/evaluaciones/${evaluation.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button className="back-link" onClick={() => navigate('/evaluaciones')}>
        ← Volver a Evaluaciones
      </button>

      <div className="page-header">
        <div className="page-title-group">
          <h2>Nueva Evaluación</h2>
          <p>Ejecutar scoring crediticio para un solicitante</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div style={{ display: 'grid', gap: '1.25rem', maxWidth: '680px' }}>
        {/* Step 1: Applicant */}
        <div className="card">
          <div className="card-header">
            <h3>Paso 1 — Seleccionar Solicitante</h3>
          </div>
          <div className="card-body">
            {selectedApplicant ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1rem', background: 'var(--green-light)', borderRadius: 'var(--radius)', border: '1px solid #a7f3d0' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{selectedApplicant.nombre}</div>
                  <div style={{ fontSize: '.8rem', color: 'var(--navy-600)', fontFamily: 'monospace' }}>
                    {selectedApplicant.identificacion} — {selectedApplicant.tipo_empleo}
                  </div>
                </div>
                <button className="btn-sm btn-secondary" onClick={() => setSelectedApplicant(null)}>
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={onSearch} className="search-bar" style={{ marginBottom: '.75rem' }}>
                  <input
                    placeholder="Buscar por nombre o identificación..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" disabled={searching}>
                    {searching ? 'Buscando...' : 'Buscar'}
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Identificación</th>
                          <th>Tipo Empleo</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 600 }}>{a.nombre}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{a.identificacion}</td>
                            <td>{a.tipo_empleo}</td>
                            <td>
                              <button className="btn-sm btn-success" onClick={() => selectApplicant(a)}>
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {searchResults.length === 0 && searchQuery === '' && (
                  <p style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>
                    Buscá un solicitante por nombre o número de identificación.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Step 2: Model */}
        <div className="card">
          <div className="card-header">
            <h3>Paso 2 — Modelo de Scoring</h3>
          </div>
          <div className="card-body">
            {loadingModel ? (
              <div className="loading-wrapper"><div className="spinner"></div> Cargando modelo activo...</div>
            ) : activeModel ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 1rem', background: 'var(--blue-light)', borderRadius: 'var(--radius)', border: '1px solid #bfdbfe' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{activeModel.nombre}</div>
                  <div style={{ fontSize: '.8rem', color: 'var(--navy-600)' }}>
                    v{activeModel.version} — <span className="badge badge-ACTIVE">ACTIVO</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert warning">
                No hay un modelo activo. Configurá y activá un modelo en{' '}
                <button className="btn-ghost btn-sm" onClick={() => navigate('/modelos')}>
                  Modelos de Scoring
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button
            className="btn-secondary"
            onClick={() => navigate('/evaluaciones')}
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || !selectedApplicant || !activeModel}
          >
            {submitting
              ? <><span className="spinner" style={{ borderTopColor: '#fff' }}></span> Ejecutando...</>
              : '▶ Ejecutar Evaluación'}
          </button>
        </div>
      </div>
    </div>
  );
}
