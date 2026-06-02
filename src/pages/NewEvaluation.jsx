import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchApplicants, getActiveModel, executeEvaluation } from '../api/client';
import Button from '../components/ui/Button';

// Local icon — not added to icons.jsx (parallel-worktree constraint)
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21"/>
  </svg>
);

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

      <div className="neweval-form-stack">
        {/* Step 1: Applicant */}
        <div className="card">
          <div className="card-header">
            <h3>Paso 1 — Seleccionar Solicitante</h3>
          </div>
          <div className="card-body">
            {selectedApplicant ? (
              <div className="neweval-selected-applicant">
                <div>
                  <div className="neweval-selected-name">{selectedApplicant.nombre}</div>
                  <div className="cell-mono">
                    {selectedApplicant.identificacion} — {selectedApplicant.tipo_empleo}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setSelectedApplicant(null)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <>
                <form onSubmit={onSearch} className="search-bar">
                  <input
                    placeholder="Buscar por nombre o identificación..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <Button type="submit" disabled={searching}>
                    {searching ? 'Buscando...' : 'Buscar'}
                  </Button>
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
                            <td className="neweval-td-name">{a.nombre}</td>
                            <td className="cell-mono">{a.identificacion}</td>
                            <td>{a.tipo_empleo}</td>
                            <td>
                              <Button size="sm" variant="success" onClick={() => selectApplicant(a)}>
                                Seleccionar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {searchResults.length === 0 && searchQuery === '' && (
                  <p className="cell-mono">
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
              <div className="neweval-active-model">
                <div>
                  <div className="neweval-model-name">{activeModel.nombre}</div>
                  <div className="cell-mono">
                    v{activeModel.version} — <span className="badge badge-ACTIVE">ACTIVO</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert warning">
                No hay un modelo activo. Configurá y activá un modelo en{' '}
                <Button size="sm" variant="ghost" onClick={() => navigate('/modelos')}>
                  Modelos de Scoring
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="neweval-submit-row">
          <Button variant="secondary" onClick={() => navigate('/evaluaciones')}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || !selectedApplicant || !activeModel}
            icon={!submitting ? <PlayIcon /> : undefined}
          >
            {submitting
              ? <><span className="spinner neweval-spinner-white"></span> Ejecutando...</>
              : 'Ejecutar Evaluación'}
          </Button>
        </div>
      </div>
    </div>
  );
}
