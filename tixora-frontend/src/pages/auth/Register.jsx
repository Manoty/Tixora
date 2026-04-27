import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

function RoleCard({ role, selected, onClick, icon, title, description }) {
  const active = selected === role;
  return (
    <button
      type="button"
      onClick={() => onClick(role)}
      style={{
        padding:       '16px',
        border:        active ? '2px solid var(--brand)' : '1.5px solid var(--border-strong)',
        borderRadius:  'var(--r-lg)',
        background:    active ? 'var(--brand-muted)' : 'var(--surface)',
        cursor:        'pointer',
        textAlign:     'left',
        transition:    'all var(--t-fast)',
        width:         '100%',
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: active ? 'var(--brand)' : 'var(--text-primary)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: active ? 'var(--brand)' : 'var(--text-secondary)', lineHeight: 1.5, opacity: active ? 0.8 : 1 }}>
        {description}
      </div>
    </button>
  );
}

export default function Register() {
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '',
    phone_number: '', role: 'customer',
    password: '', confirm_password: '',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const { login }             = useAuth();
  const navigate              = useNavigate();

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const { data } = await api.post('/auth/register/', form);
      login(data.tokens, data.user);
      navigate(data.user.role === 'organizer' ? '/organizer' : '/dashboard');
    } catch (err) {
      setErrors(err.response?.data || {});
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key) => errors[key] ? (
    <span className="form-error">{Array.isArray(errors[key]) ? errors[key][0] : errors[key]}</span>
  ) : null;

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'var(--bg)',
      padding:        '48px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M3 10a7 7 0 1014 0A7 7 0 003 10z" stroke="#fff" strokeWidth="1.5"/>
                <path d="M8 7.5l5 2.5-5 2.5V7.5z" fill="#fff"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>Tixora</span>
          </Link>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
            Create your account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Join 10,000+ people discovering events on Tixora
          </p>
        </div>

        {/* Global error */}
        {(errors.non_field_errors || errors.errors) && (
          <div className="alert alert-danger" style={{ marginBottom: 20 }}>
            {errors.non_field_errors || errors.errors}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Role Selector */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: 10 }}>I want to</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <RoleCard
                role="customer"
                selected={form.role}
                onClick={(r) => setForm(f => ({ ...f, role: r }))}
                icon="🎟️"
                title="Buy Tickets"
                description="Browse events and purchase tickets"
              />
              <RoleCard
                role="organizer"
                selected={form.role}
                onClick={(r) => setForm(f => ({ ...f, role: r }))}
                icon="🎪"
                title="Host Events"
                description="Create events and sell tickets"
              />
            </div>
          </div>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className={`form-input ${errors.first_name ? 'error' : ''}`} placeholder="Jane" value={form.first_name} onChange={set('first_name')} required />
              {fieldError('first_name')}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className={`form-input ${errors.last_name ? 'error' : ''}`} placeholder="Wanjiku" value={form.last_name} onChange={set('last_name')} required />
              {fieldError('last_name')}
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="you@example.com" value={form.email} onChange={set('email')} required autoComplete="email" />
            {fieldError('email')}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label">M-Pesa Phone Number</label>
            <input className={`form-input ${errors.phone_number ? 'error' : ''}`} placeholder="0712 345 678" value={form.phone_number} onChange={set('phone_number')} required />
            <span className="form-hint">Kenyan Safaricom number — used for ticket payments</span>
            {fieldError('phone_number')}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={set('password')}
                required
                style={{ paddingRight: 48 }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/>
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                </svg>
              </button>
            </div>
            {fieldError('password')}
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className={`form-input ${errors.confirm_password ? 'error' : ''}`}
              placeholder="••••••••"
              value={form.confirm_password}
              onChange={set('confirm_password')}
              required
            />
            {fieldError('confirm_password')}
          </div>

          <button
            type="submit"
            className="btn btn-brand btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading
              ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Creating account...</>
              : `Create ${form.role === 'organizer' ? 'Organizer' : ''} Account →`
            }
          </button>
        </form>

        {/* Terms note */}
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.6 }}>
          By creating an account you agree to Tixora's Terms of Service
        </p>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 700 }}>Sign in</Link>
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
