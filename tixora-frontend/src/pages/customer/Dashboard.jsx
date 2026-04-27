import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { StatCardSkeleton } from '../../components/Skeleton';

function StatCard({ icon, label, value, color = 'var(--brand)', sublabel }) {
  return (
    <div className="card" style={{ padding: '22px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{
        width:          44,
        height:         44,
        borderRadius:   'var(--r)',
        background:     `${color}18`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       20,
        flexShrink:     0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color, lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 4 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

const statusConfig = {
  confirmed: { label: 'Confirmed', className: 'badge-success' },
  reserved:  { label: 'Reserved',  className: 'badge-warning' },
  cancelled: { label: 'Cancelled', className: 'badge-danger'  },
  refunded:  { label: 'Refunded',  className: 'badge-muted'   },
};

export default function CustomerDashboard() {
  const { user }              = useAuth();
  const [tickets, setTickets] = useState([]);
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/tickets/my/'),
      api.get('/orders/my/'),
    ]).then(([t, o]) => {
      setTickets(t.data.tickets || []);
      setOrders(o.data.orders   || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeTickets   = tickets.filter(t => t.status === 'active').length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const pendingOrders   = orders.filter(o => o.status === 'reserved').length;
  const totalSpent      = orders
    .filter(o => o.status === 'confirmed')
    .reduce((s, o) => s + parseFloat(o.total_amount), 0);

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>

      {/* ── Header Banner ─────────────────────────── */}
      <div style={{
        background: 'var(--surface-dark)',
        padding:    '40px 32px 48px',
        position:   'relative',
        overflow:   'hidden',
      }}>
        <div style={{
          position:   'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize:  '28px 28px', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }} className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {greeting}
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
                {firstName} 👋
              </h1>
            </div>
            <Link to="/" className="btn btn-brand">
              Browse Events →
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '0 32px', marginTop: -24 }}>

        {/* ── Stats ─────────────────────────────── */}
        {loading ? (
          <div className="grid-4" style={{ marginBottom: 32 }}>
            {[0,1,2,3].map(i => <StatCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid-4" style={{ marginBottom: 32 }}>
            <StatCard icon="🎟️" label="Active Tickets"   value={activeTickets}                        color="var(--brand)"   sublabel="Ready to use" />
            <StatCard icon="✅" label="Confirmed Orders"  value={confirmedOrders}                      color="var(--success)" sublabel="Successfully paid" />
            <StatCard icon="⏳" label="Pending Payment"   value={pendingOrders}                        color="var(--warning)" sublabel="Awaiting M-Pesa" />
            <StatCard icon="💰" label="Total Spent"       value={`KES ${totalSpent.toLocaleString()}`} color="var(--info)"    sublabel="All time" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }} className="dashboard-grid">

          {/* ── Recent Orders ──────────────────── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Recent Orders
              </h2>
              <Link to="/my-tickets" style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>
                View tickets →
              </Link>
            </div>

            {orders.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎟️</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No orders yet. Find an event and buy your first ticket!</p>
              </div>
            ) : (
              <table className="tixora-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map(order => {
                    const sc = statusConfig[order.status] || statusConfig.cancelled;
                    return (
                      <tr key={order.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {order.reference}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                            KES {Number(order.total_amount).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${sc.className}`}>{sc.label}</span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                        </td>
                        <td>
                          {order.status === 'reserved' && (
                            <Link to={`/checkout/${order.reference}`}
                              style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>
                              Pay now
                            </Link>
                          )}
                          {order.status === 'confirmed' && (
                            <Link to={`/tickets/order/${order.reference}`}
                              style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                              View →
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Sidebar ────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Quick Actions */}
            <div className="card" style={{ padding: '20px 24px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 16, letterSpacing: '-0.01em' }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/" className="btn btn-brand" style={{ width: '100%', justifyContent: 'center' }}>
                  🔍 Browse Events
                </Link>
                <Link to="/my-tickets" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                  🎟️ My Tickets
                </Link>
              </div>
            </div>

            {/* Upcoming ticket */}
            {tickets.filter(t => t.status === 'active').length > 0 && (
              <div className="card" style={{ padding: '20px 24px', background: 'var(--surface-dark)', border: 'none' }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                  Next Up
                </div>
                {(() => {
                  const next = tickets.filter(t => t.status === 'active')[0];
                  return (
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 6, lineHeight: 1.3 }}>
                        {next.event_title}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
                        {next.ticket_type_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                        {new Date(next.event_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <Link
                        to={`/my-tickets`}
                        className="btn btn-brand btn-sm"
                        style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
                      >
                        View QR Ticket
                      </Link>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
