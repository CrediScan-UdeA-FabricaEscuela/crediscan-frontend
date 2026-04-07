import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Applicants from './pages/Applicants';
import RegisterApplicant from './pages/RegisterApplicant';
import EditApplicant from './pages/EditApplicant';
import Users from './pages/Users';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/solicitantes" element={<Applicants />} />
            <Route path="/solicitantes/nuevo" element={<RegisterApplicant />} />
            <Route path="/solicitantes/:id/editar" element={<EditApplicant />} />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <Users />
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
