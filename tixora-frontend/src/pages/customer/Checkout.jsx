// src/pages/customer/Checkout.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate }       from 'react-router-dom';
import api                             from '../../api/axios';
import { useAuth }                     from '../../context/AuthContext';

export default function Checkout() {
  const { reference }         = useParams();
  const { user }              = useAuth();
  const navigate              = useNavigate();
  const [order,    setOrder]  = useState(null);
  const [phone,    setPhone]  = useState(user?.phone || '');
  const [loading,  setLoading] = useState(true);
  const [paying,   setPaying]  = useState(false);
  const [polling,  setPolling] = useState(false);
  const [message,  setMessage] = useState('');
  const [error,    setError]   = useState('');
  const pollRef                = useRef(null);

  useEffect(() => {
    api.get(`/orders/${reference}/`)
      .then(r => setOrder(r.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
    return () => clearInterval(pollRef.current);
  }, [reference]);

  const startPolling = () => {
    setPolling(true);
    setMessage('Waiting for M-Pesa confirmation...');
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/payments/status/${reference}/`);
        if (data.status === 'success') {
          clearInterval(pollRef.current);
          setPolling(false);
          setMessage('✅ Payment confirmed!');
          setTimeout(() => navigate(`/tickets/order/${reference}`), 1500);
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current);
          setPolling(false);
          setError(`Payment failed: ${data.result_description || 'Please try again.'}`);
          setMessage('');
        }
      } catch {}
    }, 3000);
    // Stop polling after 3 minutes
    setTimeout(() => {
      clearInterval(pollRef.current);
      if (polling) {
        setPolling(false);
        setMessage('');
        setError('Payment timed out. Check your M-Pesa and try again.');
      }
    }, 180000);
  };

  const handlePay = async () => {
    if (!phone) { setError('Enter your M-Pesa phone number.'); return; }
    setPaying(true);
    setError('');
    try {
      await api.post('/payments/initiate/', {
        order_reference: reference,
        phone_number:    phone,
      });
      setMessage('📱 M-Pesa prompt sent to your phone. Enter your PIN to complete payment.');
      startPolling();
    } catch (err) {
      const errData = err.response?.data;
      setError(errData?.mpesa || errData?.order || errData?.payment || 'Payment initiation failed.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="loading">Loading order...</div>;
  if (!order)  return null;

  const timeLeft = order.minutes_to_expiry;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Complete Your Purchase</h1>
          <p style={{ color: 'var(--gray-500)' }}>Order {order.reference}</p>
        </div>

        {/* Reservation Timer */}
        {timeLeft > 0 && order.status === 'reserved' && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#92400E', fontWeight: 600 }}>⏰ Tickets reserved for</span>
            <span style={{ color: '#92400E', fontWeight: 800, fontSize: 18 }}>{timeLeft} min</span>
          </div>
        )}

        {/* Order Summary */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Order Summary</h2>
          {order.items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-300)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.ticket_type_name}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{item.event_title}</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>Qty: {item.quantity}</div>
              </div>
              <div style={{ fontWeight: 700 }}>KES {Number(item.subtotal).toLocaleString()}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontWeight: 800, fontSize: 18 }}>
            <span>Total</span>
            <span style={{ color: 'var(--primary)' }}>KES {Number(order.total_amount).toLocaleString()}</span>
          </div>
        </div>

        {/* Payment */}
        {order.status === 'reserved' && !polling && (
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>💚 Pay with M-Pesa</h2>
            {error && (
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label>M-Pesa Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" />
            </div>
            <button className="btn btn-success" onClick={handlePay} disabled={paying}
              style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px' }}>
              {paying ? 'Sending STK Push...' : `Pay KES ${Number(order.total_amount).toLocaleString()}`}
            </button>
          </div>
        )}

        {/* Polling state */}
        {polling && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Check your phone</h2>
            <p style={{ color: 'var(--gray-500)' }}>{message}</p>
            <div style={{ marginTop: 24, color: 'var(--gray-400)', fontSize: 13 }}>
              Checking payment status every 3 seconds...
            </div>
          </div>
        )}

        {/* Success message */}
        {message && !polling && (
          <div style={{ background: '#D1FAE5', color: '#065F46', padding: '16px', borderRadius: 'var(--radius)', textAlign: 'center', fontWeight: 600 }}>
            {message}
          </div>
        )}

        {/* Already confirmed */}
        {order.status === 'confirmed' && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Payment Confirmed!</h2>
            <button className="btn btn-primary" onClick={() => navigate(`/tickets/order/${reference}`)}>
              View My Tickets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}