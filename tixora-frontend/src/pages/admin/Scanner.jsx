// src/pages/admin/Scanner.jsx
import { useState, useEffect } from 'react';
import api                     from '../../api/axios';

export default function Scanner() {
  const [manualUUID, setManualUUID] = useState('');
  const [result,     setResult]     = useState(null);
  const [scanning,   setScanning]   = useState(false);
  const [eventId,    setEventId]    = useState('');
  const [events,     setEvents]     = useState([]);

  useEffect(() => {
    api.get('/events/manage/').then(r => setEvents(r.data.events || [])).catch(() => {});
  }, []);

  const processUUID = async (uuid) => {
    if (!uuid?.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const payload = { ticket_uuid: uuid.trim() };
      if (eventId) payload.event_id = eventId;
      const { data } = await api.post('/checkins/scan/', payload);
      setResult(data);
    } catch (err) {
      setResult({
        result:   'error',
        admitted: false,
        message:  err.response?.data?.error || 'Scan failed.',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleManualScan = (e) => {
    e.preventDefault();
    processUUID(manualUUID);
    setManualUUID('');
  };

  const resultColor = {
    success:        { bg: '#D1FAE5', border: '#10B981', color: '#065F46', icon: '✅' },
    already_used:   { bg: '#FEE2E2', border: '#EF4444', color: '#991B1B', icon: '🚫' },
    invalid_ticket: { bg: '#FEE2E2', border: '#EF4444', color: '#991B1B', icon: '❌' },
    wrong_event:    { bg: '#FEF3C7', border: '#F59E0B', color: '#92400E', icon: '⚠️' },
    expired:        { bg: '#FEE2E2', border: '#EF4444', color: '#991B1B', icon: '⏰' },
    cancelled:      { bg: '#FEE2E2', border: '#EF4444', color: '#991B1B', icon: '🚫' },
    error:          { bg: '#FEE2E2', border: '#EF4444', color: '#991B1B', icon: '⚠️' },
  };

  const r = result ? (resultColor[result.result] || resultColor.error) : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', borderRadius: 10, padding: '6px 16px', fontWeight: 800, fontSize: 20, marginBottom: 12 }}>
            Tixora
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>Gate Scanner</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Admin Check-In Console</p>
        </div>

        {/* Event Selector */}
        <div className="card" style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
            Select Event (optional)
          </label>
          <select value={eventId} onChange={e => setEventId(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '2px solid var(--gray-300)', fontSize: 15 }}>
            <option value="">All Events</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        {/* Result Display */}
        {result && r && (
          <div style={{
            background:   r.bg,
            border:       `3px solid ${r.border}`,
            borderRadius: 'var(--radius)',
            padding:      32,
            textAlign:    'center',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>{r.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: r.color, marginBottom: 8 }}>
              {result.admitted ? 'ADMITTED' : 'DENIED'}
            </div>
            <div style={{ fontSize: 16, color: r.color, marginBottom: 16 }}>{result.message}</div>
            {result.ticket_info && Object.keys(result.ticket_info).length > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 16, textAlign: 'left' }}>
                {result.ticket_info.owner_name  && <div style={{ marginBottom: 6 }}><strong>Name:</strong> {result.ticket_info.owner_name}</div>}
                {result.ticket_info.ticket_type && <div style={{ marginBottom: 6 }}><strong>Type:</strong> {result.ticket_info.ticket_type}</div>}
                {result.ticket_info.event       && <div style={{ marginBottom: 6 }}><strong>Event:</strong> {result.ticket_info.event}</div>}
              </div>
            )}
          </div>
        )}

        {/* Manual UUID Entry */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Manual Ticket Entry</h2>
          <form onSubmit={handleManualScan} style={{ display: 'flex', gap: 12 }}>
            <input
              value={manualUUID}
              onChange={e => setManualUUID(e.target.value)}
              placeholder="Paste ticket UUID..."
              style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '2px solid var(--gray-300)', fontSize: 14, fontFamily: 'monospace' }}
            />
            <button type="submit" className="btn btn-primary" disabled={scanning || !manualUUID.trim()}>
              {scanning ? '...' : 'Scan'}
            </button>
          </form>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>
            Paste the UUID from a customer's QR code to validate entry.
          </p>
        </div>
      </div>
    </div>
  );
}