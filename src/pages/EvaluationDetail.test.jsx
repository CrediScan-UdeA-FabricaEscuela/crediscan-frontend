import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EvaluationDetail from './EvaluationDetail';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'eval-uuid-001' }),
}));

vi.mock('../api/client', () => ({
  getEvaluation: vi.fn(),
  getDecision: vi.fn(),
  registerDecision: vi.fn(),
  getEvaluationPdf: vi.fn(() => '/api/evaluations/eval-uuid-001/pdf'),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./ScoringModels', () => ({
  CAMPOS_DISPONIBLES: [
    { value: 'credit_score', label: 'Puntaje Crediticio' },
    { value: 'debt_ratio', label: 'Razón de Deuda' },
  ],
}));

import { getEvaluation, getDecision, registerDecision } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEvaluation(overrides = {}) {
  return {
    evaluationId: 'eval-uuid-001',
    totalScore: 75,
    riskLevel: 'LOW',
    knockedOut: false,
    knockoutReasons: [],
    knockouts: [],
    evaluatedBy: 'analyst1',
    evaluatedAt: '2024-01-15T10:00:00Z',
    details: [
      { variableName: 'credit_score', rawValue: 720, score: 80, weight: 0.4 },
      { variableName: 'debt_ratio', rawValue: 0.3, score: 70, weight: 0.6 },
    ],
    ...overrides,
  };
}

function makeDecision(overrides = {}) {
  return {
    decision: 'APPROVED',
    decidedBy: 'manager1',
    decidedAt: '2024-01-16T12:00:00Z',
    resolutionDeadlineAt: null,
    observations: 'Approved after review.',
    ...overrides,
  };
}

function setupAuth(role = 'ADMIN') {
  useAuth.mockReturnValue({ auth: { role, username: 'TestUser' } });
}

beforeEach(() => {
  mockNavigate.mockClear();
  getEvaluation.mockReset();
  getDecision.mockReset();
  registerDecision.mockReset();
});

// ── Loading state ──────────────────────────────────────────────────────────

describe('EvaluationDetail — loading state', () => {
  it('renders spinner while fetching', () => {
    setupAuth('ADMIN');
    getEvaluation.mockReturnValue(new Promise(() => {})); // never resolves
    getDecision.mockResolvedValue(makeDecision());

    render(<EvaluationDetail />);

    expect(screen.getByText(/cargando evaluaci/i)).toBeInTheDocument();
  });
});

// ── Error state ────────────────────────────────────────────────────────────

describe('EvaluationDetail — error state', () => {
  it('renders back-link and error alert when getEvaluation throws', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockRejectedValue(new Error('Not found'));
    getDecision.mockResolvedValue(makeDecision());

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
  });

  it('clicking back in error state navigates to /evaluaciones', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockRejectedValue(new Error('Fail'));
    getDecision.mockResolvedValue(makeDecision());

    render(<EvaluationDetail />);

    await waitFor(() => screen.getByText(/fail/i));

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /volver/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones');
  });
});

// ── Score and RiskBadge rendering ──────────────────────────────────────────

describe('EvaluationDetail — score and risk badge', () => {
  it('renders totalScore value', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ totalScore: 75 }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getAllByText('75').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders RiskBadge with badge-LOW class for LOW risk', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ riskLevel: 'LOW' }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.badge-LOW')).not.toBeNull();
    });
  });

  it('renders RiskBadge with badge-VERY_HIGH for VERY_HIGH risk', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ riskLevel: 'VERY_HIGH' }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.badge-VERY_HIGH')).not.toBeNull();
    });
  });
});

// ── KO banner ─────────────────────────────────────────────────────────────

describe('EvaluationDetail — KO banner', () => {
  it('renders ko-banner when knockedOut=true', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ knockedOut: true, knockoutReasons: ['Deuda alta'] }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.ko-banner')).not.toBeNull();
    });
  });

  it('does NOT render ko-banner when knockedOut=false', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ knockedOut: false }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => screen.getAllByText('75'));

    expect(document.querySelector('.ko-banner')).toBeNull();
  });

  it('renders knockoutReasons list items when present', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({
      knockedOut: true,
      knockoutReasons: ['Deuda alta', 'Score bajo'],
    }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getByText('Deuda alta')).toBeInTheDocument();
      expect(screen.getByText('Score bajo')).toBeInTheDocument();
    });
  });
});

// ── KO activated value class ───────────────────────────────────────────────

describe('EvaluationDetail — KO activated value (.evaldetail-ko-value)', () => {
  it('KO cell has evaldetail-ko-value class', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ knockedOut: false }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.evaldetail-ko-value')).not.toBeNull();
    });
  });

  it('KO activated cell shows SÍ when knockedOut=true', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ knockedOut: true }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getByText('SÍ')).toBeInTheDocument();
    });
  });

  it('KO activated cell shows NO when knockedOut=false', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ knockedOut: false }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getByText('NO')).toBeInTheDocument();
    });
  });
});

// ── Score bar fill class ───────────────────────────────────────────────────

describe('EvaluationDetail — score bar fill class (D4)', () => {
  it('score bar fill gets evaldetail-bar-good class when totalScore >= 70', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ totalScore: 80 }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.evaldetail-score-bar-fill.evaldetail-bar-good')).not.toBeNull();
    });
  });

  it('score bar fill gets evaldetail-bar-mid class when 40 <= totalScore < 70', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ totalScore: 55 }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.evaldetail-score-bar-fill.evaldetail-bar-mid')).not.toBeNull();
    });
  });

  it('score bar fill gets evaldetail-bar-bad class when totalScore < 40', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ totalScore: 25 }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.evaldetail-score-bar-fill.evaldetail-bar-bad')).not.toBeNull();
    });
  });
});

