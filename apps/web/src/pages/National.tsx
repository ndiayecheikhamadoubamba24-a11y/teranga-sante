import { CalendarCheck, Download, Microscope, Printer, Route, ShieldCheck, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SENEGAL_REGIONS, SENEGAL_VIEWBOX } from '../data/senegal';
import { downloadCsv, fmtNumber } from '../lib/format';
import { logAction, supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { ChartTip } from './CentreDashboard';

type Overview = {
  active_users: number;
  bookings: number;
  screenings: number;
  orientations: number;
  by_region: { region_id: number; name: string; count: number | null }[];
  by_month: { month: string; count: number }[];
  top_questions: { node_id: string; count: number }[];
};

// Séquentiel : une seule teinte (vert), du clair au foncé.
const RAMP = ['#DDEFD9', '#A6D3A4', '#62AD72', '#22834D', '#04472A'];
const TOPIC: Record<string, string> = { depister: 'Dépistage', positif: 'Traitement', proteger: 'Prévention', prep: 'PrEP', autotest: 'Autotest', fallback: 'Autres questions' };
const AXIS = { stroke: '#B8AE99', fontSize: 12, tickLine: false, axisLine: false } as const;

// A9 — Tableau de bord national (CNLS, district) : données anonymisées et agrégées.
export default function National() {
  const [months, setMonths] = useState(6);
  const [region, setRegion] = useState<number | ''>('');
  const [age, setAge] = useState('');
  const [data, setData] = useState<Overview | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [flash, setFlash] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data: d } = await supabase.rpc('national_overview', { p_months: months, p_region: region || null, p_age: age || null });
    setData(d as Overview);
  }, [months, region, age]);
  useEffect(() => { load(); }, [load]);

  // Boucle de démo : chaque réservation mobile fait monter la statistique de sa région en direct.
  useRealtime('booking_events', (c) => {
    setFlash(Number(c.new.region_id));
    setTimeout(() => setFlash(null), 3000);
    load();
  });

  const counts = useMemo(() => new Map((data?.by_region ?? []).map((r) => [r.region_id, r.count])), [data]);
  const max = Math.max(1, ...[...counts.values()].map((v) => v ?? 0));
  const color = (v: number | null | undefined) => (v == null ? 'url(#masked)' : RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length - 1e-9))]);
  const monthly = (data?.by_month ?? []).map((m) => ({ label: new Date(`${m.month}-01`).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), count: m.count }));
  const hovered = SENEGAL_REGIONS.find((r) => r.id === hover);

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`teranga-national-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Données anonymisées — valeurs < 5 masquées'],
      ['Indicateur', 'Valeur'],
      ['Utilisateurs actifs', data.active_users], ['Rendez-vous', data.bookings], ['Dépistages', data.screenings], ['Orientations', data.orientations],
      [],
      ['Région', 'Rendez-vous'],
      ...data.by_region.map((r) => [r.name, r.count ?? '< 5']),
      [],
      ['Mois', 'Rendez-vous'],
      ...data.by_month.map((m) => [m.month, m.count]),
    ]);
    logAction('national.export', 'national_overview', `${months}m`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Tableau de bord national</h1>
        <span className="pill good no-dot"><ShieldCheck size={14} /> Données anonymisées</span>
      </div>
      <div className="card row no-print" style={{ flexWrap: 'wrap', padding: 12 }}>
        <label className="row small"><strong>Période</strong>
          <select className="select" style={{ width: 'auto' }} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[3, 6, 12].map((m) => <option key={m} value={m}>{m} mois</option>)}
          </select>
        </label>
        <label className="row small"><strong>Région</strong>
          <select className="select" style={{ width: 'auto' }} value={region} onChange={(e) => setRegion(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Toutes</option>
            {[...SENEGAL_REGIONS].sort((a, b) => a.name.localeCompare(b.name)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <label className="row small"><strong>Âge</strong>
          <select className="select" style={{ width: 'auto' }} value={age} onChange={(e) => setAge(e.target.value)}>
            <option value="">Tous</option>
            {['18-24', '25-29', '30-35'].map((a) => <option key={a} value={a}>{a} ans</option>)}
          </select>
        </label>
        <span className="spacer" />
        <button className="btn light sm" onClick={() => window.print()}><Printer size={16} /> PDF</button>
        <button className="btn sm" onClick={exportCsv}><Download size={16} /> Exporter (Excel)</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '3fr 2fr' }}>
        <section className="card" style={{ position: 'relative' }}>
          <div className="card-head"><h2>Rendez-vous par région</h2><span className="small muted">{months} derniers mois</span></div>
          <svg viewBox={SENEGAL_VIEWBOX} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Carte du Sénégal : rendez-vous par région">
            <defs>
              <pattern id="masked" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#F3EEE3" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="#CFC6B5" strokeWidth="3" />
              </pattern>
            </defs>
            {SENEGAL_REGIONS.map((r) => (
              <path
                key={r.id}
                d={r.d}
                fill={color(counts.get(r.id))}
                stroke={hover === r.id || flash === r.id ? '#14213D' : '#FFFFFF'}
                strokeWidth={hover === r.id || flash === r.id ? 2.5 : 1.2}
                className={flash === r.id ? 'flash' : ''}
                style={{ cursor: 'pointer', transition: 'fill .4s', opacity: region && region !== r.id ? 0.35 : 1 }}
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setRegion(region === r.id ? '' : r.id)}
              >
                <title>{`${r.name} : ${counts.get(r.id) ?? 'moins de 5'} rendez-vous`}</title>
              </path>
            ))}
            {SENEGAL_REGIONS.map((r) => (
              <text key={r.id} x={r.cx} y={r.cy} textAnchor="middle" fontSize={r.id === 1 ? 9 : 12} fontWeight={600} fill="#14213D" pointerEvents="none" style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,.8)', strokeWidth: 3 }}>
                {r.name}
              </text>
            ))}
          </svg>
          {hovered && (
            <div className="chart-tooltip" style={{ position: 'absolute', top: 56, right: 18 }}>
              <div className="muted">{hovered.name}</div>
              <strong>{counts.get(hovered.id) ?? '< 5'}</strong> rendez-vous
            </div>
          )}
          <div className="row small" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <span className="muted">Moins</span>
            {RAMP.map((c) => <span key={c} style={{ width: 28, height: 10, background: c, borderRadius: 2 }} />)}
            <span className="muted">Plus (max {max})</span>
            <span className="spacer" />
            <span style={{ width: 16, height: 10, background: 'repeating-linear-gradient(45deg,#CFC6B5 0 2px,#F3EEE3 2px 5px)', borderRadius: 2 }} />
            <span className="muted">Masqué (effectif &lt; 5)</span>
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card">
            {[
              { icon: <Users size={20} />, v: data?.active_users, l: 'Utilisateurs actifs', c: 'var(--blue)' },
              { icon: <CalendarCheck size={20} />, v: data?.bookings, l: 'Rendez-vous', c: 'var(--green)' },
              { icon: <Microscope size={20} />, v: data?.screenings, l: 'Dépistages réalisés', c: 'var(--orange)' },
              { icon: <Route size={20} />, v: data?.orientations, l: 'Orientations par le chatbot', c: '#5b3fc4' },
            ].map((k) => (
              <div key={k.l} className="row" style={{ padding: '8px 0' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--cream)', color: k.c }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{k.v === undefined ? '—' : fmtNumber(k.v)}</div>
                  <div className="small muted">{k.l}</div>
                </div>
              </div>
            ))}
          </section>
          <section className="card">
            <h2 style={{ fontSize: 15, marginBottom: 8 }}>Top questions au chatbot</h2>
            {(data?.top_questions ?? []).length === 0 ? <span className="small muted">Pas encore de données.</span> : (
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
                {data!.top_questions.map((q) => <li key={q.node_id}><strong>{TOPIC[q.node_id] ?? q.node_id}</strong> <span className="muted small">({fmtNumber(q.count)})</span></li>)}
              </ol>
            )}
          </section>
        </div>
      </div>

      <section className="card">
        <div className="card-head"><h2>Évolution mensuelle des rendez-vous</h2><span className="small muted">toutes régions filtrées</span></div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={monthly} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#F1E8D6" vertical={false} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip content={<ChartTip unit="rendez-vous" />} cursor={{ stroke: '#B8AE99', strokeDasharray: '3 3' }} />
              <Line type="monotone" dataKey="count" stroke="#1F5FBF" strokeWidth={2} dot={{ r: 4, fill: '#1F5FBF', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="small muted" style={{ margin: '8px 0 0' }}>Données anonymisées et agrégées. Aucune région n’affiche un effectif inférieur à 5 pour éviter toute réidentification.</p>
      </section>
    </div>
  );
}
