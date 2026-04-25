// src/pages/customer/MyTickets.jsx
import { useState, useEffect } from 'react';
import { useParams, Link }     from 'react-router-dom';
import { QRCodeSVG }           from 'qrcode.react';
import api                     from '../../api/axios';

function TicketCard({ ticket }) {
  const [flipped, setFlipped] = useState(false);

  const statusColor = {
    active:    'badge-success',
    used:      'badge-gray',
    cancelled: 'badge-danger',
  };

  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #9C6FFF 100%)', padding: '20px 24px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Tixora</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{ticket.event_title}</h3>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{ticket.ticket_type_name}</div>
          </div>
          <span className={`badge ${statusColor[ticket.status] || 'badge-gray'}`} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            {ticket.status}
          </span>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, fontSize: 13 }}>
          <div>
            <div style={{ color: 'var(--gray-500)', marginBottom: 2 }}>Date</div>
            <div style={{ fontWeight: 600 }}>{new Date(ticket.event_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
          <div>
            <div style={{ color: 'var(--gray-500)', marginBottom: 2 }}>Venue</div>
            <div style={{ fontWeight: 600 }}>{ticket.event_venue}</div>
          </div>
          <div>
            <div style={{ color: 'var(--gray-500)', marginBottom: 2 }}>Name</div>
            <div style={{ fontWeight: 600 }}>{ticket.owner_name}</div>
          </div>
          <div>
            <div style={{ color: 'var(--gray-500)', marginBottom: 2 }}>Order</div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{ticket.order_reference}</div>
          </div>
        </div>

        {/* QR Code */}
        {ticket.status === 'active' && (
          <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px dashed var(--gray-300)' }}>
            <div style={{ display: 'inline-block', padding: 12, background: '#fff', borderRadius: 8, border: '1px solid var(--gray-300)', marginBottom: 8 }}>
              <QRCodeSVG
                value={ticket.ticket_uuid}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', fontFamily: 'monospace' }}>
              {ticket.ticket_uuid}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              Show this QR code at the gate
            </div>
          </div>
        )}

        {ticket.status === 'used' && (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)', borderTop: '1px dashed var(--gray-300)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 600 }}>Ticket Used</div>
            <div style={{ fontSize: 13 }}>You attended this event</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tickets/my/')
      .then(r => setTickets(r.data.tickets || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading your tickets...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)', padding: '40px 24px' }}>
      <div className="container">
        <div className="page-header">
          <h1>My Tickets</h1>
          <p>Your event tickets and QR codes</p>
        </div>

        {tickets.length === 0 ? (
          <div className="empty-state">
            <h3>No tickets yet</h3>
            <p>Browse events and buy your first ticket!</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Events</Link>
          </div>
        ) : (
          <div className="grid-3">
            {tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}