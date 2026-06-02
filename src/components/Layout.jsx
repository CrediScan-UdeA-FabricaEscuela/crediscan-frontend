import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  const { handleLogout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    handleLogout();
    navigate('/');
  }

  return (
    <div className="layout">
      <Sidebar onLogout={onLogout} />
      <div className="main-content">
        <TopBar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
