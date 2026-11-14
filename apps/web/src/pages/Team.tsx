import { Activity, CalendarCheck, Clock, KeyRound, MessageCircle, Pencil, Power, ShieldOff, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NurseModal, ResetPasswordModal } from '../components/teamModals';
import { Empty, StatusPill, initials, useToast } from '../components/ui';
import { usePro } from '../lib/auth';
import { useCentre, useCentreId } from '../lib/centre';
import { timeAgo } from '../lib/format';
import { manageUsers } from '../lib/manageUsers';
import { supabase, type ProStatus } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';

type Stat = {
  id: string; display_name: string; role: 'nurse' | 'manager'; specialty: string | null; status: ProStatus; languages: string[];
  bookings_assigned: number; attended: number; no_show: number; bookings_handled: number;
  conversations: number; messages_sent: number; avg_response_min: number | null; slots_created: number; last_activity: string | null;
};
type Account = { id: string; email: string | null; last_sign_in_at: string | null; disabled: boolean; must_change_password?: boolean };
type FeedItem = { created_at: string; actor_id: string; display_name: string; role: string; action: string; entity: string | null };

const PERIODS = { 7: '7 derniers jours', 30: '30 derniers jours', 90: '3 derniers mois' } as const;

// Libellés lisibles des actions du journal (le travail de l'équipe).
const ACTIONS: [RegExp, string][] = [
  [/^booking\.attended$/, 'a accueilli un rendez-vous (venu)'],
  [/^booking\.no_show$/, 'a marqué un rendez-vous absent'],
  [/^booking\.confirmed$/, 'a confirmé un rendez-vous'],
  [/^booking\.cancelled$/, 'a annulé un rendez-vous'],
  [/^booking\.pending$/, 'a remis un rendez-vous en attente'],
  [/^bookings\.export$/, 'a exporté la liste des rendez-vous'],
  [/^slot\.create$/, 'a créé des créneaux'],
  [/^slot\.move$/, 'a déplacé un créneau'],
  [/^slot\.block$/, 'a bloqué un créneau'],
  [/^slot\.unblock$/, 'a débloqué un créneau'],
  [/^slot\.delete$/, 'a supprimé un créneau'],
  [/^slot\.update$/, 'a modifié un créneau'],
  [/^conversation\.claim$/, 'a pris en charge une conversation'],
  [/^conversation\.urgent\.true$/, 'a marqué une conversation urgente'],
  [/^conversation\.closed\.true$/, 'a clôturé une conversation'],
  [/^content\./, 'a mis à jour un contenu'],
  [/^stock\.update$/, 'a mis à jour un stock'],
  [/^alert\.stock_out$/, 'a signalé une rupture de stock'],
  [/^user\.create/, 'a créé un compte'],
  [/^user\.reset_password$/, 'a réinitialisé un mot de passe'],
  [/^user\./, 'a modifié un compte'],
  [/^auth\.login$/, 's’est connecté·e'],
  [/^auth\.password_changed$/, 'a changé son mot de passe'],
  [/^profile\.update$/, 'a mis à jour son profil'],
];
const describe = (a: string) => ACTIONS.find(([r]) => r.test(a))?.[1] ?? a;

