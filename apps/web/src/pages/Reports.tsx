import { AlertCircle, Bell, CheckCircle2, MessageSquareReply, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Empty, useToast } from '../components/ui';
import { SENEGAL_REGIONS, SENEGAL_VIEWBOX } from '../data/senegal';
import { usePro } from '../lib/auth';
import { timeAgo } from '../lib/format';
import { logAction, supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';

type RStatus = 'new' | 'assigned' | 'answered' | 'closed';
type Report = { id: string; category: string; body: string; region_id: number | null; status: RStatus; assigned_to: string | null; response: string | null; created_at: string };
type Alert = { id: string; kind: string; message: string; status: RStatus; created_at: string; centre: { name: string; region_id: number } | null };

const STATUS: Record<RStatus, { label: string; tone: string }> = {
  new: { label: 'Nouveau', tone: 'warning' },
  assigned: { label: 'En cours', tone: 'info' },
  answered: { label: 'Répondu', tone: 'good' },
  closed: { label: 'Clôturé', tone: 'muted' },
};
const CATEGORY: Record<string, string> = {
  discrimination: 'Discrimination', soins: 'Refus ou mauvais accueil', confidentialite: 'Atteinte à la confidentialité', violence: 'Violence', autre: 'Autre',
};
const regionName = (id: number | null | undefined) => SENEGAL_REGIONS.find((r) => r.id === id)?.name ?? 'Région inconnue';

// A10 — Signalements anonymes et alertes (CNLS, associations).
export default function Reports() {
  const pro = usePro();
  const toast = useToast();
  const [tab, setTab] = useState<'reports' | 'alerts'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<RStatus | 'open' | ''>('open');
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');

  const load = useCallback(async () => {
    const [r, a] = await Promise.all([
      supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('alerts').select('*, centre:centres(name, region_id)').order('created_at', { ascending: false }).limit(200),
    ]);
    setReports((r.data as Report[]) ?? []);
    setAlerts((a.data as Alert[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtime('reports', load);
  useRealtime('alerts', load);

  const list = useMemo(() => {
    const src = tab === 'reports' ? reports : alerts;
    return src.filter((x) => (filter === 'open' ? x.status !== 'closed' : filter ? x.status === filter : true));
  }, [tab, reports, alerts, filter]);
  const current = list.find((x) => x.id === selected) ?? list[0] ?? null;
  useEffect(() => setAnswer(tab === 'reports' ? (current as Report | null)?.response ?? '' : ''), [current, tab]);

  const pins = useMemo(() => {
    const m = new Map<number, number>();
    for (const x of list) {
      const rid = tab === 'reports' ? (x as Report).region_id : (x as Alert).centre?.region_id;
      if (rid) m.set(rid, (m.get(rid) ?? 0) + 1);
    }
    return m;
  }, [list, tab]);

  async function update(patch: Record<string, unknown>, action: string) {
    if (!current) return;
    const table = tab === 'reports' ? 'reports' : 'alerts';
    const { error } = await supabase.from(table).update(patch).eq('id', current.id);
    if (error) return toast(error.message);
    logAction(`${table}.${action}`, table, current.id);
    toast('Mis à jour');
    load();
  }

  const title = (x: Report | Alert) => (tab === 'reports' ? CATEGORY[(x as Report).category] ?? (x as Report).category : (x as Alert).message);
  const where = (x: Report | Alert) => (tab === 'reports' ? regionName((x as Report).region_id) : (x as Alert).centre?.name ?? 'National');

  return (
    <div className="page">
      <div className="page-head">
        <h1>Signalements et alertes</h1>
        <select className="select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value as RStatus | 'open' | '')} aria-label="Filtrer par statut">
          <option value="open">À traiter</option>
          <option value="">Tous</option>
          {(Object.keys(STATUS) as RStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <section className="card">
          <div className="tabs" style={{ marginBottom: 8 }}>
            <button className={tab === 'reports' ? 'active' : ''} onClick={() => { setTab('reports'); setSelected(null); }}>Signalements ({reports.filter((r) => r.status !== 'closed').length})</button>
            <button className={tab === 'alerts' ? 'active' : ''} onClick={() => { setTab('alerts'); setSelected(null); }}>Alertes ({alerts.filter((r) => r.status !== 'closed').length})</button>
          </div>
          {list.length === 0 && <Empty title="Rien à traiter" hint="Les nouveaux signalements apparaîtront ici en direct." />}
          {list.map((x) => (
            <button key={x.id} className="list-item" onClick={() => setSelected(x.id)} style={{ width: '100%', border: 0, textAlign: 'left', background: current?.id === x.id ? 'var(--cream)' : 'transparent' }}>
              {tab === 'reports' ? <AlertCircle size={20} color="var(--red)" /> : <Bell size={20} color="var(--orange)" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title(x)}</strong>
                <span className="small muted">{where(x)} · {timeAgo(x.created_at)}</span>
              </div>
              <span className={`pill ${STATUS[x.status].tone}`}>{STATUS[x.status].label}</span>
            </button>
          ))}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card" style={{ padding: 12 }}>
            <svg viewBox={SENEGAL_VIEWBOX} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Localisation des signalements par région">
              {SENEGAL_REGIONS.map((r) => <path key={r.id} d={r.d} fill="#E9F3E4" stroke="#fff" strokeWidth={1.2} />)}
              {SENEGAL_REGIONS.filter((r) => pins.has(r.id)).map((r) => (
                <g key={r.id} transform={`translate(${r.cx} ${r.cy})`}>
                  <path d="M0 0 C-10 -14 -14 -20 -14 -28 A14 14 0 1 1 14 -28 C14 -20 10 -14 0 0 Z" fill="#E53935" stroke="#fff" strokeWidth={2} />
                  <text y={-23} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">{pins.get(r.id)}</text>
                  <title>{`${r.name} : ${pins.get(r.id)}`}</title>
                </g>
              ))}
            </svg>
          </section>

          {current && (
            <section className="card">
              <div className="row" style={{ marginBottom: 8 }}>
                <h2 className="spacer" style={{ fontSize: 16 }}>{title(current)}</h2>
                <span className={`pill ${STATUS[current.status].tone}`}>{STATUS[current.status].label}</span>
              </div>
              <div className="small muted" style={{ marginBottom: 8 }}>{where(current)} · {new Date(current.created_at).toLocaleString('fr-FR')}</div>
              {tab === 'reports' && (
                <>
                  <p style={{ background: 'var(--cream)', padding: 12, borderRadius: 12, margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{(current as Report).body}</p>
                  <div className="field">
                    <label htmlFor="ans">Réponse et orientation (visible par la personne, sans donnée personnelle)</label>
                    <textarea id="ans" className="textarea" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Ex : Merci pour ton signalement. Tu peux contacter l’association … pour un accompagnement juridique gratuit." />
                  </div>
                </>
              )}
              <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                {current.status === 'new' && <button className="btn blue sm" onClick={() => update(tab === 'reports' ? { status: 'assigned', assigned_to: pro.id } : { status: 'assigned' }, 'assign')}><UserCheck size={16} /> Assigner</button>}
                {tab === 'reports' && current.status !== 'closed' && <button className="btn sm" disabled={!answer.trim()} onClick={() => update({ status: 'answered', response: answer.trim(), assigned_to: pro.id }, 'answer')}><MessageSquareReply size={16} /> Répondre</button>}
                {current.status !== 'closed'
                  ? <button className="btn orange sm" onClick={() => update({ status: 'closed' }, 'close')}><CheckCircle2 size={16} /> Clôturer</button>
                  : <button className="btn light sm" onClick={() => update({ status: 'assigned' }, 'reopen')}>Rouvrir</button>}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
