import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

/* ── Result display ─────────────────────────────────── */
function ScanResult({ result }) {
  if (!result) return null;

  const config = {
    success:        { bg: '#052E16', border: '#059669', color: '#34D399', icon: '✓', headline: 'ADMITTED',    sub: null },
    already_used:   { bg: '#450A0A', border: '#DC2626', color: '#F87171', icon: '✗', headline: 'DENIED',      sub: 'Already scanned' },
    invalid_ticket: { bg: '#450A0A', border: '#DC2626', color: '#F87171', icon: '✗', headline: 'INVALID',     sub: 'QR code not found' },
    wrong_event:    { bg: '#451A03', border: '#D97706', color: '#FBBF24', icon: '!', headline: 'WRONG EVENT', sub: null },
    expired:        { bg: '#450A0A', border: '#DC2626', color: '#F87171', icon: '✗', headline: 'EXPIRED',     sub: 'Event has ended' },
    cancelled:      { bg: '#450A0A', border: '#DC2626', color: '#F87171', icon: '✗', headline: 'CANCELLED',   sub: 'Ticket cancelled' },
    error:          { bg: '#1C1C1C', border: '#6B7280', color: '#9CA3AF', icon: '?', headline: 'ERROR',       sub: null },
  };

  const c = config[result.result] || config.error;

  return (
    <div style={{
      background:    c.bg,
      border:        `2px solid ${c.border}`,
      borderRadius:  'var(--r-xl)',
      padding:       '36px 32px',
      textAlign:     'center',
      animation:     'fadeIn 0.25s ease',
    }}>
      {/* Icon circle */}
      <div style={{
        width:          80, height: 80,
        borderRadius:   '50%',
        border:         `3px solid ${c.border}`,
        display:        'flex', alignItems: 'center', justifyContent: 'center',
        margin:         '0 auto 20px',
        fontSize:       36,
        color:          c.color,
        fontWeight:     700,
      }}>
        {c.icon}
      </div>

      {/* Headline */}
      <div style={{
        fontFamily:    'var(--font-display)',
        fontSize:      32,
        fontWeight:    800,
        letterSpacing: '0.04em',
        color:         c.color,
        marginBottom:  8,
      }}>
        {c.headline}
      </div>

      {/* Message */}
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: c.sub ? 4 : 0 }}>
        {result.message}
      </div>
      {c.sub && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{c.sub}</div>
      )}

      {/* Ticket info */}
      {result.ticket_info && Object.keys(result.ticket_info).length > 0 && (
        <div style={{
          marginTop:     24,
          background:    'rgba(255,255,255,0.05)',
          borderRadius:  'var(--r)',
          padding:       '16px',
          textAlign:     'left',
          display:       'flex',
          flexDirection: 'column',
          gap:           8,
        }}>
          {[
            { k: 'owner_name',   label: 'Name'   },
            { k: 'ticket_type',  label: 'Type'   },
            { k: 'event',        label: 'Event'  },
            { k: 'event_date',   label: 'Date'   },
          ].filter(f => result.ticket_info[f.k]).map(f => (
            <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                {f.label}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600, textAlign: 'right' }}>
                {result.ticket_info[f.k]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Scan log entry ─────────────────────────────────── */
function LogEntry({ entry, index }) {
  const colors = {
    success:        '#34D399',
    already_used:   '#F87171',
    invalid_ticket: '#F87171',
    wrong_event:    '#FBBF24',
    error:          '#6B7280',
  };
  const color = colors[entry.result] || colors.error;

  return (
    <div style={{
      display:     'flex',
      alignItems:  'center',
      gap:         12,
      padding:     '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      animation:   index === 0 ? 'slideIn 0.2s ease' : 'none',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          {entry.result.replace(/_/g, ' ')}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.uuid}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{entry.time}</div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────── */
export default function Scanner() {
  const { user }                    = useAuth();
  const [uuid,       setUuid]       = useState('');
  const [result,     setResult]     = useState(null);
  const [scanning,   setScanning]   = useState(false);
  const [eventId,    setEventId]    = useState('');
  const [events,     setEvents]     = useState([]);
  const [log,        setLog]        = useState([]);
  const [stats,      setStats]      = useState({ admitted: 0, denied: 0, invalid: 0 });
  const inputRef                    = useRef(null);

  useEffect(() => {
    api.get('/events/manage/').then(r => setEvents(r.data.events || [])).catch(() => {});
    inputRef.current?.focus();
  }, []);

  const processUUID = async (rawUuid) => {
    if (!rawUuid?.trim() || scanning) return;
    const u = rawUuid.trim();
    setScanning(true);
    setResult(null);

    try {
      const payload = { ticket_uuid: u };
      if (eventId) payload.event_id = eventId;
      const { data } = await api.post('/checkins/scan/', payload);

      setResult(data);

      // Update stats
      setStats(prev => ({
        admitted: prev.admitted + (data.admitted ? 1 : 0),
        denied:   prev.denied   + (!data.admitted && data.result !== 'invalid_ticket' ? 1 : 0),
        invalid:  prev.invalid  + (data.result === 'invalid_ticket' ? 1 : 0),
      }));

      // Add to log
      setLog(prev => [{
        uuid:   u.length > 20 ? u.substring(0, 8) + '...' : u,
        result: data.result,
        time:   new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }, ...prev.slice(0, 19)]);

    } catch (err) {
      setResult({
        result:   'error',
        admitted: false,
        message:  err.response?.data?.error || 'Scan failed. Check connection.',
      });
    } finally {
      setScanning(false);
      setUuid('');
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    processUUID(uuid);
  };

  const totalScans = stats.admitted + stats.denied + stats.invalid;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A12', color: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ───────────────────────────────── */}
      <div style={{
        background:    'rgba(255,255,255,0.04)',
        borderBottom:  '1px solid rgba(255,255,255,0.08)',
        padding:       '0 24px',
        height:        56,
        display:       'flex',
        alignItems:    'center',
        justifyContent: 'space-between',
        flexShrink:    0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M3 10a7 7 0 1014 0A7 7 0 003 10z" stroke="#fff" strokeWidth="1.5"/>
              <path d="M8 7.5l5 2.5-5 2.5V7.5z" fill="#fff"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
            Tixora <span style={{ opacity: 0.4, fontWeight: 400 }}>Gate Scanner</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#34D399', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', animation: 'pulse 2s ease-in-out infinite' }} />
            LIVE
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            {user?.full_name || user?.email}
          </span>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: 0 }} className="scanner-grid">

        {/* ── Main scan area ───────────────────── */}
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Event selector */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
              Event
            </label>
            <select
              value={eventId}
              onChange={e => setEventId(e.target.value)}
              style={{
                flex:          1, maxWidth: 400,
                padding:       '9px 14px',
                borderRadius:  'var(--r)',
                border:        '1px solid rgba(255,255,255,0.12)',
                background:    'rgba(255,255,255,0.06)',
                color:         '#fff',
                fontSize:      13,
                fontFamily:    'var(--font-display)',
                cursor:        'pointer',
                outline:       'none',
              }}
            >
              <option value="" style={{ background: '#1A1A26' }}>All Events</option>
              {events.map(e => (
                <option key={e.id} value={e.id} style={{ background: '#1A1A26' }}>{e.title}</option>
              ))}
            </select>
          </div>

          {/* Scan result */}
          <div style={{ minHeight: 280 }}>
            {scanning ? (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 'var(--r-xl)',
                padding: '60px 32px',
                textAlign: 'center',
                border: '2px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ width: 48, height: 48, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-display)' }}>Validating...</div>
              </div>
            ) : result ? (
              <ScanResult result={result} />
            ) : (
              <div style={{
                background:   'rgba(255,255,255,0.02)',
                borderRadius: 'var(--r-xl)',
                padding:      '60px 32px',
                textAlign:    'center',
                border:       '2px dashed rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ margin: '0 auto' }}>
                    <rect x="4" y="4" width="20" height="20" rx="2" stroke="white" strokeWidth="2"/>
                    <rect x="32" y="4" width="20" height="20" rx="2" stroke="white" strokeWidth="2"/>
                    <rect x="4" y="32" width="20" height="20" rx="2" stroke="white" strokeWidth="2"/>
                    <rect x="8" y="8" width="12" height="12" rx="1" fill="white" opacity="0.4"/>
                    <rect x="36" y="8" width="12" height="12" rx="1" fill="white" opacity="0.4"/>
                    <rect x="8" y="36" width="12" height="12" rx="1" fill="white" opacity="0.4"/>
                    <path d="M32 32h4v4h-4zM40 32h4v4h-4zM36 36h4v4h-4zM32 40h4v4h-4zM40 40h4v4h-4z" fill="white" opacity="0.4"/>
                  </svg>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                  Ready to Scan
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>
                  Paste a UUID below or use a QR scanner
                </div>
              </div>
            )}
          </div>

          {/* Manual entry form */}
          <form onSubmit={handleSubmit}>
            <div style={{
              display:       'flex',
              gap:           10,
              background:    'rgba(255,255,255,0.05)',
              borderRadius:  'var(--r-lg)',
              padding:       10,
              border:        '1px solid rgba(255,255,255,0.1)',
            }}>
              <input
                ref={inputRef}
                value={uuid}
                onChange={e => setUuid(e.target.value)}
                placeholder="Paste ticket UUID or scan QR code..."
                autoComplete="off"
                style={{
                  flex:       1,
                  background: 'none',
                  border:     'none',
                  outline:    'none',
                  color:      '#fff',
                  fontSize:   14,
                  fontFamily: 'monospace',
                  padding:    '8px 12px',
                }}
              />
              <button
                type="submit"
                disabled={scanning || !uuid.trim()}
                className="btn btn-brand"
                style={{ flexShrink: 0 }}
              >
                {scanning ? 'Scanning...' : 'Validate →'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8, textAlign: 'center' }}>
              Works with USB QR scanners — they auto-submit on scan
            </p>
          </form>
        </div>

        {/* ── Sidebar ───────────────────────────── */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>

          {/* Session stats */}
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
              Session Stats
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Admitted', value: stats.admitted, color: '#34D399' },
                { label: 'Denied',   value: stats.denied,   color: '#F87171' },
                { label: 'Invalid',  value: stats.invalid,  color: '#6B7280' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    {s.label}
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: s.color }}>
                    {s.value}
                  </span>
                </div>
              ))}
              {totalScans > 0 && (
                <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                    Admission rate
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width:  `${Math.round((stats.admitted / totalScans) * 100)}%`,
                      background: '#34D399',
                      borderRadius: 99,
                    }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#34D399', fontWeight: 700, marginTop: 4, textAlign: 'right' }}>
                    {Math.round((stats.admitted / totalScans) * 100)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scan log */}
          <div style={{ flex: 1, padding: '20px 24px', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              Scan Log
            </div>
            {log.length === 0 ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '24px 0' }}>
                No scans yet this session
              </div>
            ) : (
              <div style={{ overflow: 'auto', maxHeight: 400 }}>
                {log.map((entry, i) => <LogEntry key={i} entry={entry} index={i} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
        @media (max-width: 768px) {
          .scanner-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