// Équipe et activité d'un centre : responsable (son centre) et super admin (centre choisi dans l'en-tête).
export default function Team() {
  const me = usePro();
  const toast = useToast();
  const centreId = useCentreId();
  const { centreName } = useCentre();
  const [days, setDays] = useState<keyof typeof PERIODS>(30);
  const [stats, setStats] = useState<Stat[] | null>(null);
  const [accounts, setAccounts] = useState<Map<string, Account>>(new Map());
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [modal, setModal] = useState<{ kind: 'create' } | { kind: 'edit' | 'reset'; id: string } | null>(null);

  const load = useCallback(async () => {
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const [s, f] = await Promise.all([
      supabase.rpc('team_activity', { p_centre_id: centreId, p_from: from }),
      supabase.rpc('team_feed', { p_centre_id: centreId, p_limit: 40 }),
    ]);
    setStats((s.data as Stat[]) ?? []);
    setFeed((f.data as FeedItem[]) ?? []);
    // Emails, dernière connexion, comptes désactivés : via la fonction serveur (facultatif).
    manageUsers<{ users: Account[] }>({ action: 'list' })
      .then(({ users }) => setAccounts(new Map(users.map((u) => [u.id, u]))))
      .catch(() => setAccounts(new Map()));
  }, [centreId, days]);
  useEffect(() => { load(); }, [load]);
  useRealtime('pros', load, `centre_id=eq.${centreId}`);

  const nurses = useMemo(() => (stats ?? []).filter((m) => m.role === 'nurse'), [stats]);
  const totals = useMemo(() => {
    const t = { online: 0, attended: 0, messages: 0, resp: [] as number[] };
    for (const m of nurses) {
      if (m.status === 'online') t.online++;
      t.attended += Number(m.attended);
      t.messages += Number(m.messages_sent);
      if (m.avg_response_min != null) t.resp.push(Number(m.avg_response_min));
    }
    return { ...t, avgResp: t.resp.length ? Math.round(t.resp.reduce((a, b) => a + b, 0) / t.resp.length) : null };
  }, [nurses]);

  const canManage = (m: Stat) => m.role === 'nurse' && m.id !== me.id;
  const member = (id: string) => {
    const m = stats?.find((x) => x.id === id);
    return m ? { id: m.id, display_name: m.display_name, specialty: m.specialty, email: accounts.get(id)?.email ?? null } : null;
  };

  async function toggle(m: Stat, disabled: boolean) {
    if (!confirm(disabled ? `Réactiver le compte de ${m.display_name} ?` : `Désactiver le compte de ${m.display_name} ? Elle ne pourra plus se connecter.`)) return;
    try {
      await manageUsers({ action: disabled ? 'enable' : 'disable', id: m.id });
      toast('C’est fait');
      load();
    } catch (e) {
      toast((e as Error).message);
    }
  }

  const fmtResp = (v: number | null) => (v == null ? '—' : v < 60 ? `${v} min` : `${Math.floor(v / 60)} h ${String(v % 60).padStart(2, '0')}`);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Équipe · {centreName}</h1>
        <select className="select" style={{ width: 'auto' }} value={days} onChange={(e) => setDays(Number(e.target.value) as keyof typeof PERIODS)} aria-label="Période">
          {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(me.role === 'manager' || me.role === 'super_admin') && (
          <button className="btn" onClick={() => setModal({ kind: 'create' })}><UserPlus size={18} /> Ajouter une infirmière</button>
        )}
      </div>

      <div className="grid grid-4">
        <div className="kpi green"><div className="icon"><Users /></div><div className="value">{totals.online}/{nurses.length}</div><div className="label">Infirmières en ligne</div></div>
        <div className="kpi blue"><div className="icon"><CalendarCheck /></div><div className="value">{totals.attended}</div><div className="label">Rendez-vous accueillis</div></div>
        <div className="kpi orange"><div className="icon"><MessageCircle /></div><div className="value">{totals.messages}</div><div className="label">Messages envoyés aux jeunes</div></div>
        <div className="kpi violet"><div className="icon"><Clock /></div><div className="value">{fmtResp(totals.avgResp)}</div><div className="label">Délai moyen de réponse</div></div>
      </div>

      <section className="card" style={{ overflowX: 'auto' }}>
        <div className="card-head"><h2>Membres et activité</h2><span className="small muted">{PERIODS[days]}</span></div>
        {stats === null ? <span className="muted">Chargement…</span> : stats.length === 0 ? (
          <Empty title="Aucun membre dans ce centre" hint="Ajoute une première infirmière avec le bouton ci-dessus." />
        ) : (
          <table className="table compact">
            <thead>
              <tr>
                <th>Membre</th><th>Statut</th>
                <th>Rendez-vous</th>
                <th title="Actions sur les rendez-vous : confirmer, venu, absent, annuler">Actions RDV</th>
                <th>Conversations</th><th>Messages</th><th title="Délai moyen de réponse aux jeunes">Réponse</th><th>Créneaux</th><th>Activité</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((m) => {
                const acc = accounts.get(m.id);
                return (
                  <tr key={m.id} style={{ opacity: acc?.disabled ? 0.55 : 1 }}>
                    <td>
                      <div className="row">
                        <div className="avatar">{initials(m.display_name)}</div>
                        <div>
                          <strong>{m.display_name}</strong>
                          <div className="small muted" style={{ whiteSpace: 'nowrap' }}>{m.role === 'manager' ? 'Responsable' : m.specialty ?? 'Infirmière'} · {m.languages.map((l) => l.toUpperCase()).join(', ')}</div>
                          {acc?.email && <div className="small muted" title={acc.email} style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {acc?.disabled ? <span className="pill muted">Désactivé</span>
                        : acc?.must_change_password ? <span className="pill warning" title="Doit choisir son mot de passe personnel à la prochaine connexion">Provisoire</span>
                        : <StatusPill status={m.status} />}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {m.role === 'manager' ? <span className="muted">—</span> : <>
                        <strong>{m.bookings_assigned}</strong> <span className="small muted">attribués</span>
                        <div className="small"><span style={{ color: 'var(--green)' }}>{m.attended} venus</span> · <span style={{ color: 'var(--red)' }}>{m.no_show} absents</span></div>
                      </>}
                    </td>
                    <td><strong>{m.bookings_handled}</strong></td>
                    <td>{m.role === 'manager' ? <span className="muted">—</span> : <strong>{m.conversations}</strong>}</td>
                    <td>{m.role === 'manager' ? <span className="muted">—</span> : <strong>{m.messages_sent}</strong>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtResp(m.avg_response_min == null ? null : Number(m.avg_response_min))}</td>
                    <td><strong>{m.slots_created}</strong></td>
                    <td className="small" style={{ whiteSpace: 'nowrap' }}>{m.last_activity ? timeAgo(m.last_activity) : <span className="muted">Aucune</span>}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {canManage(m) && <>
                        <button className="icon-btn" title="Modifier" aria-label={`Modifier ${m.display_name}`} onClick={() => setModal({ kind: 'edit', id: m.id })}><Pencil size={17} /></button>
                        <button className="icon-btn" title="Nouveau mot de passe provisoire" aria-label={`Réinitialiser le mot de passe de ${m.display_name}`} onClick={() => setModal({ kind: 'reset', id: m.id })}><KeyRound size={17} /></button>
                        {acc?.disabled
                          ? <button className="icon-btn" title="Réactiver" aria-label={`Réactiver ${m.display_name}`} onClick={() => toggle(m, true)}><Power size={17} color="var(--green)" /></button>
                          : <button className="icon-btn" title="Désactiver" aria-label={`Désactiver ${m.display_name}`} onClick={() => toggle(m, false)}><ShieldOff size={17} color="var(--red)" /></button>}
                      </>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="small muted" style={{ margin: '12px 0 0' }}>
          Statistiques agrégées : le contenu des conversations et l’identité des jeunes ne sont jamais affichés ici.
        </p>
      </section>

      <section className="card">
        <div className="card-head"><h2><Activity size={18} style={{ verticalAlign: -3 }} /> Activité récente de l’équipe</h2></div>
        {feed.length === 0 ? <Empty title="Aucune activité enregistrée" /> : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {feed.map((f, i) => (
              <div key={i} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--cream-dark)' }}>
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(f.display_name)}</div>
                <span className="spacer"><strong>{f.display_name}</strong> {describe(f.action)}</span>
                <span className="small muted" title={new Date(f.created_at).toLocaleString('fr-FR')}>{timeAgo(f.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {modal?.kind === 'create' && <NurseModal member={null} centreId={centreId} centreName={centreName} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.kind === 'edit' && member(modal.id) && <NurseModal member={member(modal.id)} centreId={centreId} centreName={centreName} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.kind === 'reset' && member(modal.id) && <ResetPasswordModal member={member(modal.id)!} onClose={() => { setModal(null); load(); }} />}
    </div>
  );
}
