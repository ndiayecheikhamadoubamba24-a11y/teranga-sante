import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HOME_BY_ROLE, Layout } from './components/Layout';
import { ToastProvider } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import type { ProRole } from './lib/supabase';
const Agenda = lazy(() => import('./pages/Agenda'));
const Bookings = lazy(() => import('./pages/Bookings'));
const CentreDashboard = lazy(() => import('./pages/CentreDashboard'));
const Contents = lazy(() => import('./pages/Contents'));
const Help = lazy(() => import('./pages/Help'));
import Login from './pages/Login';
const Messages = lazy(() => import('./pages/Messages'));
const National = lazy(() => import('./pages/National'));
const NurseDashboard = lazy(() => import('./pages/NurseDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Reports = lazy(() => import('./pages/Reports'));
const StocksTeam = lazy(() => import('./pages/StocksTeam'));

/** Menu et accès adaptés au rôle. */
function Only({ roles, children }: { roles: ProRole[]; children: ReactNode }) {
  const { pro } = useAuth();
  if (!pro) return null;
  return roles.includes(pro.role) ? <Suspense fallback={null}>{children}</Suspense> : <Navigate to={HOME_BY_ROLE[pro.role]} replace />;
}

function Home() {
  const { pro, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={pro ? HOME_BY_ROLE[pro.role] : '/connexion'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/connexion" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/tableau-de-bord" element={<Only roles={['nurse']}><NurseDashboard /></Only>} />
              <Route path="/agenda" element={<Only roles={['nurse', 'manager']}><Agenda /></Only>} />
              <Route path="/rendez-vous" element={<Only roles={['nurse', 'manager']}><Bookings /></Only>} />
              <Route path="/messagerie" element={<Only roles={['nurse']}><Messages /></Only>} />
              <Route path="/contenus" element={<Only roles={['nurse', 'national_admin']}><Contents /></Only>} />
              <Route path="/centre" element={<Only roles={['manager']}><CentreDashboard /></Only>} />
              <Route path="/stocks" element={<Only roles={['manager']}><StocksTeam /></Only>} />
              <Route path="/national" element={<Only roles={['national_admin']}><National /></Only>} />
              <Route path="/signalements" element={<Only roles={['national_admin']}><Reports /></Only>} />
              <Route path="/profil" element={<Suspense fallback={null}><Profile /></Suspense>} />
              <Route path="/aide" element={<Suspense fallback={null}><Help /></Suspense>} />
            </Route>
            <Route path="*" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
