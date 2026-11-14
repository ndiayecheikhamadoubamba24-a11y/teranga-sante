import { AlertTriangle, Microscope, Stethoscope, UserMinus, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Empty } from '../components/ui';
import { usePro } from '../lib/auth';
import { useCentre, useCentreId } from '../lib/centre';
import { isoDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';

type Stats = {
  screenings: number;
  consultations: number;
  no_show_rate: number;
  new_users: number;
  by_weekday: { dow: number; count: number }[];
  by_nurse: { name: string; count: number }[];
};
type Alert = { id: string; message: string; kind: string; created_at: string };

const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const PERIODS = { month: 'Ce mois-ci', last: 'Mois dernier', quarter: '3 derniers mois' } as const;
type Period = keyof typeof PERIODS;

// Axes et grille discrets ; une seule série par graphique (pas de légende, le titre la nomme).
const AXIS = { stroke: '#B8AE99', fontSize: 12, tickLine: false, axisLine: false } as const;

function range(p: Period) {
  const now = new Date();
  if (p === 'month') return [new Date(now.getFullYear(), now.getMonth(), 1), now];
  if (p === 'last') return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)];
  return [new Date(now.getFullYear(), now.getMonth() - 2, 1), now];
}

export function ChartTip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="muted">{label}</div>
      <strong>{payload[0].value}</strong> {unit}
    </div>
  );
}

// A7 — Tableau de bord du responsable de centre.
export default function CentreDashboard() {
  usePro();
  const centreId = useCentreId();
  const { centreName } = useCentre();
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const load = useCallback(async () => {
    const [from, to] = range(period);
    const [s, a] = await Promise.all([
      supabase.rpc('centre_stats', { p_from: isoDate(from), p_to: isoDate(to), p_centre_id: centreId }),
      supabase.from('alerts').select('*').eq('centre_id', centreId).in('status', ['new', 'assigned']).order('created_at', { ascending: false }).limit(3),
    ]);
    setStats(s.data as Stats);
    setAlerts((a.data as Alert[]) ?? []);
  }, [period, centreId]);
  useEffect(() => { load(); }, [load]);
  useRealtime('bookings', load, `centre_id=eq.${centreId}`);
  useRealtime('alerts', load, `centre_id=eq.${centreId}`);

  const freq = useMemo(() => (stats?.by_weekday ?? []).map((d) => ({ day: DOW[d.dow - 1], count: d.count })), [stats]);
  const load_ = stats?.by_nurse ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <h1>{centreName}</h1>
        <select className="select" style={{ width: 'auto' }} value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Période">
          {(Object.keys(PERIODS) as Period[]).map((p) => <option key={p} value={p}>{PERIODS[p]}</option>)}
        </select>
      </div>

      <div className="grid grid-4">
        <div className="kpi green"><div className="icon"><Microscope /></div><div className="value">{stats?.screenings ?? '—'}</div><div className="label">Dépistages</div></div>
        <div className="kpi blue"><div className="icon"><Stethoscope /></div><div className="value">{stats?.consultations ?? '—'}</div><div className="label">Consultations</div></div>
        <div className="kpi orange"><div className="icon"><UserMinus /></div><div className="value">{stats ? `${stats.no_show_rate}%` : '—'}</div><div className="label">Absences</div></div>
        <div className="kpi violet"><div className="icon"><UserPlus /></div><div className="value">{stats?.new_users ?? '—'}</div><div className="label">Nouveaux usagers</div></div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <div className="card-head"><h2>Fréquentation par jour</h2><span className="small muted">rendez-vous non annulés</span></div>
          <div style={{ height: 230 }}>
            <ResponsiveContainer>
              <LineChart data={freq} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#F1E8D6" vertical={false} />
                <XAxis dataKey="day" {...AXIS} />
                <YAxis allowDecimals={false} {...AXIS} />
                <Tooltip content={<ChartTip unit="rendez-vous" />} cursor={{ stroke: '#B8AE99', strokeDasharray: '3 3' }} />
                <Line type="monotone" dataKey="count" stroke="#1F5FBF" strokeWidth={2} dot={{ r: 4, fill: '#1F5FBF', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><h2>Charge par infirmière</h2><span className="small muted">rendez-vous attribués</span></div>
          {load_.length === 0 ? <Empty title="Aucune infirmière dans l’équipe" /> : (
            <div style={{ height: 230 }}>
              <ResponsiveContainer>
                <BarChart data={load_} margin={{ top: 10, right: 16, left: -16, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid stroke="#F1E8D6" vertical={false} />
                  <XAxis dataKey="name" {...AXIS} />
                  <YAxis allowDecimals={false} {...AXIS} />
                  <Tooltip content={<ChartTip unit="rendez-vous" />} cursor={{ fill: 'rgba(30,123,60,0.06)' }} />
                  <Bar dataKey="count" fill="#076236" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {alerts.map((a) => (
        <Link key={a.id} to="/stocks" className="banner critical">
          <AlertTriangle size={18} color="var(--red)" /> <strong>Alerte :</strong> {a.message}
          <span className="spacer" /><span className="small muted">{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
        </Link>
      ))}
    </div>
  );
}
