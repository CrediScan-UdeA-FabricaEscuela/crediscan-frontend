import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Applicants from './pages/Applicants';
import RegisterApplicant from './pages/RegisterApplicant';
import EditApplicant from './pages/EditApplicant';
import FinancialData from './pages/FinancialData';
import Evaluations from './pages/Evaluations';
import NewEvaluation from './pages/NewEvaluation';
import EvaluationDetail from './pages/EvaluationDetail';
import ScoringVariables from './pages/ScoringVariables';
import ScoringModels from './pages/ScoringModels';
import AuditLog from './pages/AuditLog';
import Users from './pages/Users';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/solicitantes" element={<Applicants />} />
            <Route path="/solicitantes/nuevo" element={<RegisterApplicant />} />
            <Route path="/solicitantes/:id/editar" element={<EditApplicant />} />
            <Route path="/solicitantes/:id/financiero" element={<FinancialData />} />
            <Route path="/evaluaciones" element={<Evaluations />} />
            <Route
              path="/evaluaciones/nueva"
              element={
                <ProtectedRoute roles={['ADMIN', 'ANALYST']}>
                  <NewEvaluation />
                </ProtectedRoute>
              }
            />
            <Route path="/evaluaciones/:id" element={<EvaluationDetail />} />
            <Route
              path="/variables"
              element={
                <ProtectedRoute roles={['ADMIN', 'RISK_MANAGER']}>
                  <ScoringVariables />
                </ProtectedRoute>
              }
            />
            <Route
              path="/modelos"
              element={
                <ProtectedRoute roles={['ADMIN', 'RISK_MANAGER']}>
                  <ScoringModels />
                </ProtectedRoute>
              }
            />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auditoria"
              element={
                <ProtectedRoute roles={['ADMIN', 'RISK_MANAGER']}>
                  <AuditLog />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
