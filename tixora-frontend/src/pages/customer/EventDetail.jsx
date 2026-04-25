// src/pages/customer/EventDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api                        from '../../api/axios';
import { useAuth }                from '../../context/AuthContext';

export default function EventDetail() {
  const { slug }              = useParams();
  const { user }              = useAuth();
  const navigate              = useNavigate();
  const [event,    setEvent]  = useState(null);
  const [loading,  setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [ordering, setOrdering] = useState(false);
  const [error,    setError]   = useState('');

  useEffect(() => {
    api.get(`/events/${slug}/`)
      .then(r => setEvent(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [slug]);

  const updateQty = (ttId, delta) => {
    const tt  = event.ticket_types.find(t => t.id === ttId);
    const cur = selected[ttId] || 0;
    const next = Math.max(0, Math.min(cur + delta, tt.max_per_order, tt.quantity_available));
    setSelected(prev => ({ ...prev, [ttId]: next }));
  };

  const total = event?.ticket_types.reduce((sum, tt) => {
    return sum + ((selected[tt.id] || 0) * parseFloat(tt.price));
  }, 0) || 0;

  const itemCount = Object.values(selected).reduce((a, b) => a + b, 0);

  const handleOrder = async () => {
    if (!user) { navigate('/login'); return; }
    setOrdering(true);
    setError('');
    try {
      const items = Object.entries(selected)
        .filter(([, qty]) => qty > 0)
        .map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity }));

      const { data } = await api.post('/orders/', { items });
      navigate(`/checkout/${data.reference}`);
    } catch (err) {
      setError(err.response?.data?.items?.[0] || 'Could not create order. Please try again.');
    } finally {
      setOrdering(false);
    }
  };

  // Check if all ticket types are sold out
  const allSoldOut = event?.ticket_types.every(tt => tt.is_sold_out);

  if (loading) return <div className="loading">Loading event...</div>;
  if (!event)  return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)' }}>
      {/* Hero Banner */}
      <div style={{ height: 280, background: 'linear-gradient(135deg, var(--primary) 0%, #9C6FFF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 80 }}>🎟️</span>
      </div>

      <div className="container" style={{ padding: '0 24px', marginTop: -40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>

          {/* Left — Event Info */}
          <div>
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--dark)', marginBottom: 8 }}>{event.title}</h1>
                  <p style={{ color: 'var(--gray-500)' }}>by {event.organizer_name}</p>
                </div>
                <span className="badge badge-success">{event.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px 0', borderTop: '1px solid var(--gray-300)', borderBottom: '1px solid var(--gray-300)', margin: '16px 0' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Time</div>
                  <div style={{ fontWeight: 600 }}>{new Date(event.start_date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div style={{ color: 'var(--gray-500)', fontSize: 14 }}>{new Date(event.start_date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Venue</div>
                  <div style={{ fontWeight: 600 }}>{event.venue}</div>
                  <div style={{ color: 'var(--gray-500)', fontSize: 14 }}>{event.city}</div>
                </div>
              </div>

              <p style={{ color: 'var(--gray-700)', lineHeight: 1.7 }}>{event.description}</p>
            </div>
          </div>

          {/* Right — Ticket Selector */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="card">
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Select Tickets</h2>

              {allSoldOut && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '16px', borderRadius: 8, marginBottom: 16, fontWeight: 600, textAlign: 'center' }}>
                  🔴 This event is sold out
                </div>
              )}

              {error && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                  {error}
                </div>
              )}

              {event.ticket_types.map(tt => (
                <div key={tt.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--gray-300)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{tt.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{tt.description}</div>
                      <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
                        {tt.is_sold_out ? '🔴 Sold out' : `${tt.quantity_available} remaining`}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 16 }}>
                      KES {Number(tt.price).toLocaleString()}
                    </div>
                  </div>

                  {!tt.is_sold_out && tt.is_on_sale && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                      <button onClick={() => updateQty(tt.id, -1)}
                        style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--primary)', background: 'none', color: 'var(--primary)', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        −
                      </button>
                      <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: 16 }}>
                        {selected[tt.id] || 0}
                      </span>
                      <button onClick={() => updateQty(tt.id, 1)}
                        style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', border: 'none', color: '#fff', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        +
                      </button>
                      <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                        (max {tt.max_per_order} per order)
                      </span>
                    </div>
                  )}

                  {tt.is_sold_out && <span className="badge badge-danger" style={{ marginTop: 8 }}>Sold Out</span>}
                </div>
              ))}

              {/* Total + CTA */}
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--primary)' }}>KES {total.toLocaleString()}</span>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px' }}
                  disabled={itemCount === 0 || ordering || !event.is_on_sale || allSoldOut}
                  onClick={handleOrder}
                >
                  {ordering ? 'Creating Order...' : itemCount > 0 ? `Buy ${itemCount} Ticket${itemCount > 1 ? 's' : ''}` : 'Select Tickets'}
                </button>
                {!user && (
                  <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-500)', marginTop: 10 }}>
                    You'll need to log in to purchase
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}