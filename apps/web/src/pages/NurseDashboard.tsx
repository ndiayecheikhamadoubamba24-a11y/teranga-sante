import { AlertTriangle, ArrowRight, BarChart3, CalendarDays, MessageCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { VillageStrip } from '../components/Decor';
import { Empty, StatusSelect, Youth, useToast } from '../components/ui';
import { useAuth, usePro } from '../lib/auth';
import { fmtTime, isoDate, SERVICE_LABEL, timeAgo } from '../lib/format';
import { supabase, type Booking, type Conversation } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';

type ConvRow = Conversation & { last?: string };

// A2 — Tableau de bord infirmière : rendez-vous du jour, messages non lus, urgences, statut.
export default function NurseDashboard() {
  const pro = usePro();
  const { setStatus } = useAuth();
  const toast = useToast();
  const [today, setToday] = useState<Booking[]>([]);
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [urgent, setUrgent] = useState(0);
  const [presence, setPresence] = useState<number | null>(null);

  const load = useCallback(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();

    const [b, c, u, g, p] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, slot:slots!inner(starts_at, ends_at)')
        .eq('centre_id', pro.centre_id!)
        .neq('status', 'cancelled')
        .gte('slot.starts_at', start.toISOString())
        .lt('slot.starts_at', end.toISOString()),
      supabase.from('conversations').select('*').eq('closed', false).or(`nurse_id.eq.${pro.id},nurse_id.is.null`).order('last_message_at', { ascending: false }).limit(4),
      supabase.from('messages').select('id, conversations!inner(nurse_id)', { count: 'exact', head: true }).is('read_at', null).neq('sender_id', pro.id).eq('conversations.nurse_id', pro.id),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('urgent', true).eq('closed', false).or(`nurse_id.eq.${pro.id},nurse_id.is.null`),
      supabase.from('bookings').select('status').eq('centre_id', pro.centre_id!).in('status', ['attended', 'no_show']).gte('updated_at', since),
    ]);

    const rows = ((b.data as Booking[]) ?? []).sort((x, y) => (x.slot!.starts_at < y.slot!.starts_at ? -1 : 1));
    setToday(rows);
    setUnread(u.count ?? 0);
    setUrgent(g.count ?? 0);
    const st = (p.data as { status: string }[]) ?? [];
    setPresence(st.length ? Math.round((100 * st.filter((s) => s.status === 'attended').length) / st.length) : null);

    const list = (c.data as Conversation[]) ?? [];
    const lasts = await Promise.all(
      list.map((cv) => supabase.from('messages').select('body, kind').eq('conversation_id', cv.id).order('created_at', { ascending: false }).limit(1).maybeSingle()),
    );
    setConvs(list.map((cv, i) => {
      const l = lasts[i].data as { body: string | null; kind: string } | null;
      return { ...cv, last: l?.kind === 'audio' ? '🎤 Message vocal' : l?.body ?? '' };
    }));
  }, [pro.centre_id, pro.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Boucle de démo : une réservation faite sur mobile apparaît en direct.
  useRealtime('bookings', (c) => {
    if (c.eventType === 'INSERT') toast(`Nouveau rendez-vous ${String(c.new.code)} réservé`, <CalendarDays size={18} />);
    load();
  }, `centre_id=eq.${pro.centre_id}`);
  useRealtime('messages', load);
  useRealtime('conversations', load);

  const upcoming = today.filter((b) => b.status !== 'attended' && b.status !== 'no_show').slice(0, 5);
  const todayStr = isoDate(new Date());

  return (
    <div className="page">
      <div className="grid grid-4">
        <div className="kpi green"><div className="icon"><CalendarDays /></div><div className="value">{today.length}</div><div className="label">Rdv du jour</div></div>
        <div className="kpi blue"><div className="icon"><MessageCircle /></div><div className="value">{unread}</div><div className="label">Messages non lus</div></div>
        <div className="kpi orange"><div className="icon"><AlertTriangle /></div><div className="value">{urgent}</div><div className="label">Demande{urgent > 1 ? 's' : ''} urgente{urgent > 1 ? 's' : ''}</div></div>
        <div className="kpi violet"><div className="icon"><BarChart3 /></div><div className="value">{presence === null ? '—' : `${presence}%`}</div><div className="label">Taux de présence (30 j)</div></div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Prochains rendez-vous</h2>
            <Link className="link" to={`/rendez-vous?date=${todayStr}`}>Voir tout <ArrowRight size={14} /></Link>
          </div>
          {upcoming.length === 0 ? (
            <Empty title="Aucun rendez-vous à venir aujourd’hui" hint="Les nouvelles réservations apparaîtront ici en direct." />
          ) : (
            <table className="table">
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id}>
                    <td className="code">{b.code}</td>
                    <td>{SERVICE_LABEL[b.service]}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtTime(b.slot!.starts_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Messages à traiter</h2>
            <Link className="link" to="/messagerie">Voir tout <ArrowRight size={14} /></Link>
          </div>
          {convs.length === 0 ? (
            <Empty title="Aucun message en attente" />
          ) : (
            convs.map((c) => (
              <Link key={c.id} to={`/messagerie?c=${c.id}`} className="list-item">
                <Youth alias={c.alias} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <strong>{c.alias}</strong>
                    {c.urgent && <span className="pill critical">Urgent</span>}
                    {!c.nurse_id && <span className="pill info no-dot">À prendre</span>}
                  </div>
                  <div className="small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last}</div>
                  <div className="small muted">{timeAgo(c.last_message_at)}</div>
                </div>
              </Link>
            ))
          )}
        </section>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        <VillageStrip height={110} />
        <div className="row" style={{ position: 'absolute', left: 18, top: 14, background: 'var(--white)', borderRadius: 999, padding: '6px 6px 6px 14px', boxShadow: 'var(--shadow)' }}>
          <strong className="small">Mon statut :</strong>
          <StatusSelect value={pro.status} onChange={setStatus} />
        </div>
      </div>
    </div>
  );
}
