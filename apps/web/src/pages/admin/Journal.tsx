import { Download, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Empty } from '../../components/ui';
import { downloadCsv, ROLE_LABEL } from '../../lib/format';
import { logAction, supabase, type ProRole } from '../../lib/supabase';

type Entry = { id: number; actor_id: string | null; action: string; entity: string | null; entity_id: string | null; created_at: string };
type Actor = { id: string; display_name: string; role: ProRole };

const PAGE = 50;
const FAMILIES: Record<string, string> = {
  'auth.': 'Connexions', 'booking': 'Rendez-vous', 'bookings.': 'Exports', 'slot.': 'Agenda', 'content.': 'Contenus', 'conversation.': 'Messagerie',
  'stock.': 'Stocks', 'alert': 'Alertes', 'reports.': 'Signalements', 'alerts.': 'Alertes', 'user.': 'Comptes', 'team.': 'Comptes', 'centre.': 'Centres',
  'national.': 'Exports', 'profile.': 'Profil',
};
const family = (a: string) => Object.entries(FAMILIES).find(([k]) => a.startsWith(k))?.[1] ?? 'Autres';

// Super admin — journal d'activité (exigence « Accès sécurisé et traçable »).
export default function Journal() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [actors, setActors] = useState<Map<string, Actor>>(new Map());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [q, setQ] = useState('');
  const [actor, setActor] = useState('');
  const [fam, setFam] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    supabase.from('pros').select('id, display_name, role').then(({ data }) => setActors(new Map(((data as Actor[]) ?? []).map((a) => [a.id, a]))));
  }, []);

  const load = useCallback(async () => {
    let req = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE);
    if (actor) req = req.eq('actor_id', actor);
    if (q.trim()) req = req.ilike('action', `%${q.trim()}%`);
    if (from) req = req.gte('created_at', `${from}T00:00:00`);
    if (to) req = req.lte('created_at', `${to}T23:59:59`);
    const { data } = await req;
    const list = (data as Entry[]) ?? [];
    setHasMore(list.length > PAGE);
    setRows(list.slice(0, PAGE));
  }, [page, actor, q, from, to]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => setPage(0), [actor, q, from, to]);

  const visible = useMemo(() => (fam ? rows.filter((r) => family(r.action) === fam) : rows), [rows, fam]);
  const who = (id: string | null) => (id ? actors.get(id) : undefined);

  const exportCsv = () => {
    downloadCsv(`journal-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Date', 'Utilisateur', 'Rôle', 'Action', 'Objet', 'Identifiant'],
      ...visible.map((r) => [new Date(r.created_at).toLocaleString('fr-FR'), who(r.actor_id)?.display_name ?? r.actor_id ?? 'Système', who(r.actor_id) ? ROLE_LABEL[who(r.actor_id)!.role] : '', r.action, r.entity, r.entity_id]),
    ]);
    logAction('journal.export', 'activity_log', String(visible.length));
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Journal d’activité</h1>
        <button className="btn sm" onClick={exportCsv}><Download size={16} /> Exporter</button>
      </div>
      <section className="card">
        <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <label className="search"><Search size={16} /><input placeholder="Action (ex : booking, export)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher une action" /></label>
          <select className="select" style={{ width: 'auto' }} value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Utilisateur">
            <option value="">Tous les utilisateurs</option>
            {[...actors.values()].sort((a, b) => a.display_name.localeCompare(b.display_name)).map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={fam} onChange={(e) => setFam(e.target.value)} aria-label="Type d’action">
            <option value="">Toutes les actions</option>
            {[...new Set(Object.values(FAMILIES))].sort().map((f) => <option key={f}>{f}</option>)}
          </select>
          <input className="input" type="date" style={{ width: 'auto' }} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Du" />
          <input className="input" type="date" style={{ width: 'auto' }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="Au" />
        </div>
        {visible.length === 0 ? <Empty title="Aucune action enregistrée" hint="Les connexions, modifications et exports apparaîtront ici." /> : (
          <table className="table">
            <thead><tr><th>Date</th><th>Utilisateur</th><th>Type</th><th>Action</th><th>Objet</th></tr></thead>
            <tbody>
              {visible.map((r) => {
                const a = who(r.actor_id);
                return (
                  <tr key={r.id}>
                    <td className="small" style={{ whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })}</td>
                    <td><strong>{a?.display_name ?? 'Système'}</strong>{a && <div className="small muted">{ROLE_LABEL[a.role]}</div>}</td>
                    <td><span className="pill muted no-dot">{family(r.action)}</span></td>
                    <td><code style={{ fontSize: 12 }}>{r.action}</code></td>
                    <td className="small muted">{[r.entity, r.entity_id].filter(Boolean).join(' · ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="pager">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
          <button className="active">{page + 1}</button>
          <button disabled={!hasMore} onClick={() => setPage(page + 1)}>›</button>
        </div>
      </section>
    </div>
  );
}
