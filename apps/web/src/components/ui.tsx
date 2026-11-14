import { UserRound, X } from 'lucide-react';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { PRO_STATUS } from '../lib/format';
import type { ProStatus } from '../lib/supabase';
import { Baobi } from './Baobi';

/** Logo officiel complet (empilé). `size` = largeur en px. */
export function Logo({ size = 120 }: { size?: number }) {
  return <img src="/logo.png" width={size} height={Math.round(size * 0.979)} alt="Teranga Santé" style={{ display: 'block' }} />;
}

/** Version horizontale pour les bandeaux : emblème + nom aux couleurs du logo. */
export function LogoInline({ height = 44, light }: { height?: number; light?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.18 }} aria-label="Teranga Santé">
      <img src="/logo-mark.png" alt="" height={height} width={Math.round(height * 1.586)} style={{ display: 'block' }} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.95, fontWeight: 800, fontSize: height * 0.4, letterSpacing: -0.3 }}>
        <span style={{ color: light ? '#FFFFFF' : '#076236' }}>Teranga</span>
        <span style={{ color: light ? '#F8B400' : '#E85A05' }}>Santé</span>
      </span>
    </span>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row">
          <h2 className="spacer">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
    <div className="modal-back" style={{ zIndex: 39, background: 'rgba(20,33,61,.25)' }} onClick={onClose} />
    <aside className="drawer" aria-label={title}>
      <div className="row">
        <h2 className="spacer" style={{ fontSize: 18 }}>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
      </div>
      {children}
    </aside>
    </>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <Baobi size={70} />
      <strong style={{ color: 'var(--ink)' }}>{title}</strong>
      {hint && <span className="small">{hint}</span>}
    </div>
  );
}

export function StatusPill({ status }: { status: ProStatus }) {
  const s = PRO_STATUS[status];
  return <span className={`pill ${s.tone}`}>{s.label}</span>;
}

export function StatusSelect({ value, onChange }: { value: ProStatus; onChange: (s: ProStatus) => void }) {
  const tone = PRO_STATUS[value].tone;
  return (
    <label className={`pill ${tone}`} style={{ padding: '2px 4px 2px 10px' }}>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>Mon statut</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProStatus)}
        style={{ border: 0, background: 'transparent', fontWeight: 600, fontSize: 12, color: 'inherit', cursor: 'pointer' }}
      >
        {(Object.keys(PRO_STATUS) as ProStatus[]).map((k) => (
          <option key={k} value={k}>{PRO_STATUS[k].label}</option>
        ))}
      </select>
    </label>
  );
}

// ---------- Notifications temps réel (toasts) ----------
type Toast = { id: number; text: string; icon?: ReactNode };
const ToastCtx = createContext<(text: string, icon?: ReactNode) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, icon?: ReactNode) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.icon}<span>{t.text}</span></div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Pictogramme neutre pour un jeune anonyme (couleur stable dérivée de son code). */
export function Youth({ alias }: { alias: string | null }) {
  const palette = ['#FFE7A3', '#DDE9FA', '#E3F2E1', '#FDE3D2'];
  const n = [...(alias ?? '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <div className="avatar" style={{ background: palette[n % palette.length] }} aria-hidden="true">
      <UserRound size={20} color="#14213D" />
    </div>
  );
}

export function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}
