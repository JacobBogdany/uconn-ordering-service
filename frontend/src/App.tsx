import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext';
import Layout from './components/Layout';
import LocationsPage from './pages/LocationsPage';
import MenuPage from './pages/MenuPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import KDSPage from './pages/KDSPage';
import InventoryPage from './pages/InventoryPage';

export default function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/locations" replace />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="locations/:locationId/menu" element={<MenuPage />} />
            <Route path="order/:orderId" element={<OrderTrackingPage />} />
            <Route path="staff/kds" element={<KDSPage />} />
            <Route path="staff/inventory" element={<InventoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DemoProvider>
  );
}
