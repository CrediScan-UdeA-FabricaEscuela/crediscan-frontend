import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/" replace />;
  if (roles && !roles.includes(auth.role)) return <Navigate to="/solicitantes" replace />;
  return children;
}
