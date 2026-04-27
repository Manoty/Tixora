import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { StatCardSkeleton, TableRowSkeleton } from '../../components/Skeleton';

function StatCard({ icon, label, value, color = 'var(--brand)' }) {
  return (
    <div className="card" style={{ padding: '20px 24px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--r)',
        background: `${color}18`, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color, lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

const statusMap = {
  published: { label: 'Published', cls: 'badge-success' },
  draft:     { label: 'Draft',     cls: 'badge-warning' },
  cancelled: { label: 'Cancelled', cls: 'badge-danger'  },
  completed: { label: 'Completed', cls: 'badge-muted'   },
};

export default function OrganizerDashboard() {
  const { user }            = useAuth();
  const [events,  setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    api.get('/events/manage/')
      .then(r => setEvents(r.data.events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? events : events.filter(e => e.status === filter);
  const totalSold = events.reduce((s, e) => s + e.total_sold, 0);
  const totalCap  = events.reduce((s, e) => s + e.total_capacity, 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>

      {/* ── Header ──────────────────────────────── */}
      <div style={{ background: 'var(--surface-dark)', padding: '40px 32px 48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }} className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span className="badge badge-gold" style={{ marginBottom: 10 }}>Organizer Dashboard</span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
                {user?.full_name || user?.email}
              </h1>
            </div>
            <Link to="/organizer/events/create" className="btn btn-brand btn-lg">
              + Create Event
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
            <StatCard icon="🎪" label="Total Events"       value={events.length}                                        color="var(--brand)"   />
            <StatCard icon="🟢" label="Published"          value={events.filter(e => e.status === 'published').length}  color="var(--success)" />
            <StatCard icon="🎟️" label="Tickets Sold"       value={totalSold.toLocaleString()}                           color="var(--info)"    />
            <StatCard icon="👥" label="Total Capacity"     value={totalCap.toLocaleString()}                            color="var(--warning)" />
          </div>
        )}

        {/* ── Events Table ──────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Table header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Your Events
            </h2>

            {/* Status filter */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'published', 'draft', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    padding:      '5px 12px',
                    borderRadius: 'var(--r-full)',
                    border:       filter === s ? 'none' : '1.5px solid var(--border-strong)',
                    background:   filter === s ? 'var(--surface-dark)' : 'transparent',
                    color:        filter === s ? '#fff' : 'var(--text-secondary)',
                    fontFamily:   'var(--font-display)',
                    fontWeight:   600,
                    fontSize:     12,
                    cursor:       'pointer',
                    textTransform: 'capitalize',
                    transition:   'all var(--t-fast)',
                  }}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <table className="tixora-table">
              <thead>
                <tr>
                  {['Event','Date','Status','Sold','Capacity','Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[0,1,2,3].map(i => <TableRowSkeleton key={i} cols={6} />)}
              </tbody>
            </table>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎪</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8 }}>
                {filter === 'all' ? 'No events yet' : `No ${filter} events`}
              </h3>
              {filter === 'all' && (
                <Link to="/organizer/events/create" className="btn btn-brand" style={{ marginTop: 8 }}>
                  Create your first event
                </Link>
              )}
            </div>
          ) : (
            <table className="tixora-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Sold</th>
                  <th>Sell-through</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(event => {
                  const sc  = statusMap[event.status] || statusMap.draft;
                  const pct = event.total_capacity > 0
                    ? Math.round((event.total_sold / event.total_capacity) * 100)
                    : 0;
                  return (
                    <tr key={event.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{event.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{event.city}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {new Date(event.start_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span className={`badge ${sc.cls}`}>{sc.label}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
                        {event.total_sold.toLocaleString()}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                          {' '}/ {event.total_capacity.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{
                              height: '100%', width: `${pct}%`,
                              background: pct >= 80 ? 'var(--brand)' : pct >= 50 ? 'var(--warning)' : 'var(--success)',
                              borderRadius: 99,
                            }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32, fontWeight: 600 }}>{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link
                            to={`/organizer/events/${event.id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
