// src/pages/customer/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link }                from 'react-router-dom';
import api                     from '../../api/axios';
import { useAuth }             from '../../context/AuthContext';

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
    }).finally(() => setLoading(false));
  }, []);

  const activeTickets  = tickets.filter(t => t.status === 'active').length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const pendingOrders   = orders.filter(o => o.status === 'reserved').length;

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)', padding: '40px 24px' }}>
      <div className="container">
        <div className="page-header">
          <h1>Welcome back, {user?.full_name?.split(' ')[0]}! 👋</h1>
          <p>Your Tixora dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {[
            { label: 'Active Tickets',   value: activeTickets,   icon: '🎟️', color: 'var(--primary)' },
            { label: 'Confirmed Orders', value: confirmedOrders, icon: '✅', color: 'var(--success)' },
            { label: 'Pending Orders',   value: pendingOrders,   icon: '⏳', color: 'var(--warning)' },
            { label: 'Total Orders',     value: orders.length,   icon: '📋', color: 'var(--gray-700)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid-2">
          <div className="card">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link to="/" className="btn btn-primary">🔍 Browse Events</Link>
              <Link to="/my-tickets" className="btn btn-outline">🎟️ View My Tickets</Link>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Orders</h2>
            {orders.slice(0, 3).map(order => (
              <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-300)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{order.reference}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>KES {Number(order.total_amount).toLocaleString()}</div>
                </div>
                <span className={`badge ${order.status === 'confirmed' ? 'badge-success' : order.status === 'reserved' ? 'badge-warning' : 'badge-gray'}`}>
                  {order.status}
                </span>
              </div>
            ))}
            {orders.length === 0 && <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>No orders yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}