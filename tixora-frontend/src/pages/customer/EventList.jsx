import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { EventCardSkeleton } from '../../components/Skeleton';

/* ── Urgency badge (< 20% capacity left) ───────────── */
function UrgencyBadge({ sold, total }) {
  const pct = total > 0 ? sold / total : 0;
  if (pct < 0.8) return null;
  return (
    <span className="badge badge-danger" style={{ animation: 'pulse 2s infinite' }}>
      🔥 Selling fast
    </span>
  );
}

/* ── Event Card ─────────────────────────────────────── */
function EventCard({ event }) {
  const sold      = event.total_sold    || 0;
  const capacity  = event.total_capacity || 0;
  const pct       = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;

  const statusConfig = {
    published: { label: 'On Sale',  className: 'badge-success' },
    draft:     { label: 'Draft',    className: 'badge-muted'   },
    cancelled: { label: 'Cancelled',className: 'badge-danger'  },
    completed: { label: 'Past',     className: 'badge-muted'   },
  };
  const sc = statusConfig[event.status] || statusConfig.draft;

  return (
    <Link to={`/events/${event.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article
        className="card card-hover"
        style={{ overflow: 'hidden', padding: 0, cursor: 'pointer' }}
      >
        {/* ── Banner ───────────────────────────────── */}
        <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: '#1A1A26' }}>
          {event.banner
            ? <img
                src={event.banner}
                alt={event.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform var(--t-slow) var(--ease)' }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              />
            : (
              <div style={{
                height: '100%',
                background: `linear-gradient(135deg, #1A1A26 0%, #2D1F3D 50%, #1A2D26 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.4">
                  <path d="M8 32h32M8 16h32M16 8v32M32 8v32" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="12" y="12" width="24" height="24" rx="4" stroke="#fff" strokeWidth="2"/>
                </svg>
              </div>
            )
          }

          {/* Gradient overlay */}
          <div style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(to top, rgba(17,17,24,0.6) 0%, transparent 50%)',
          }} />

          {/* Status badge */}
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span className={`badge ${sc.className}`}>{sc.label}</span>
          </div>

          {/* Price chip */}
          {event.lowest_price && (
            <div style={{
              position:      'absolute',
              bottom:        12,
              right:         12,
              background:    'var(--brand)',
              color:         '#fff',
              borderRadius:  'var(--r-full)',
              padding:       '4px 12px',
              fontFamily:    'var(--font-display)',
              fontWeight:    700,
              fontSize:      13,
              boxShadow:     '0 2px 8px rgba(255,69,0,0.3)',
            }}>
              From KES {Number(event.lowest_price).toLocaleString()}
            </div>
          )}
        </div>

        {/* ── Body ─────────────────────────────────── */}
        <div style={{ padding: '20px 20px 22px' }}>
          {/* Urgency + Category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <UrgencyBadge sold={sold} total={capacity} />
            {event.category && (
              <span className="badge badge-muted">{event.category.name}</span>
            )}
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily:    'var(--font-display)',
            fontSize:      17,
            fontWeight:    700,
            letterSpacing: '-0.02em',
            lineHeight:    1.3,
            color:         'var(--text-primary)',
            marginBottom:  12,
            display:       '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow:      'hidden',
          }}>
            {event.title}
          </h3>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M1 7h14M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>{new Date(event.start_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="8" cy="6" r="1.5" fill="currentColor"/>
              </svg>
              <span>{event.venue}, {event.city}</span>
            </div>
          </div>

          {/* Capacity bar */}
          {capacity > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                <span>{sold.toLocaleString()} sold</span>
                <span>{(capacity - sold).toLocaleString()} left</span>
              </div>
              <div style={{ height: 4, background: 'rgba(17,17,24,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height:       '100%',
                  width:        `${pct}%`,
                  borderRadius: 99,
                  background:   pct >= 80 ? 'var(--brand)' : pct >= 50 ? 'var(--warning)' : 'var(--success)',
                  transition:   'width 0.6s var(--ease)',
                }} />
              </div>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

/* ── Search Bar ─────────────────────────────────────── */
function HeroSearch({ onSearch }) {
  const [search, setSearch] = useState('');
  const [city,   setCity]   = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ search, city });
  };

  return (
    <form onSubmit={handleSubmit} style={{
      display:       'flex',
      gap:           8,
      maxWidth:      640,
      margin:        '0 auto',
      background:    'rgba(255,255,255,0.12)',
      borderRadius:  'var(--r-xl)',
      padding:       8,
      backdropFilter: 'blur(8px)',
      border:        '1px solid rgba(255,255,255,0.2)',
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.6 }}>
          <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5"/>
          <path d="M11 11l3.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events, artists, venues..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#fff', fontSize: 15, fontFamily: 'var(--font-body)',
          }}
        />
      </div>
      <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', margin: '8px 0' }} />
      <input
        value={city}
        onChange={e => setCity(e.target.value)}
        placeholder="City"
        style={{
          width: 110, background: 'none', border: 'none', outline: 'none',
          color: '#fff', fontSize: 15, padding: '0 12px',
          fontFamily: 'var(--font-body)',
        }}
      />
      <button type="submit" className="btn btn-brand" style={{ borderRadius: 'var(--r-lg)', flexShrink: 0 }}>
        Search
      </button>
    </form>
  );
}

