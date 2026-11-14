import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HOME_BY_ROLE, Layout } from './components/Layout';
import { Empty, ToastProvider } from './components/ui';
import { useCentre } from './lib/centre';
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
const Users = lazy(() => import('./pages/admin/Users'));
const Team = lazy(() => import('./pages/Team'));
const Landing = lazy(() => import('./pages/site/Landing'));
const SiteArticles = lazy(() => import('./pages/site/Articles').then((m) => ({ default: m.ArticleList })));
const SiteArticle = lazy(() => import('./pages/site/Articles').then((m) => ({ default: m.ArticlePage })));
const Centres = lazy(() => import('./pages/admin/Centres'));
const Journal = lazy(() => import('./pages/admin/Journal'));

/** Menu et accès adaptés au rôle. */
function Only({ roles, children }: { roles: ProRole[]; children: ReactNode }) {
  const { pro } = useAuth();
  if (!pro) return null;
  return roles.includes(pro.role) ? <Suspense fallback={null}>{children}</Suspense> : <Navigate to={HOME_BY_ROLE[pro.role]} replace />;
}

/** Pages liées à un centre : il faut au moins un centre (cas du super admin sur une base vide). */
function NeedCentre({ children }: { children: ReactNode }) {
  const { centreId } = useCentre();
  if (!centreId) return <div className="page"><Empty title="Aucun centre" hint="Crée d’abord un centre dans « Centres »." /></div>;
  return children;
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
            {/* Site vitrine public */}
            <Route path="/" element={<Suspense fallback={null}><Landing /></Suspense>} />
            <Route path="/conseils" element={<Suspense fallback={null}><SiteArticles category="conseil" /></Suspense>} />
            <Route path="/publications" element={<Suspense fallback={null}><SiteArticles category="actualite" /></Suspense>} />
            <Route path="/article/:id" element={<Suspense fallback={null}><SiteArticle /></Suspense>} />
            {/* Espace professionnel */}
            <Route path="/connexion" element={<Login />} />
            <Route path="/espace" element={<Home />} />
            <Route element={<Layout />}>
              <Route path="/tableau-de-bord" element={<Only roles={['nurse']}><NurseDashboard /></Only>} />
              <Route path="/agenda" element={<Only roles={['nurse', 'manager', 'super_admin']}><NeedCentre><Agenda /></NeedCentre></Only>} />
              <Route path="/rendez-vous" element={<Only roles={['nurse', 'manager', 'super_admin']}><NeedCentre><Bookings /></NeedCentre></Only>} />
              <Route path="/messagerie" element={<Only roles={['nurse']}><Messages /></Only>} />
              <Route path="/contenus" element={<Only roles={['nurse', 'national_admin', 'super_admin']}><Contents /></Only>} />
              <Route path="/centre" element={<Only roles={['manager', 'super_admin']}><NeedCentre><CentreDashboard /></NeedCentre></Only>} />
              <Route path="/stocks" element={<Only roles={['manager', 'super_admin']}><NeedCentre><StocksTeam /></NeedCentre></Only>} />
              <Route path="/national" element={<Only roles={['national_admin', 'super_admin']}><National /></Only>} />
              <Route path="/signalements" element={<Only roles={['national_admin', 'super_admin']}><Reports /></Only>} />
              <Route path="/equipe" element={<Only roles={['manager', 'super_admin']}><NeedCentre><Team /></NeedCentre></Only>} />
              <Route path="/admin/utilisateurs" element={<Only roles={['super_admin']}><Users /></Only>} />
              <Route path="/admin/centres" element={<Only roles={['super_admin']}><Centres /></Only>} />
              <Route path="/admin/journal" element={<Only roles={['super_admin']}><Journal /></Only>} />
              <Route path="/profil" element={<Suspense fallback={null}><Profile /></Suspense>} />
              <Route path="/aide" element={<Suspense fallback={null}><Help /></Suspense>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
