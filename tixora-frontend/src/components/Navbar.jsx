// src/components/Navbar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await api.post('/auth/logout/', { refresh });
    } catch {}
    logout();
    navigate('/login');
  };

  const dashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'organizer') return '/organizer';
    if (user.role === 'admin')     return '/admin';
    return '/dashboard';
  };

  return (
    <nav style={{
      background:   '#fff',
      borderBottom: '1px solid var(--gray-300)',
      padding:      '0 24px',
      position:     'sticky',
      top:          0,
      zIndex:       100,
      boxShadow:    'var(--shadow)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', height: 64, justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            background:   'var(--primary)',
            color:        '#fff',
            borderRadius: 8,
            padding:      '4px 10px',
            fontWeight:   800,
            fontSize:     18,
            letterSpacing: '-0.5px',
          }}>Tixora</div>
          <span style={{ fontSize: 13, color: 'var(--gray-500)', display: 'none' }}>Seamless Event Ticketing</span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/" style={{ color: 'var(--gray-700)', fontWeight: 500 }}>Events</Link>
          {user && (
            <Link to={dashboardLink()} style={{ color: 'var(--gray-700)', fontWeight: 500 }}>
              Dashboard
            </Link>
          )}
        </div>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <span style={{
                background:   'var(--primary-light)',
                color:        'var(--primary)',
                borderRadius: 999,
                padding:      '4px 12px',
                fontSize:     13,
                fontWeight:   600,
              }}>
                {user.role}
              </span>
              <span style={{ fontSize: 14, color: 'var(--gray-700)' }}>
                {user.full_name || user.email}
              </span>
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 14 }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline" style={{ padding: '8px 20px', fontSize: 14 }}>Login</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: 14 }}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}