/* ── Stats strip ────────────────────────────────────── */
function TrustStrip() {
  return (
    <div style={{
      background:   'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding:      '12px 0',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
        {[
          { icon: '🎟️', text: '10,000+ Tickets Sold' },
          { icon: '🔒', text: 'Secured Payments'      },
          { icon: '📱', text: 'M-Pesa Integrated'     },
          { icon: '⚡', text: 'Instant QR Delivery'   },
        ].map(item => (
          <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */
export default function EventList() {
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filters,  setFilters]  = useState({});
  const [upcoming, setUpcoming] = useState('true');

  const fetchEvents = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/events/', {
        params: { upcoming, ...filters, ...params }
      });
      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [upcoming, filters]);

  useEffect(() => { fetchEvents(); }, []);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    fetchEvents(newFilters);
  };

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Hero ──────────────────────────────────── */}
      <section style={{
        background:   'var(--surface-dark)',
        padding:      '72px 24px 80px',
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* Background grid pattern */}
        <div style={{
          position:          'absolute',
          inset:             0,
          backgroundImage:   'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize:    '32px 32px',
          pointerEvents:     'none',
        }} />
        {/* Brand glow */}
        <div style={{
          position:    'absolute',
          top:         '50%',
          left:        '50%',
          transform:   'translate(-50%, -60%)',
          width:       600,
          height:      300,
          background:  'radial-gradient(ellipse, rgba(255,69,0,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           6,
            background:    'rgba(255,69,0,0.15)',
            border:        '1px solid rgba(255,69,0,0.3)',
            borderRadius:  'var(--r-full)',
            padding:       '5px 14px',
            marginBottom:  20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em' }}>
              LIVE IN KENYA
            </span>
          </div>

          <h1 style={{
            fontFamily:    'var(--font-display)',
            fontSize:      'clamp(36px, 6vw, 60px)',
            fontWeight:    800,
            color:         '#FFFFFF',
            letterSpacing: '-0.04em',
            lineHeight:    1.1,
            marginBottom:  16,
          }}>
            Discover Events<br />
            <span style={{ color: 'var(--brand)' }}>Worth Attending</span>
          </h1>

          <p style={{
            fontSize:     18,
            color:        'rgba(255,255,255,0.55)',
            marginBottom: 40,
            lineHeight:   1.6,
          }}>
            Browse, buy, and experience — powered by Tixora
          </p>

          <HeroSearch onSearch={handleSearch} />
        </div>
      </section>

      {/* ── Trust Strip ───────────────────────────── */}
      <TrustStrip />

      {/* ── Events Grid ───────────────────────────── */}
      <section className="container" style={{ padding: '48px 32px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {loading ? 'Loading events...' : `${events.length} ${upcoming === 'true' ? 'Upcoming' : ''} Events`}
          </h2>

          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'Upcoming', value: 'true' },
              { label: 'All Events', value: 'false' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => { setUpcoming(tab.value); fetchEvents({ upcoming: tab.value }); }}
                style={{
                  padding:       '8px 16px',
                  borderRadius:  'var(--r-full)',
                  border:        upcoming === tab.value ? 'none' : '1.5px solid var(--border-strong)',
                  background:    upcoming === tab.value ? 'var(--surface-dark)' : 'transparent',
                  color:         upcoming === tab.value ? '#fff' : 'var(--text-secondary)',
                  fontFamily:    'var(--font-display)',
                  fontWeight:    600,
                  fontSize:      13,
                  cursor:        'pointer',
                  transition:    'all var(--t-fast)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid-3">
            {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No events found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search filters or check back soon.</p>
          </div>
        ) : (
          <div className="grid-3">
            {events.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
