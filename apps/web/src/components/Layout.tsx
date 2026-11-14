import {
  BarChart3, Bell, Building2, CalendarDays, ClipboardList, FileText, HelpCircle, Home, LayoutDashboard, Lock, LogOut, MessageCircle, Package, ScrollText, ShieldAlert,
  User, Users,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ROLE_LABEL } from '../lib/format';
import { supabase, type ProRole } from '../lib/supabase';
import { CentreProvider, useCentre } from '../lib/centre';
import { useRealtime } from '../lib/useRealtime';
import { initials, Logo, StatusSelect, useToast } from './ui';

type Item = { to: string; label: string; icon: ReactNode; badge?: 'messages' };

export const HOME_BY_ROLE: Record<ProRole, string> = { nurse: '/tableau-de-bord', manager: '/centre', national_admin: '/national', super_admin: '/national' };

/** Pages liées à un centre : le super admin choisit le centre dans l'en-tête. */
const CENTRE_PAGES = ['/agenda', '/rendez-vous', '/centre', '/stocks'];

const MENUS: Record<ProRole, Item[]> = {
  nurse: [
    { to: '/tableau-de-bord', label: 'Accueil', icon: <Home size={18} /> },
    { to: '/agenda', label: 'Agenda', icon: <CalendarDays size={18} /> },
    { to: '/rendez-vous', label: 'Rendez-vous', icon: <ClipboardList size={18} /> },
    { to: '/messagerie', label: 'Messagerie', icon: <MessageCircle size={18} />, badge: 'messages' },
    { to: '/contenus', label: 'Contenus', icon: <FileText size={18} /> },
  ],
  manager: [
    { to: '/centre', label: 'Accueil', icon: <Home size={18} /> },
    { to: '/agenda', label: 'Agenda', icon: <CalendarDays size={18} /> },
    { to: '/rendez-vous', label: 'Rendez-vous', icon: <ClipboardList size={18} /> },
    { to: '/stocks', label: 'Stocks et équipe', icon: <Package size={18} /> },
  ],
  national_admin: [
    { to: '/national', label: 'Accueil', icon: <BarChart3 size={18} /> },
    { to: '/signalements', label: 'Signalements', icon: <ShieldAlert size={18} /> },
    { to: '/contenus', label: 'Contenus', icon: <FileText size={18} /> },
  ],
  super_admin: [
    { to: '/national', label: 'Vue nationale', icon: <BarChart3 size={18} /> },
    { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: <Users size={18} /> },
    { to: '/admin/centres', label: 'Centres', icon: <Building2 size={18} /> },
    { to: '/centre', label: 'Tableau de centre', icon: <LayoutDashboard size={18} /> },
    { to: '/agenda', label: 'Agendas', icon: <CalendarDays size={18} /> },
    { to: '/rendez-vous', label: 'Rendez-vous', icon: <ClipboardList size={18} /> },
    { to: '/stocks', label: 'Stocks et équipes', icon: <Package size={18} /> },
    { to: '/signalements', label: 'Signalements', icon: <ShieldAlert size={18} /> },
    { to: '/contenus', label: 'Contenus', icon: <FileText size={18} /> },
    { to: '/admin/journal', label: 'Journal d’activité', icon: <ScrollText size={18} /> },
  ],
};

/** Nombre de messages non lus pour l'infirmière connectée. */
function useUnread(enabled: boolean, userId: string | undefined) {
  const [n, setN] = useState(0);
  const load = useCallback(async () => {
    if (!enabled || !userId) return;
    const { count } = await supabase
      .from('messages')
      .select('id, conversations!inner(nurse_id)', { count: 'exact', head: true })
      .is('read_at', null)
      .neq('sender_id', userId)
      .eq('conversations.nurse_id', userId);
    setN(count ?? 0);
  }, [enabled, userId]);
  useEffect(() => {
    load();
  }, [load]);
  useRealtime('messages', load, undefined, enabled);
  return n;
}

/** Sélecteur de centre (super admin uniquement, sur les pages liées à un centre). */
function CentreSwitcher() {
  const { canSwitch, centres, centreId, setCentreId } = useCentre();
  const { pathname } = useLocation();
  if (!canSwitch || !CENTRE_PAGES.some((p) => pathname.startsWith(p))) return null;
  return (
    <label className="row small" style={{ gap: 6 }}>
      <Building2 size={16} />
      <select className="select" style={{ width: 'auto', padding: '6px 10px' }} value={centreId ?? ''} onChange={(e) => setCentreId(e.target.value)} aria-label="Centre affiché">
        {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  );
}

export function Layout() {
  const { loading, session, pro, setStatus, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isNurse = pro?.role === 'nurse';
  const unread = useUnread(isNurse, pro?.id);
  const [alerts, setAlerts] = useState(0);

  // Alertes du centre / nationales (cloche)
  const loadAlerts = useCallback(async () => {
    if (!pro) return;
    const { count } = await supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('status', 'new');
    setAlerts(count ?? 0);
  }, [pro]);
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);
  useRealtime('alerts', (c) => {
    loadAlerts();
    if (c.eventType === 'INSERT') toast(`Alerte : ${String(c.new.message ?? '')}`, <Bell size={18} />);
  }, undefined, !!pro);

  if (loading) return null;
  if (!session || !pro || pro.must_change_password) return <Navigate to="/connexion" replace />;

  const subtitle = [ROLE_LABEL[pro.role], pro.centre?.name].filter(Boolean).join(' • ');
  const homeAlerts = pro.role === 'national_admin' || pro.role === 'super_admin' ? '/signalements' : pro.role === 'manager' ? '/stocks' : HOME_BY_ROLE[pro.role];

  return (
    <CentreProvider>
    <div className="shell">
      <aside className="sidebar">
        <div className="logo"><Logo size={130} light /></div>
        <nav className="nav" aria-label="Menu principal">
          {MENUS[pro.role].map((m) => (
            <NavLink key={m.to} to={m.to}>
              {m.icon}
              <span className="label">{m.label}</span>
              {m.badge === 'messages' && unread > 0 && <span className="count">{unread}</span>}
            </NavLink>
          ))}
          <NavLink to="/profil"><User size={18} /><span className="label">Profil</span></NavLink>
          <NavLink to="/aide"><HelpCircle size={18} /><span className="label">Aide</span></NavLink>
          <button onClick={async () => { await signOut(); navigate('/connexion'); }}>
            <LogOut size={18} /><span className="label">Déconnexion</span>
          </button>
        </nav>
        <div className="secure"><Lock size={14} /><span>Accès sécurisé et traçable</span></div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="who">
            <div className="avatar">{initials(pro.display_name)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="name">{pro.display_name}</div>
              <div className="sub">{subtitle}</div>
            </div>
          </div>
          <CentreSwitcher />
          {(pro.role === 'nurse' || pro.role === 'manager') && <StatusSelect value={pro.status} onChange={setStatus} />}
          <button className="icon-btn" aria-label={`${alerts} alerte(s)`} onClick={() => navigate(homeAlerts)}>
            <Bell size={20} />
            {alerts > 0 && <span className="dot-badge">{alerts}</span>}
          </button>
          <span className="pill muted no-dot" title="Langue de l’interface">FR</span>
        </header>
        <Outlet />
      </div>
    </div>
    </CentreProvider>
  );
}
