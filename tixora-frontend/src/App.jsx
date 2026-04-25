import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import EventList from './pages/customer/EventList';
import EventDetail from './pages/customer/EventDetail';
import Checkout from './pages/customer/Checkout';
import MyTickets from './pages/customer/MyTickets';
import CustomerDashboard from './pages/customer/Dashboard';

import OrganizerDashboard from './pages/organizer/OrganizerDashboard';
import Scanner from './pages/admin/Scanner';

function Layout({ children }) {
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

          {/* Public */}
          <Route path="/" element={<Layout><EventList /></Layout>} />
          <Route path="/events/:slug" element={<Layout><EventDetail /></Layout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['customer']}>
              <Layout><CustomerDashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/checkout/:reference" element={
            <ProtectedRoute roles={['customer']}>
              <Layout><Checkout /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/my-tickets" element={
            <ProtectedRoute roles={['customer']}>
              <Layout><MyTickets /></Layout>
            </ProtectedRoute>
          } />

          {/* Organizer */}
          <Route path="/organizer" element={
            <ProtectedRoute roles={['organizer']}>
              <Layout><OrganizerDashboard /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <Scanner />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}