import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

function StepIndicator({ step }) {
  const steps = ['Review', 'Pay', 'Tickets'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
      {steps.map((label, i) => {
        const idx      = i + 1;
        const active   = idx === step;
        const complete = idx < step;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width:         32,
                height:        32,
                borderRadius:  '50%',
                display:       'flex',
                alignItems:    'center',
                justifyContent: 'center',
                fontFamily:    'var(--font-display)',
                fontWeight:    700,
                fontSize:      13,
                background:    complete ? 'var(--success)' : active ? 'var(--brand)' : 'rgba(17,17,24,0.08)',
                color:         complete || active ? '#fff' : 'var(--text-muted)',
                transition:    'all var(--t)',
              }}>
                {complete ? '✓' : idx}
              </div>
              <span style={{
                fontSize:   11,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                color:      active ? 'var(--text-primary)' : 'var(--text-muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width:      60,
                height:     1.5,
                background: complete ? 'var(--success)' : 'rgba(17,17,24,0.1)',
                margin:     '-16px 8px 0',
                transition: 'background var(--t)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CountdownTimer({ minutes }) {
  const [secs, setSecs] = useState(minutes * 60);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs(s => s - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const urgent = secs < 120;

  if (secs <= 0) return (
    <div className="alert alert-danger">
      ⏰ Your reservation has expired. Please start a new order.
    </div>
  );

  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      justifyContent: 'space-between',
      background:    urgent ? 'var(--danger-light)' : 'var(--warning-light)',
      border:        `1px solid ${urgent ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)'}`,
      borderRadius:  'var(--r)',
      padding:       '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: urgent ? 'var(--danger)' : 'var(--warning)' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Tickets reserved — complete payment before time runs out
      </div>
      <div style={{
        fontFamily:    'var(--font-display)',
        fontWeight:    800,
        fontSize:      18,
        letterSpacing: '-0.02em',
        color:         urgent ? 'var(--danger)' : 'var(--warning)',
        minWidth:      52,
        textAlign:     'right',
      }}>
        {m}:{String(s).padStart(2, '0')}
      </div>
    </div>
  );
}

function OrderSummary({ order }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 16, letterSpacing: '-0.01em' }}>
        Order Summary
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {order.items.map((item, i) => (
          <div key={item.id} style={{
            display:       'flex',
            justifyContent: 'space-between',
            alignItems:    'flex-start',
            padding:       '12px 0',
            borderBottom:  i < order.items.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{item.ticket_type_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.event_title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {item.quantity} × KES {Number(item.price_at_purchase).toLocaleString()}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', flexShrink: 0, marginLeft: 16 }}>
              KES {Number(item.subtotal).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '2px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Total</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--brand)' }}>
          KES {Number(order.total_amount).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function MpesaForm({ order, onSuccess, onError }) {
  const { user }              = useAuth();
  const [phone,    setPhone]  = useState(user?.phone || '');
  const [paying,   setPaying]  = useState(false);
  const [polling,  setPolling] = useState(false);
  const [message,  setMessage] = useState('');
  const pollRef                = useRef(null);

  const startPolling = (reference) => {
    setPolling(true);
    setMessage('Waiting for M-Pesa confirmation...');
    let attempts = 0;

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const { data } = await api.get(`/payments/status/${reference}/`);
        if (data.status === 'success') {
          clearInterval(pollRef.current);
          setPolling(false);
          onSuccess();
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          setPolling(false);
          setMessage('');
          onError(data.result_description || 'Payment was cancelled or failed. Please try again.');
        }
      } catch {}

      if (attempts >= 60) {
        clearInterval(pollRef.current);
        setPolling(false);
        setMessage('');
        onError('Payment confirmation timed out. If you completed payment, your tickets will appear shortly.');
      }
    }, 3000);
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handlePay = async () => {
    if (!phone.trim()) { onError('Please enter your M-Pesa phone number.'); return; }
    setPaying(true);
    onError('');
    try {
      await api.post('/payments/initiate/', {
        order_reference: order.reference,
        phone_number:    phone,
      });
      setMessage('STK Push sent to your phone.');
      startPolling(order.reference);
    } catch (err) {
      const d = err.response?.data;
      onError(d?.mpesa || d?.order || d?.payment || 'Payment initiation failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (polling) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{
          width:  64,
          height: 64,
          borderRadius: '50%',
          background:   'var(--success-light)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          margin:       '0 auto 20px',
        }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(5,150,105,0.3)', borderTopColor: 'var(--success)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          Check Your Phone
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          We sent an M-Pesa payment request to <strong>{phone}</strong>.<br />
          Enter your M-Pesa PIN to complete the payment.
        </p>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            6,
          fontSize:       12,
          color:          'var(--text-muted)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          Checking payment status...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width:         44,
          height:        44,
          borderRadius:  'var(--r)',
          background:    '#059669',
          display:       'flex',
          alignItems:    'center',
          justifyContent: 'center',
          flexShrink:    0,
        }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'var(--font-display)' }}>M</span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Pay with M-Pesa</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>You'll receive an STK Push prompt on your phone</div>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">M-Pesa Phone Number</label>
        <input
          className="form-input"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="e.g. 0712 345 678"
        />
        <span className="form-hint">Must be a Safaricom number</span>
      </div>

      <button
        className="btn btn-brand btn-lg"
        style={{ width: '100%', fontSize: 16, gap: 10 }}
        onClick={handlePay}
        disabled={paying || !phone.trim()}
      >
        {paying ? (
          <>
            <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            Sending Payment Request...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4" width="16" height="12" rx="2" stroke="white" strokeWidth="1.5"/>
              <path d="M2 8h16" stroke="white" strokeWidth="1.5"/>
              <rect x="4" y="11" width="4" height="2" rx="1" fill="white"/>
            </svg>
            Pay KES {Number(order.total_amount).toLocaleString()}
          </>
        )}
      </button>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────── */
export default function Checkout() {
  const { reference }         = useParams();
  const navigate              = useNavigate();
  const [order,    setOrder]  = useState(null);
  const [loading,  setLoading] = useState(true);
  const [step,     setStep]   = useState(1);
  const [error,    setError]   = useState('');
  const [success,  setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/orders/${reference}/`)
      .then(r => {
        setOrder(r.data);
        if (r.data.status === 'confirmed') setStep(3);
      })
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [reference]);

  const handlePaymentSuccess = async () => {
    setSuccess(true);
    setStep(3);
    const { data } = await api.get(`/orders/${reference}/`);
    setOrder(data);
    setTimeout(() => navigate(`/tickets/order/${reference}`), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your order...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 24 }}>
          <Link to="/" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ← Back to Events
          </Link>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
            Complete Your Order
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Reference: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{order.reference}</span>
          </p>
        </div>

        <StepIndicator step={success ? 3 : step} />

        {/* Reservation timer */}
        {order.status === 'reserved' && order.minutes_to_expiry > 0 && (
          <div style={{ marginBottom: 20 }}>
            <CountdownTimer minutes={order.minutes_to_expiry} />
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 20 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {/* Success state */}
        {success && (
          <div style={{
            textAlign:     'center',
            padding:       '40px 24px',
            background:    'var(--surface)',
            borderRadius:  'var(--r-xl)',
            border:        '1px solid var(--border)',
            marginBottom:  20,
          }}>
            <div style={{
              width:          72,
              height:         72,
              borderRadius:   '50%',
              background:     'var(--success-light)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              margin:         '0 auto 20px',
              fontSize:       32,
            }}>
              🎉
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Payment Confirmed!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Your tickets are ready. Redirecting you now...
            </p>
            <Link to={`/tickets/order/${reference}`} className="btn btn-brand">
              View My Tickets →
            </Link>
          </div>
        )}

        {/* Order summary */}
        <div style={{ marginBottom: 20 }}>
          <OrderSummary order={order} />
        </div>

        {/* Payment form */}
        {order.status === 'reserved' && !success && (
          <div className="card" style={{ padding: '24px' }}>
            <MpesaForm
              order={order}
              onSuccess={handlePaymentSuccess}
              onError={setError}
            />

            {/* Trust bar */}
            <div style={{
              display:       'flex',
              justifyContent: 'center',
              gap:           20,
              marginTop:     20,
              paddingTop:    20,
              borderTop:     '1px solid var(--border)',
              flexWrap:      'wrap',
            }}>
              {[
                { icon: '🔒', text: 'SSL Secured' },
                { icon: '📱', text: 'M-Pesa Verified' },
                { icon: '✅', text: 'Safe Checkout' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span style={{ fontSize: 13 }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already confirmed */}
        {order.status === 'confirmed' && !success && (
          <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8 }}>Payment Already Confirmed</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>This order has been paid for.</p>
            <Link to={`/tickets/order/${reference}`} className="btn btn-brand">
              View My Tickets →
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
