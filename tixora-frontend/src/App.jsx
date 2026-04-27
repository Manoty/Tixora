import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }   from './context/AuthContext';
import ProtectedRoute     from './components/ProtectedRoute';
import Navbar             from './components/Navbar';

// Auth
import Login              from './pages/auth/Login';
import Register           from './pages/auth/Register';

// Customer
import EventList          from './pages/customer/EventList';
import EventDetail        from './pages/customer/EventDetail';
import Checkout           from './pages/customer/Checkout';
import MyTickets          from './pages/customer/MyTickets';
import CustomerDashboard  from './pages/customer/Dashboard';

// Organizer
import OrganizerDashboard from './pages/organizer/OrganizerDashboard';

// Admin
import Scanner            from './pages/admin/Scanner';

/* Scanner has its own full-screen layout — no Navbar */
function WithNav({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Public ────────────────────────── */}
          <Route path="/"              element={<WithNav><EventList /></WithNav>} />
          <Route path="/events/:slug"  element={<WithNav><EventDetail /></WithNav>} />
          <Route path="/login"         element={<Login />} />
          <Route path="/register"      element={<Register />} />

          {/* ── Customer ──────────────────────── */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['customer']}>
              <WithNav><CustomerDashboard /></WithNav>
            </ProtectedRoute>
          } />
          <Route path="/checkout/:reference" element={
            <ProtectedRoute roles={['customer']}>
              <WithNav><Checkout /></WithNav>
            </ProtectedRoute>
          } />
          <Route path="/my-tickets" element={
            <ProtectedRoute roles={['customer']}>
              <WithNav><MyTickets /></WithNav>
            </ProtectedRoute>
          } />
          <Route path="/tickets/order/:reference" element={
            <ProtectedRoute roles={['customer']}>
              <WithNav><MyTickets /></WithNav>
            </ProtectedRoute>
          } />

          {/* ── Organizer ─────────────────────── */}
          <Route path="/organizer" element={
            <ProtectedRoute roles={['organizer']}>
              <WithNav><OrganizerDashboard /></WithNav>
            </ProtectedRoute>
          } />

          {/* ── Admin — full screen, no Navbar ── */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <Scanner />
            </ProtectedRoute>
          } />

          {/* ── Fallback ──────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
