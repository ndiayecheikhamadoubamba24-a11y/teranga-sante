import type { BookingStatus, Lang, ProRole, ProStatus, Service } from './supabase';

export const SERVICE_LABEL: Record<Service, string> = {
  screening: 'Dépistage',
  counselling: 'Conseil',
  consultation: 'Consultation',
  prep: 'PrEP',
  selftest_pickup: 'Retrait autotest',
};

// Couleur d'agenda : suit la catégorie (3 familles, validées CVD avec libellé visible).
export const SERVICE_FAMILY: Record<Service, 'green' | 'orange' | 'blue'> = {
  screening: 'green',
  selftest_pickup: 'green',
  counselling: 'orange',
  consultation: 'blue',
  prep: 'blue',
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: 'Confirmé',
  pending: 'À venir',
  attended: 'Venu',
  no_show: 'Absent',
  cancelled: 'Annulé',
};

export const ROLE_LABEL: Record<ProRole, string> = {
  nurse: 'Infirmière',
  manager: 'Responsable de centre',
  national_admin: 'Administration nationale',
  super_admin: 'Super administrateur',
};

export const PRO_STATUS: Record<ProStatus, { label: string; tone: 'good' | 'warning' | 'muted' }> = {
  online: { label: 'En ligne', tone: 'good' },
  busy: { label: 'Occupée', tone: 'warning' },
  away: { label: 'Absente', tone: 'muted' },
};

export const LANG_LABEL: Record<Lang, string> = { fr: 'Français', wo: 'Wolof', ff: 'Pulaar' };

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const fmtDay = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
export const fmtNumber = (n: number) => n.toLocaleString('fr-FR');

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = new Date(iso);
  return Math.floor(s / 86400) < 7 ? d.toLocaleDateString('fr-FR', { weekday: 'short' }) : fmtDate(iso);
}

export function startOfWeek(d: Date) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
