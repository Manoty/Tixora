import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/* ── Ticket Selector Card ───────────────────────────── */
function TicketTypeRow({ tt, quantity, onUpdate }) {
  const available = tt.quantity_available;
  const soldOut   = tt.is_sold_out;
  const onSale    = tt.is_on_sale;

  return (
    <div style={{
      padding:      '18px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: soldOut || !onSale ? 8 : 14 }}>
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {tt.name}
          </div>
          {tt.description && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
              {tt.description}
            </div>
          )}
          <div style={{ fontSize: 12, color: soldOut ? 'var(--danger)' : available <= 10 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
            {soldOut
              ? 'Sold out'
              : available <= 20
                ? `⚠️ Only ${available} left`
                : `${available.toLocaleString()} available`
            }
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    800,
            fontSize:      20,
            color:         'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            KES {Number(tt.price).toLocaleString()}
          </div>
          {tt.max_per_order && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Max {tt.max_per_order} per order
            </div>
          )}
        </div>
      </div>

      {/* Quantity control */}
      {!soldOut && onSale && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => onUpdate(tt.id, -1)}
            disabled={quantity === 0}
            style={{
              width:        36,
              height:       36,
              borderRadius: 'var(--r)',
              border:       '1.5px solid var(--border-strong)',
              background:   quantity === 0 ? 'transparent' : 'var(--surface-dark)',
              color:        quantity === 0 ? 'var(--text-muted)' : '#fff',
              fontSize:     20,
              fontWeight:   300,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              cursor:       quantity === 0 ? 'default' : 'pointer',
              transition:   'all var(--t-fast)',
              lineHeight:   1,
            }}
          >
            −
          </button>

          <span style={{
            fontFamily:  'var(--font-display)',
            fontWeight:  700,
            fontSize:    18,
            minWidth:    28,
            textAlign:   'center',
            color:       quantity > 0 ? 'var(--brand)' : 'var(--text-primary)',
            transition:  'color var(--t-fast)',
          }}>
            {quantity}
          </span>

          <button
            onClick={() => onUpdate(tt.id, 1)}
            disabled={quantity >= tt.max_per_order || quantity >= available}
            style={{
              width:          36,
              height:         36,
              borderRadius:   'var(--r)',
              border:         'none',
              background:     (quantity >= tt.max_per_order || quantity >= available) ? 'var(--border)' : 'var(--brand)',
              color:          '#fff',
              fontSize:       20,
              fontWeight:     300,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         (quantity >= tt.max_per_order || quantity >= available) ? 'default' : 'pointer',
              transition:     'all var(--t-fast)',
              boxShadow:      (quantity >= tt.max_per_order || quantity >= available) ? 'none' : '0 2px 8px rgba(255,69,0,0.25)',
              lineHeight:     1,
            }}
          >
            +
          </button>

          {quantity > 0 && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4 }}>
              = KES {(quantity * tt.price).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {soldOut && <span className="badge badge-danger">Sold Out</span>}
      {!onSale && !soldOut && <span className="badge badge-muted">Not on sale yet</span>}
    </div>
  );
}

/* ── Info Row ───────────────────────────────────────── */
function InfoRow({ icon, label, value, subvalue }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width:       40,
        height:      40,
        borderRadius: 'var(--r)',
        background:  'rgba(17,17,24,0.05)',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        flexShrink:  0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{value}</div>
        {subvalue && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 1 }}>{subvalue}</div>}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */
export default function EventDetail() {
  const { slug }                  = useParams();
  const { user }                  = useAuth();
  const navigate                  = useNavigate();
  const [event,    setEvent]      = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [selected, setSelected]   = useState({});
  const [ordering, setOrdering]   = useState(false);
  const [error,    setError]      = useState('');

  useEffect(() => {
    api.get(`/events/${slug}/`)
      .then(r => setEvent(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [slug]);

  const updateQty = (ttId, delta) => {
    const tt   = event.ticket_types.find(t => t.id === ttId);
    const cur  = selected[ttId] || 0;
    const next = Math.max(0, Math.min(cur + delta, tt.max_per_order, tt.quantity_available));
    setSelected(prev => ({ ...prev, [ttId]: next }));
  };

  const total      = event?.ticket_types.reduce((sum, tt) => sum + ((selected[tt.id] || 0) * parseFloat(tt.price)), 0) || 0;
  const itemCount  = Object.values(selected).reduce((a, b) => a + b, 0);
  const allSoldOut = event?.ticket_types.every(tt => tt.is_sold_out);

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
      setError(err.response?.data?.items?.[0] || 'Unable to create order. Please try again.');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Hero Banner ───────────────────────────── */}
      <div style={{
        height:     320,
        background: 'var(--surface-dark)',
        position:   'relative',
        overflow:   'hidden',
      }}>
        {event.banner
          ? <img src={event.banner} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
          : (
            <div style={{
              height: '100%',
              background: 'linear-gradient(135deg, #0D0D20 0%, #1A1228 40%, #0D1A14 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ opacity: 0.08, fontSize: 200, lineHeight: 1 }}>🎪</div>
            </div>
          )
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(17,17,24,0.8) 0%, rgba(17,17,24,0.3) 60%, transparent 100%)' }} />

        {/* Back button */}
        <div style={{ position: 'absolute', top: 20, left: 32 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display:      'flex', alignItems: 'center', gap: 6,
              background:   'rgba(255,255,255,0.12)',
              border:       '1px solid rgba(255,255,255,0.2)',
              borderRadius: 'var(--r)',
              padding:      '8px 14px',
              color:        '#fff',
              fontSize:     13,
              fontWeight:   600,
              cursor:       'pointer',
              backdropFilter: 'blur(8px)',
              fontFamily:   'var(--font-display)',
            }}
          >
            ← Back
          </button>
        </div>

        {/* Hero title overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 32px 28px' }}>
          <div className="container" style={{ padding: 0 }}>
            {event.category && (
              <span className="badge badge-brand" style={{ marginBottom: 10 }}>
                {event.category.name}
              </span>
            )}
            <h1 style={{
              fontFamily:    'var(--font-display)',
              fontSize:      'clamp(24px, 4vw, 40px)',
              fontWeight:    800,
              color:         '#FFFFFF',
              letterSpacing: '-0.03em',
              lineHeight:    1.15,
              textShadow:    '0 2px 20px rgba(0,0,0,0.4)',
            }}>
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────── */}
      <div className="container" style={{ padding: '0 32px', marginTop: -1 }}>
        <div style={{
          display:             'grid',
          gridTemplateColumns: '1fr 380px',
          gap:                 40,
          alignItems:          'start',
          paddingTop:          40,
          paddingBottom:       80,
        }}
          className="event-detail-grid"
        >

          {/* ── Left Column ─────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Organizer + Status */}
            <div className="card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--surface-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#fff',
                }}>
                  {(event.organizer_name || 'O')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>Organizer</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{event.organizer_name}</div>
                </div>
              </div>
              <span className={`badge ${event.is_on_sale ? 'badge-success' : 'badge-muted'}`}>
                {event.is_on_sale ? '● On Sale' : 'Not Available'}
              </span>
            </div>

            {/* Details grid */}
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.01em' }}>Event Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <InfoRow
                  icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="14" rx="2" stroke="var(--text-secondary)" strokeWidth="1.5"/><path d="M2 8h16M7 2v4M13 2v4" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                  label="Date"
                  value={new Date(event.start_date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  subvalue={new Date(event.start_date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                />
                <InfoRow
                  icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2C7.24 2 5 4.24 5 7c0 4.5 5 11 5 11s5-6.5 5-11c0-2.76-2.24-5-5-5z" stroke="var(--text-secondary)" strokeWidth="1.5"/><circle cx="10" cy="7" r="1.5" fill="var(--text-secondary)"/></svg>}
                  label="Venue"
                  value={event.venue}
                  subvalue={event.city}
                />
                <InfoRow
                  icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="var(--text-secondary)" strokeWidth="1.5"/><path d="M10 6v4l3 2" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                  label="End Date"
                  value={new Date(event.end_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  subvalue={new Date(event.end_date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                />
                <InfoRow
                  icon={<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4v4l3 1.5" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                  label="Capacity"
                  value={`${event.total_capacity?.toLocaleString()} total`}
                  subvalue={`${event.total_sold?.toLocaleString()} sold`}
                />
              </div>
            </div>

            {/* Description */}
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.01em' }}>About This Event</h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
                {event.description}
              </p>
            </div>
          </div>

          {/* ── Right Column — Ticket Selector ──── */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="card" style={{ padding: '24px' }}>

              {/* Header */}
              <div style={{ marginBottom: 4 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
                  Select Tickets
                </h2>
                {allSoldOut && (
                  <div className="alert alert-danger" style={{ marginTop: 12 }}>
                    <span>This event is sold out.</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: 0, marginTop: 12 }}>
                  {error}
                </div>
              )}

              {/* Ticket types */}
              <div>
                {event.ticket_types.map(tt => (
                  <TicketTypeRow
                    key={tt.id}
                    tt={tt}
                    quantity={selected[tt.id] || 0}
                    onUpdate={updateQty}
                  />
                ))}
              </div>

              {/* Total */}
              {itemCount > 0 && (
                <div style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                  marginTop:      20,
                  padding:        '16px 0',
                  borderTop:      '2px solid var(--border)',
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                    Total ({itemCount} {itemCount === 1 ? 'ticket' : 'tickets'})
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--brand)' }}>
                    KES {total.toLocaleString()}
                  </span>
                </div>
              )}

              {/* CTA */}
              <button
                className="btn btn-brand btn-lg"
                style={{ width: '100%', marginTop: itemCount > 0 ? 0 : 20, fontSize: 16 }}
                disabled={itemCount === 0 || ordering || allSoldOut || !event.is_on_sale}
                onClick={handleOrder}
              >
                {ordering
                  ? 'Creating Order...'
                  : itemCount > 0
                    ? `Buy ${itemCount} Ticket${itemCount > 1 ? 's' : ''} →`
                    : allSoldOut
                      ? 'Sold Out'
                      : 'Select Tickets Above'
                }
              </button>

              {/* Trust signals */}
              <div style={{
                display:       'flex',
                flexDirection: 'column',
                gap:           8,
                marginTop:     16,
                padding:       '16px',
                background:    'rgba(17,17,24,0.03)',
                borderRadius:  'var(--r)',
              }}>
                {[
                  { icon: '🔒', text: 'Secured by 256-bit encryption' },
                  { icon: '📱', text: 'Pay via M-Pesa — instant confirmation' },
                  { icon: '🎟️', text: 'QR ticket delivered instantly' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              {!user && (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                  <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Sign in</Link> to purchase tickets
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .event-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
