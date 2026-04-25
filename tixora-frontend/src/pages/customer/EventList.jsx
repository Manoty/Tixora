// src/pages/customer/EventList.jsx
import { useState, useEffect } from 'react';
import { Link }                from 'react-router-dom';
import api                     from '../../api/axios';

function EventCard({ event }) {
  const statusColor = {
    published: 'badge-success',
    draft:     'badge-gray',
    cancelled: 'badge-danger',
  };

  return (
    <Link to={`/events/${event.slug}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', overflow: 'hidden', padding: 0 }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}>

        {/* Banner */}
        <div style={{ height: 180, background: 'linear-gradient(135deg, var(--primary) 0%, #9C6FFF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {event.banner
            ? <img src={event.banner} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 48 }}>🎟️</span>
          }
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <span className={`badge ${statusColor[event.status] || 'badge-gray'}`}>{event.status}</span>
            {event.lowest_price && (
              <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 15 }}>
                From KES {Number(event.lowest_price).toLocaleString()}
              </span>
            )}
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--dark)', lineHeight: 1.3 }}>
            {event.title}
          </h3>

          <div style={{ color: 'var(--gray-500)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>📅 {new Date(event.start_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span>📍 {event.venue}, {event.city}</span>
            {event.organizer_name && <span>👤 {event.organizer_name}</span>}
          </div>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: event.is_on_sale ? 'var(--success)' : 'var(--gray-500)', fontWeight: 600 }}>
              {event.is_on_sale ? '🟢 On Sale' : '🔴 Not Available'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              {event.total_sold}/{event.total_capacity} sold
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EventList() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [city,    setCity]    = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search   = search;
      if (city)   params.city     = city;
      params.upcoming = 'true';
      const { data } = await api.get('/events/', { params });
      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--dark) 0%, var(--gray-900) 100%)', padding: '60px 24px', textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 12, letterSpacing: '-1px' }}>
          Discover Events in Kenya
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', marginBottom: 32 }}>
          Browse, buy, and experience — powered by Tixora
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, maxWidth: 600, margin: '0 auto', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events, venues..."
            style={{ flex: 1, minWidth: 200, padding: '14px 20px', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 15 }}
          />
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="City"
            style={{ width: 130, padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: 'none', fontSize: 15 }}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      {/* Events Grid */}
      <div className="container" style={{ padding: '40px 24px' }}>
        {loading ? (
          <div className="loading">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <h3>No events found</h3>
            <p>Try adjusting your search or check back soon.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>Upcoming Events</h2>
              <span style={{ color: 'var(--gray-500)', fontSize: 14 }}>{events.length} events found</span>
            </div>
            <div className="grid-3">
              {events.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}