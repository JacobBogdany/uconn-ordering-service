import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext';
import { useDemo } from './context/DemoContext';
import Layout from './components/Layout';
import DemoLoginPage from './pages/DemoLoginPage';
import LocationsPage from './pages/LocationsPage';
import MenuPage from './pages/MenuPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import KDSPage from './pages/KDSPage';
import InventoryPage from './pages/InventoryPage';

function RequireSession() {
  const { demoAuth } = useDemo();
  return demoAuth ? <Outlet /> : <Navigate to="/login" replace />;
}

function RequireRole({ role, children }: { role: 'student' | 'staff'; children: ReactNode }) {
  const { demoAuth } = useDemo();
  if (!demoAuth) return <Navigate to="/login" replace />;
  return demoAuth.role === role ? children : <Navigate to={role === 'staff' ? '/staff/kds' : '/locations'} replace />;
}

function RoleHome() {
  const { demoAuth } = useDemo();
  return <Navigate to={demoAuth?.role === 'staff' ? '/staff/kds' : '/locations'} replace />;
}

export default function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<DemoLoginPage />} />
          <Route element={<RequireSession />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<RoleHome />} />
            <Route path="locations" element={<RequireRole role="student"><LocationsPage /></RequireRole>} />
            <Route path="locations/:locationId/menu" element={<RequireRole role="student"><MenuPage /></RequireRole>} />
            <Route path="order/:orderId" element={<RequireRole role="student"><OrderTrackingPage /></RequireRole>} />
            <Route path="staff/kds" element={<RequireRole role="staff"><KDSPage /></RequireRole>} />
            <Route path="staff/inventory" element={<RequireRole role="staff"><InventoryPage /></RequireRole>} />
          </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DemoProvider>
  );
}
