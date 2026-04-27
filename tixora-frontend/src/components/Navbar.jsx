import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const TixoraLogo = () => (
  <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
    <div style={{
      width: 36, height: 36,
      background: 'var(--brand)',
      borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(255,69,0,0.3)',
      flexShrink: 0,
    }}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M3 10a7 7 0 1014 0A7 7 0 003 10z" stroke="#fff" strokeWidth="1.5"/>
        <path d="M8 7.5l5 2.5-5 2.5V7.5z" fill="#fff"/>
      </svg>
    </div>
    <span style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 20,
      letterSpacing: '-0.04em',
      color: 'var(--text-primary)',
    }}>
      Tixora
    </span>
  </Link>
);

const NavLink = ({ to, children }) => {
  const location = useLocation();
  const active   = location.pathname === to;
  return (
    <Link to={to} style={{
      fontFamily:    'var(--font-display)',
      fontSize:      14,
      fontWeight:    600,
      color:         active ? 'var(--brand)' : 'var(--text-secondary)',
      padding:       '6px 4px',
      borderBottom:  active ? '2px solid var(--brand)' : '2px solid transparent',
      transition:    'color var(--t-fast), border-color var(--t-fast)',
      whiteSpace:    'nowrap',
      textDecoration: 'none',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
    >
      {children}
    </Link>
  );
};

const RolePill = ({ role }) => {
  const colors = {
    admin:     { bg: '#111118', color: '#fff' },
    organizer: { bg: 'var(--gold-light)', color: 'var(--gold)' },
    customer:  { bg: 'var(--brand-muted)', color: 'var(--brand)' },
  };
  const s = colors[role] || colors.customer;
  return (
    <span style={{
      background:    s.bg,
      color:         s.color,
      borderRadius:  'var(--r-full)',
      padding:       '3px 10px',
      fontSize:      11,
      fontFamily:    'var(--font-display)',
      fontWeight:    700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    }}>
      {role}
    </span>
  );
};

export default function Navbar() {
  const { user, logout }  = useAuth();
  const navigate          = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await api.post('/auth/logout/', { refresh });
    } catch {}
    logout();
    navigate('/login');
  };

  const dashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'organizer') return '/organizer';
    if (user.role === 'admin')     return '/admin';
    return '/dashboard';
  };

  return (
    <>
      <nav style={{
        position:    'sticky',
        top:         0,
        zIndex:      200,
        background:  'rgba(247, 245, 239, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition:  'border-color var(--t), box-shadow var(--t)',
        boxShadow:   scrolled ? 'var(--shadow-sm)' : 'none',
      }}>
        <div className="container" style={{
          height:         64,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            24,
        }}>
          <TixoraLogo />

          {/* Desktop Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flex: 1, paddingLeft: 32 }}
               className="desktop-nav">
            <NavLink to="/">Events</NavLink>
            {user && <NavLink to={dashboardPath()}>Dashboard</NavLink>}
            {user?.role === 'organizer' && <NavLink to="/organizer/events/create">+ Create Event</NavLink>}
          </div>

          {/* Desktop Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="desktop-nav">
            {user ? (
              <>
                <RolePill role={user.role} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.full_name || user.email}
                </span>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
                <Link to="/register" className="btn btn-brand btn-sm">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="mobile-menu-btn"
            style={{
              display: 'none',
              background: 'none',
              border: '1.5px solid var(--border-strong)',
              borderRadius: 'var(--r-sm)',
              padding: '7px 9px',
              cursor: 'pointer',
            }}
            aria-label="Toggle menu"
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              {mobileOpen
                ? <path d="M1 1l14 12M15 1L1 13" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round"/>
                : <>
                    <path d="M0 1h16M0 7h16M0 13h16" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round"/>
                  </>
              }
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div style={{
            background:  'var(--surface)',
            borderTop:   '1px solid var(--border)',
            padding:     '16px 20px 24px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Link to="/" onClick={() => setMobileOpen(false)} style={{ padding: '10px 0', fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                Events
              </Link>
              {user && (
                <Link to={dashboardPath()} onClick={() => setMobileOpen(false)} style={{ padding: '10px 0', fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                  Dashboard
                </Link>
              )}
            </div>
            <div style={{ marginTop: 16 }}>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RolePill role={user.role} />
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{user.full_name}</span>
                  </div>
                  <button onClick={handleLogout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                    Sign out
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link to="/login" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>Sign in</Link>
                  <Link to="/register" className="btn btn-brand" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>Get Started</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; align-items: center; }
        }
      `}</style>
    </>
  );
}
