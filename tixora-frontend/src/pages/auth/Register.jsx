// src/pages/auth/Register.jsx
import { useState }          from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api                   from '../../api/axios';
import { useAuth }           from '../../context/AuthContext';

export default function Register() {
  const [form,    setForm]    = useState({
    email: '', first_name: '', last_name: '',
    phone_number: '', role: 'customer',
    password: '', confirm_password: '',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

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

  const field = (name) => ({
    value:    form[name],
    onChange: e => setForm({ ...form, [name]: e.target.value }),
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--gray-100)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '6px 16px', fontWeight: 800, fontSize: 24, marginBottom: 12 }}>
            Tixora
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Create your account</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: 4 }}>Seamless Event Ticketing & Entry Management</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            {errors.non_field_errors && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                {errors.non_field_errors}
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label>First Name</label>
                <input {...field('first_name')} placeholder="Jane" required />
                {errors.first_name && <span className="form-error">{errors.first_name}</span>}
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input {...field('last_name')} placeholder="Wanjiku" required />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input type="email" {...field('email')} placeholder="you@example.com" required />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Phone Number (for M-Pesa)</label>
              <input {...field('phone_number')} placeholder="0712 345 678" required />
              {errors.phone_number && <span className="form-error">{errors.phone_number}</span>}
            </div>

            <div className="form-group">
              <label>I am a</label>
              <select {...field('role')}>
                <option value="customer">Customer — I want to buy tickets</option>
                <option value="organizer">Organizer — I want to create events</option>
              </select>
            </div>

            <div className="form-group">
              <label>Password</label>
              <input type="password" {...field('password')} placeholder="Min. 8 characters" required />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" {...field('confirm_password')} placeholder="••••••••" required />
              {errors.confirm_password && <span className="form-error">{errors.confirm_password}</span>}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--gray-500)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}