// ── Score breakdown table ──────────────────────────────────────────────────

describe('EvaluationDetail — breakdown table', () => {
  it('renders detail rows with variable label, rawValue, score, weight', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({
      details: [
        { variableName: 'credit_score', rawValue: 720, score: 80, weight: 0.4 },
        { variableName: 'debt_ratio', rawValue: 0.3, score: 70, weight: 0.6 },
      ],
    }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getByText('720')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });
});

// ── Decision display ───────────────────────────────────────────────────────

describe('EvaluationDetail — decision display', () => {
  it('renders DecisionBadge with badge-APPROVED class', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockResolvedValue(makeDecision({ decision: 'APPROVED' }));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.badge-APPROVED')).not.toBeNull();
    });
  });

  it('renders decidedBy and decidedAt in decision display', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockResolvedValue(makeDecision({ decidedBy: 'manager1', decidedAt: '2024-01-16T12:00:00Z' }));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getByText('manager1')).toBeInTheDocument();
    });
  });

  it('renders REJECTED decision badge as badge-REJECTED', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockResolvedValue(makeDecision({ decision: 'REJECTED' }));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.badge-REJECTED')).not.toBeNull();
    });
  });
});

// ── canDecide role-gating ─────────────────────────────────────────────────

describe('EvaluationDetail — canDecide role-gating', () => {
  it('ADMIN with no decision sees the decision form', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(/justificaci/i)).toBeInTheDocument();
  });

  it('RISK_MANAGER with no decision sees the decision form', async () => {
    setupAuth('RISK_MANAGER');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('VIEWER with no decision sees info alert, not form', async () => {
    setupAuth('VIEWER');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(screen.getByText(/aún no hay una decisión/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

// ── Form validation ────────────────────────────────────────────────────────

describe('EvaluationDetail — form validation', () => {
  it('submitting with < 20 chars shows validation error and does NOT call registerDecision', async () => {
    const user = userEvent.setup();
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => screen.getByRole('combobox'));

    const textarea = screen.getByPlaceholderText(/justificaci/i);
    await user.type(textarea, 'short');
    await user.click(screen.getByRole('button', { name: /registrar decisi/i }));

    expect(screen.getByText(/al menos 20 caracteres/i)).toBeInTheDocument();
    expect(registerDecision).not.toHaveBeenCalled();
  });

  it('submitting with >= 20 chars calls registerDecision and shows decision', async () => {
    const user = userEvent.setup();
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockRejectedValue(new Error('no decision'));
    registerDecision.mockResolvedValue(makeDecision());

    render(<EvaluationDetail />);

    await waitFor(() => screen.getByRole('combobox'));

    const textarea = screen.getByPlaceholderText(/justificaci/i);
    await user.type(textarea, 'This is a valid observation text');
    await user.click(screen.getByRole('button', { name: /registrar decisi/i }));

    await waitFor(() => {
      expect(registerDecision).toHaveBeenCalledWith('eval-uuid-001', expect.objectContaining({
        observations: 'This is a valid observation text',
      }));
    });

    await waitFor(() => {
      expect(document.querySelector('.badge-APPROVED')).not.toBeNull();
    });
  });
});

// ── Back-link navigation ───────────────────────────────────────────────────

describe('EvaluationDetail — back-link navigation', () => {
  it('clicking back-link navigates to /evaluaciones', async () => {
    const user = userEvent.setup();
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => screen.getByText(/puntaje total/i));

    const backBtn = screen.getByRole('button', { name: /volver a evaluaciones/i });
    await user.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/evaluaciones');
  });
});

// ── Char counter class ─────────────────────────────────────────────────────

describe('EvaluationDetail — char counter class (D8)', () => {
  it('char counter gets invalid class when observations length < 20', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => screen.getByRole('combobox'));

    expect(document.querySelector('.evaldetail-char-count.invalid')).not.toBeNull();
  });

  it('char counter gets valid class when observations length >= 20', async () => {
    const user = userEvent.setup();
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => screen.getByRole('combobox'));

    const textarea = screen.getByPlaceholderText(/justificaci/i);
    await user.type(textarea, 'This observation is long enough for validation');

    expect(document.querySelector('.evaldetail-char-count.valid')).not.toBeNull();
  });
});

// ── eval ID cell-mono ──────────────────────────────────────────────────────

describe('EvaluationDetail — eval ID uses cell-mono class', () => {
  it('renders a .cell-mono element containing the evaluation ID', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation({ evaluationId: 'eval-uuid-001' }));
    getDecision.mockRejectedValue(new Error('no decision'));

    render(<EvaluationDetail />);

    await waitFor(() => {
      const el = document.querySelector('.cell-mono');
      expect(el).not.toBeNull();
      expect(el.textContent).toContain('eval-uuid-001');
    });
  });
});

// ── Observations block class ───────────────────────────────────────────────

describe('EvaluationDetail — observations block class (D5)', () => {
  it('observations block renders with evaldetail-observations class when decision has observations', async () => {
    setupAuth('ADMIN');
    getEvaluation.mockResolvedValue(makeEvaluation());
    getDecision.mockResolvedValue(makeDecision({ observations: 'Approved after review.' }));

    render(<EvaluationDetail />);

    await waitFor(() => {
      expect(document.querySelector('.evaldetail-observations')).not.toBeNull();
    });

    expect(screen.getByText('Approved after review.')).toBeInTheDocument();
  });
});
