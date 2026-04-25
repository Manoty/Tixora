// src/pages/organizer/OrganizerDashboard.jsx
import { useState, useEffect } from 'react';
import { Link }                from 'react-router-dom';
import api                     from '../../api/axios';
import { useAuth }             from '../../context/AuthContext';

export default function OrganizerDashboard() {
  const { user }            = useAuth();
  const [events,  setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/events/manage/')
      .then(r => setEvents(r.data.events || []))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = events.reduce((sum, e) => sum + (e.total_sold * 0), 0);

  const statusBadge = {
    published: 'badge-success',
    draft:     'badge-warning',
    cancelled: 'badge-danger',
    completed: 'badge-gray',
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)', padding: '40px 24px' }}>
      <div className="container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Organizer Dashboard</h1>
            <p>Manage your Tixora events</p>
          </div>
          <Link to="/organizer/events/create" className="btn btn-primary">+ Create Event</Link>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {[
            { label: 'Total Events',     value: events.length, icon: '🎪' },
            { label: 'Published',        value: events.filter(e => e.status === 'published').length, icon: '🟢' },
            { label: 'Total Tickets Sold', value: events.reduce((s, e) => s + e.total_sold, 0), icon: '🎟️' },
            { label: 'Total Capacity',   value: events.reduce((s, e) => s + e.total_capacity, 0), icon: '👥' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Events Table */}
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Your Events</h2>
          {events.length === 0 ? (
            <div className="empty-state">
              <h3>No events yet</h3>
              <p>Create your first event to start selling tickets.</p>
              <Link to="/organizer/events/create" className="btn btn-primary" style={{ marginTop: 16 }}>Create Event</Link>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--gray-300)' }}>
                  {['Event', 'Date', 'Status', 'Sold/Capacity', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id} style={{ borderBottom: '1px solid var(--gray-300)' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 600 }}>{event.title}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: 'var(--gray-500)' }}>
                      {new Date(event.start_date).toLocaleDateString('en-KE')}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <span className={`badge ${statusBadge[event.status] || 'badge-gray'}`}>{event.status}</span>
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 13 }}>
                      {event.total_sold} / {event.total_capacity}
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      <Link to={`/organizer/events/${event.id}`} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 13 }}>
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}