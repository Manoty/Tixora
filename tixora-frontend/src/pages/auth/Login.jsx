import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [searchParams]        = useSearchParams();
  const sessionExpired        = searchParams.get('expired') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login/', form);
      login(
        data.tokens || { access: data.access, refresh: data.refresh },
        data.user
      );
      const role = data.user.role;
      if (role === 'organizer')     navigate('/organizer');
      else if (role === 'admin')    navigate('/admin');
      else                          navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error  ||
        'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'grid',
      gridTemplateColumns: '1fr 1fr',
      background:     'var(--bg)',
    }}
      className="auth-grid"
    >
      {/* ── Left panel — brand ───────────────────── */}
      <div style={{
        background:    'var(--surface-dark)',
        display:       'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding:       '48px',
        position:      'relative',
        overflow:      'hidden',
      }}
        className="auth-brand-panel"
      >
        {/* Grid pattern */}
        <div style={{
          position:        'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize:  '28px 28px', pointerEvents: 'none',
        }} />
        {/* Brand glow */}
        <div style={{
          position:   'absolute', bottom: -100, left: -100,
          width:      400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,69,0,0.2), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--brand)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(255,69,0,0.4)',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10a7 7 0 1014 0A7 7 0 003 10z" stroke="#fff" strokeWidth="1.5"/>
              <path d="M8 7.5l5 2.5-5 2.5V7.5z" fill="#fff"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.04em' }}>
            Tixora
          </span>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative' }}>
          <h2 style={{
            fontFamily:    'var(--font-display)',
            fontSize:      'clamp(28px, 3vw, 42px)',
            fontWeight:    800,
            color:         '#FFFFFF',
            letterSpacing: '-0.04em',
            lineHeight:    1.15,
            marginBottom:  16,
          }}>
            Seamless Event<br />Ticketing &<br />
            <span style={{ color: 'var(--brand)' }}>Entry Management</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7 }}>
            Buy tickets, get QR codes instantly, and breeze through event entry — all powered by M-Pesa.
          </p>

          {/* Social proof dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32 }}>
            <div style={{ display: 'flex' }}>
              {['#FF6B6B','#FFE66D','#4ECDC4','#95E1D3'].map((c, i) => (
                <div key={c} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: c, border: '2px solid var(--surface-dark)',
                  marginLeft: i > 0 ? -10 : 0,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
              10,000+ tickets sold
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} Tixora · Seamless Event Ticketing
        </div>
      </div>

      {/* ── Right panel — form ───────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Sign in to your Tixora account
            </p>
          </div>

          {sessionExpired && (
            <div className="alert alert-warning" style={{ marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M8 1l7 14H1L8 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Your session expired — please sign in again.
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position:   'absolute', right: 14, top: '50%',
                    transform:  'translateY(-50%)',
                    background: 'none', border: 'none',
                    color:      'var(--text-muted)', cursor: 'pointer',
                    padding:    4,
                  }}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd
                    ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14L14 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/></svg>
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-brand btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: 4 }}
            >
              {loading
                ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} /> Signing in...</>
                : 'Sign In →'
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 700 }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-brand-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
