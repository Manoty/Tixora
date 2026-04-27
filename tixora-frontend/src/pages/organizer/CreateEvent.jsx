import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';

/* ── Section wrapper ────────────────────────────────── */
function Section({ step, title, description, children }) {
  return (
    <div style={{ display: 'flex', gap: 32 }} className="form-section">
      {/* Step indicator */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width:          40,
          height:         40,
          borderRadius:   '50%',
          background:     'var(--surface-dark)',
          color:          '#fff',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontFamily:     'var(--font-display)',
          fontWeight:     800,
          fontSize:       15,
          flexShrink:     0,
        }}>
          {step}
        </div>
        <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 8 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 40 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{
            fontFamily:    'var(--font-display)',
            fontSize:      18,
            fontWeight:    700,
            letterSpacing: '-0.02em',
            marginBottom:  4,
          }}>
            {title}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{description}</p>
        </div>
        <div className="card" style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Ticket Type Builder Row ─────────────────────────── */
function TicketTypeRow({ ticket, index, onChange, onRemove, canRemove }) {
  const set = (key) => (e) => onChange(index, key, e.target.value);

  return (
    <div style={{
      padding:      '20px',
      border:       '1.5px solid var(--border)',
      borderRadius: 'var(--r)',
      background:   'rgba(17,17,24,0.02)',
      position:     'relative',
    }}>
      {/* Row header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{
          fontFamily:    'var(--font-display)',
          fontWeight:    700,
          fontSize:      13,
          color:         'var(--text-secondary)',
        }}>
          Ticket Type {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            style={{
              background:   'none',
              border:       '1.5px solid var(--border-strong)',
              borderRadius: 'var(--r-sm)',
              padding:      '4px 10px',
              fontSize:     12,
              color:        'var(--danger)',
              cursor:       'pointer',
              fontFamily:   'var(--font-display)',
              fontWeight:   600,
            }}
          >
            Remove
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Name */}
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input
            className="form-input"
            placeholder="e.g. Regular, VIP, Early Bird"
            value={ticket.name}
            onChange={set('name')}
            required
          />
        </div>

        {/* Price */}
        <div className="form-group">
          <label className="form-label">Price (KES) *</label>
          <input
            type="number"
            min="0"
            className="form-input"
            placeholder="0"
            value={ticket.price}
            onChange={set('price')}
            required
          />
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label className="form-label">Total Quantity *</label>
          <input
            type="number"
            min="1"
            className="form-input"
            placeholder="100"
            value={ticket.total_quantity}
            onChange={set('total_quantity')}
            required
          />
        </div>

        {/* Max per order */}
        <div className="form-group">
          <label className="form-label">Max Per Order</label>
          <input
            type="number"
            min="1"
            max="20"
            className="form-input"
            placeholder="5"
            value={ticket.max_per_order}
            onChange={set('max_per_order')}
          />
          <span className="form-hint">Anti-scalping limit</span>
        </div>

        {/* Description - full width */}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Description</label>
          <input
            className="form-input"
            placeholder="What's included? e.g. General admission, access to all sessions"
            value={ticket.description}
            onChange={set('description')}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */
const EMPTY_TICKET = {
  name: '', price: '', total_quantity: '',
  max_per_order: '5', description: '',
};

export default function CreateEvent() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title:       '',
    description: '',
    venue:       '',
    city:        '',
    start_date:  '',
    end_date:    '',
    status:      'draft',
    category_id: '',
  });

  const [tickets,    setTickets]    = useState([{ ...EMPTY_TICKET }]);
  const [categories, setCategories] = useState([]);
  const [errors,     setErrors]     = useState({});
  const [loading,    setLoading]    = useState(false);
  const [step,       setStep]       = useState('details'); // details | tickets | review

  useEffect(() => {
    api.get('/events/categories/')
      .then(r => setCategories(r.data || []))
      .catch(() => {});
  }, []);

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  /* ── Ticket handlers ──────────────────────────────── */
  const updateTicket = (index, key, value) => {
    setTickets(prev => prev.map((t, i) => i === index ? { ...t, [key]: value } : t));
  };

  const addTicket = () => {
    if (tickets.length >= 5) return;
    setTickets(prev => [...prev, { ...EMPTY_TICKET }]);
  };

  const removeTicket = (index) => {
    setTickets(prev => prev.filter((_, i) => i !== index));
  };

  /* ── Submit ───────────────────────────────────────── */
  const handleSubmit = async (publish = false) => {
    setLoading(true);
    setErrors({});

    try {
      // Step 1: Create the event
      const eventPayload = {
        ...form,
        status: publish ? 'published' : 'draft',
      };
      if (!eventPayload.category_id) delete eventPayload.category_id;

      const { data: event } = await api.post('/events/manage/', eventPayload);

      // Step 2: Create ticket types
      const ticketPromises = tickets
        .filter(t => t.name && t.price && t.total_quantity)
        .map(t => api.post(`/events/manage/${event.id}/ticket-types/`, {
          name:           t.name,
          price:          parseFloat(t.price),
          total_quantity: parseInt(t.total_quantity),
          max_per_order:  parseInt(t.max_per_order) || 5,
          description:    t.description,
        }));

      await Promise.all(ticketPromises);

      navigate(`/organizer?created=${event.slug}`);

    } catch (err) {
      const data = err.response?.data;
      setErrors(data?.details || data || {});
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key) => errors[key] ? (
    <span className="form-error">
      {Array.isArray(errors[key]) ? errors[key][0] : errors[key]}
    </span>
  ) : null;

  /* ── Date helpers: min date = today ──────────────── */
  const todayISO = new Date().toISOString().slice(0, 16);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>

      {/* ── Header ──────────────────────────────────── */}
      <div style={{
        background:  'var(--surface-dark)',
        padding:     '32px 32px 40px',
        position:    'relative',
        overflow:    'hidden',
      }}>
        <div style={{
          position:        'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize:  '28px 28px',
          pointerEvents:   'none',
        }} />
        <div style={{ position: 'relative' }} className="container">
          <Link
            to="/organizer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 16, fontWeight: 500 }}
          >
            ← Back to Dashboard
          </Link>
          <h1 style={{
            fontFamily:    'var(--font-display)',
            fontSize:      'clamp(22px, 4vw, 32px)',
            fontWeight:    800,
            color:         '#fff',
            letterSpacing: '-0.03em',
            marginBottom:  6,
          }}>
            Create New Event
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Fill in the details below. You can save as draft and publish later.
          </p>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────── */}
      <div className="container" style={{ padding: '0 32px', marginTop: 40 }}>

        {/* Global errors */}
        {(errors.error || errors.non_field_errors) && (
          <div className="alert alert-danger" style={{ marginBottom: 24 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            {errors.error || errors.non_field_errors}
          </div>
        )}

        <div style={{ maxWidth: 760 }}>

          {/* ── Section 1: Event Details ─────────── */}
          <Section
            step="1"
            title="Event Details"
            description="The basics — name, venue, and when it happens"
          >
            {/* Title */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Event Title *</label>
              <input
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="e.g. Nairobi Tech Summit 2025"
                value={form.title}
                onChange={setField('title')}
                required
                style={{ fontSize: 16, height: 52 }}
              />
              {fieldError('title')}
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Description *</label>
              <textarea
                className={`form-input ${errors.description ? 'error' : ''}`}
                placeholder="Tell attendees what to expect. What's the event about? Who should come? What's included?"
                value={form.description}
                onChange={setField('description')}
                rows={4}
                style={{ height: 'auto', padding: '14px 16px', resize: 'vertical', lineHeight: 1.6 }}
                required
              />
              {fieldError('description')}
            </div>

            {/* Category */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={form.category_id}
                onChange={setField('category_id')}
              >
                <option value="">Select a category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Venue + City */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
              <div className="form-group">
                <label className="form-label">Venue *</label>
                <input
                  className={`form-input ${errors.venue ? 'error' : ''}`}
                  placeholder="e.g. KICC, Sarit Centre"
                  value={form.venue}
                  onChange={setField('venue')}
                  required
                />
                {fieldError('venue')}
              </div>
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  className={`form-input ${errors.city ? 'error' : ''}`}
                  placeholder="e.g. Nairobi, Mombasa"
                  value={form.city}
                  onChange={setField('city')}
                  required
                />
                {fieldError('city')}
              </div>
            </div>
          </Section>

          {/* ── Section 2: Date & Time ───────────── */}
          <Section
            step="2"
            title="Date & Time"
            description="When does the event start and end?"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  className={`form-input ${errors.start_date ? 'error' : ''}`}
                  value={form.start_date}
                  onChange={setField('start_date')}
                  min={todayISO}
                  required
                />
                {fieldError('start_date')}
              </div>
              <div className="form-group">
                <label className="form-label">End Date & Time *</label>
                <input
                  type="datetime-local"
                  className={`form-input ${errors.end_date ? 'error' : ''}`}
                  value={form.end_date}
                  onChange={setField('end_date')}
                  min={form.start_date || todayISO}
                  required
                />
                {fieldError('end_date')}
              </div>
            </div>

            {/* Duration preview */}
            {form.start_date && form.end_date && (
              <div style={{
                marginTop:     16,
                padding:       '12px 16px',
                background:    'rgba(17,17,24,0.04)',
                borderRadius:  'var(--r)',
                fontSize:      13,
                color:         'var(--text-secondary)',
                display:       'flex',
                alignItems:    'center',
                gap:           8,
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {(() => {
                  const diff = new Date(form.end_date) - new Date(form.start_date);
                  if (diff <= 0) return 'End date must be after start date';
                  const hours = Math.round(diff / 36e5);
                  const days  = Math.floor(hours / 24);
                  const rem   = hours % 24;
                  return days > 0
                    ? `Duration: ${days} day${days > 1 ? 's' : ''}${rem > 0 ? ` ${rem}h` : ''}`
                    : `Duration: ${hours} hour${hours !== 1 ? 's' : ''}`;
                })()}
              </div>
            )}
          </Section>

          {/* ── Section 3: Ticket Types ──────────── */}
          <Section
            step="3"
            title="Ticket Types"
            description="Add one or more ticket tiers — Regular, VIP, Early Bird, etc."
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tickets.map((ticket, index) => (
                <TicketTypeRow
                  key={index}
                  ticket={ticket}
                  index={index}
                  onChange={updateTicket}
                  onRemove={removeTicket}
                  canRemove={tickets.length > 1}
                />
              ))}

              {/* Add ticket type button */}
              {tickets.length < 5 && (
                <button
                  type="button"
                  onClick={addTicket}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent: 'center',
                    gap:           8,
                    padding:       '14px',
                    border:        '1.5px dashed var(--border-strong)',
                    borderRadius:  'var(--r)',
                    background:    'transparent',
                    color:         'var(--text-secondary)',
                    fontFamily:    'var(--font-display)',
                    fontWeight:    600,
                    fontSize:      14,
                    cursor:        'pointer',
                    transition:    'all var(--t-fast)',
                    width:         '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Add Another Ticket Type
                </button>
              )}

              {/* Revenue preview */}
              {tickets.some(t => t.price && t.total_quantity) && (
                <div style={{
                  padding:      '16px',
                  background:   'rgba(17,17,24,0.03)',
                  borderRadius: 'var(--r)',
                  borderLeft:   '3px solid var(--brand)',
                }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Revenue Potential
                  </div>
                  {tickets.filter(t => t.name && t.price && t.total_quantity).map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {t.name} ({Number(t.total_quantity).toLocaleString()} × KES {Number(t.price).toLocaleString()})
                      </span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        KES {(t.total_quantity * t.price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Max Revenue</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--brand)', fontSize: 16 }}>
                      KES {tickets.filter(t => t.price && t.total_quantity).reduce((s, t) => s + (t.price * t.total_quantity), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── CTA Buttons ──────────────────────── */}
          <div style={{
            position:   'sticky',
            bottom:     0,
            background: 'rgba(247,245,239,0.95)',
            backdropFilter: 'blur(12px)',
            borderTop:  '1px solid var(--border)',
            padding:    '16px 0',
            zIndex:     10,
          }}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Link to="/organizer" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                style={{ minWidth: 140 }}
              >
                {loading ? 'Saving...' : '💾 Save as Draft'}
              </button>
              <button
                type="button"
                className="btn btn-brand btn-lg"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                style={{ minWidth: 180 }}
              >
                {loading
                  ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Publishing...</>
                  : '🚀 Publish Event'
                }
              </button>
            </div>

            <p style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Draft events are not visible to the public. Publish when ready.
            </p>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .form-section { flex-direction: column; gap: 12px; }
        }
      `}</style>
    </div>
  );
}
