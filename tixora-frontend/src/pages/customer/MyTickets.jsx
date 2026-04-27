import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api/axios';
import { TicketCardSkeleton } from '../../components/Skeleton';

/* ── Single Ticket Card ─────────────────────────────── */
function TicketCard({ ticket }) {
  const [expanded, setExpanded] = useState(false);
  const used      = ticket.status === 'used';
  const cancelled = ticket.status === 'cancelled';

  return (
    <div
      className="card"
      style={{
        overflow:   'hidden',
        padding:    0,
        transition: 'box-shadow var(--t)',
        opacity:    cancelled ? 0.6 : 1,
      }}
    >
      {/* ── Ticket Header (dark band) ────────────── */}
      <div style={{
        background:   'var(--surface-dark)',
        padding:      '20px 24px',
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* Subtle pattern */}
        <div style={{
          position:        'absolute',
          inset:           0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize:  '20px 20px',
          pointerEvents:   'none',
        }} />
        {/* Brand glow */}
        <div style={{
          position:    'absolute',
          top:         -40,
          right:       -40,
          width:       140,
          height:      140,
          borderRadius: '50%',
          background:  'radial-gradient(circle, rgba(255,69,0,0.2), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 6 }}>
              Tixora · Official Ticket
            </div>
            <h3 style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    800,
              fontSize:      17,
              color:         '#FFFFFF',
              letterSpacing: '-0.02em',
              lineHeight:    1.25,
              marginBottom:  6,
              maxWidth:      220,
            }}>
              {ticket.event_title}
            </h3>
            <span style={{
              background:    'rgba(255,255,255,0.12)',
              color:         'rgba(255,255,255,0.8)',
              borderRadius:  'var(--r-full)',
              padding:       '3px 10px',
              fontSize:      12,
              fontFamily:    'var(--font-display)',
              fontWeight:    600,
            }}>
              {ticket.ticket_type_name}
            </span>
          </div>

          {/* Status */}
          {used && (
            <div style={{
              background:    'rgba(255,255,255,0.1)',
              border:        '1px solid rgba(255,255,255,0.15)',
              borderRadius:  'var(--r)',
              padding:       '6px 12px',
              textAlign:     'center',
              flexShrink:    0,
            }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>✓</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>USED</div>
            </div>
          )}
          {!used && !cancelled && (
            <div style={{
              background:    'rgba(5,150,105,0.2)',
              border:        '1px solid rgba(5,150,105,0.3)',
              borderRadius:  'var(--r)',
              padding:       '6px 12px',
              textAlign:     'center',
              flexShrink:    0,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', margin: '0 auto 4px', animation: 'pulse 2s ease-in-out infinite' }} />
              <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>ACTIVE</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Perforated divider ───────────────────── */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        padding:         '0 4px',
        background:      'var(--bg)',
        position:        'relative',
      }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg)', flexShrink: 0 }} />
        <div style={{
          flex:            1,
          borderTop:       '2px dashed rgba(17,17,24,0.12)',
          margin:          '0 4px',
        }} />
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg)', flexShrink: 0 }} />
      </div>

      {/* ── Ticket Body ──────────────────────────── */}
      <div style={{ padding: '20px 24px 24px', background: 'var(--surface)' }}>
        {/* Event meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 20 }}>
          {[
            {
              label: 'Date',
              value: new Date(ticket.event_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            },
            { label: 'Venue',  value: ticket.event_venue },
            { label: 'Name',   value: ticket.owner_name  },
            { label: 'Order',  value: ticket.order_reference, mono: true },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>
                {item.label}
              </div>
              <div style={{
                fontSize:    13,
                fontWeight:  600,
                color:       'var(--text-primary)',
                fontFamily:  item.mono ? 'monospace' : 'var(--font-body)',
                overflow:    'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:  'nowrap',
              }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* QR Code section */}
        {!used && !cancelled ? (
          <div
            style={{
              paddingTop:    16,
              borderTop:     '1px dashed rgba(17,17,24,0.12)',
              textAlign:     'center',
              cursor:        'pointer',
            }}
            onClick={() => setExpanded(!expanded)}
          >
            <div style={{
              display:        'inline-block',
              padding:        expanded ? 16 : 8,
              background:     '#fff',
              borderRadius:   'var(--r)',
              border:         '1.5px solid var(--border)',
              marginBottom:   8,
              transition:     'padding var(--t)',
            }}>
              <QRCodeSVG
                value={ticket.ticket_uuid}
                size={expanded ? 200 : 100}
                level="H"
                includeMargin={false}
                style={{ display: 'block', transition: 'all var(--t)' }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {expanded ? 'Tap to shrink' : 'Tap QR to expand'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>
              {ticket.ticket_uuid}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>
              Show this code at the gate entrance
            </div>
          </div>
        ) : (
          <div style={{
            paddingTop:  16,
            borderTop:   '1px dashed rgba(17,17,24,0.12)',
            textAlign:   'center',
            padding:     '24px 0',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{used ? '✅' : '❌'}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {used ? 'Ticket Used — Thank you for attending!' : 'Ticket Cancelled'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */
export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    api.get('/tickets/my/')
      .then(r => setTickets(r.data.tickets || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 24px 80px' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1>My Tickets</h1>
            <p>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} across all events</p>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'All',      value: 'all'       },
              { label: 'Active',   value: 'active'    },
              { label: 'Used',     value: 'used'      },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                style={{
                  padding:       '7px 14px',
                  borderRadius:  'var(--r-full)',
                  border:        filter === tab.value ? 'none' : '1.5px solid var(--border-strong)',
                  background:    filter === tab.value ? 'var(--surface-dark)' : 'transparent',
                  color:         filter === tab.value ? '#fff' : 'var(--text-secondary)',
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
            {Array.from({ length: 3 }).map((_, i) => <TicketCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎟️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No tickets yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              {filter !== 'all' ? `No ${filter} tickets.` : 'Browse events and buy your first ticket!'}
            </p>
            <Link to="/" className="btn btn-brand">Browse Events</Link>
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map(t => <TicketCard key={t.id} ticket={t} />)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
