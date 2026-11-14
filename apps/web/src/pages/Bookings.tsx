import { CalendarClock, Check, Download, Eye, Filter, Search, UserCheck, UserX, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Drawer, Empty, useToast } from '../components/ui';
import { usePro } from '../lib/auth';
import { useCentreId } from '../lib/centre';
import { downloadCsv, fmtDate, fmtTime, SERVICE_LABEL, STATUS_LABEL } from '../lib/format';
import { logAction, supabase, type Booking, type BookingStatus, type Service } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';

const TONE: Record<BookingStatus, string> = { confirmed: 'good', pending: 'warning', attended: 'info', no_show: 'critical', cancelled: 'muted' };
const PAGE = 10;

// A4 — Gestion des rendez-vous : tableau filtrable, recherche par code anonyme, actions.
export default function Bookings() {
  usePro();
  const centreId = useCentreId();
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Booking[]>([]);
  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(!!params.get('date'));
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [service, setService] = useState<Service | ''>('');
  const [from, setFrom] = useState(params.get('date') ?? '');
  const [to, setTo] = useState(params.get('date') ?? '');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, slot:slots(starts_at, ends_at)')
      .eq('centre_id', centreId)
      .order('created_at', { ascending: false })
      .limit(500);
    const list = ((data as Booking[]) ?? []).sort((a, b) => (a.slot!.starts_at < b.slot!.starts_at ? -1 : 1));
    setRows(list);
    setOpen((o) => (o ? list.find((x) => x.id === o.id) ?? null : null));
  }, [centreId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime('bookings', load, `centre_id=eq.${centreId}`);

  const filtered = useMemo(() => rows.filter((b) => {
    const day = b.slot!.starts_at.slice(0, 10);
    if (q && !b.code.toLowerCase().includes(q.toLowerCase().trim())) return false;
    if (status && b.status !== status) return false;
    if (service && b.service !== service) return false;
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }), [rows, q, status, service, from, to]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const visible = filtered.slice(page * PAGE, page * PAGE + PAGE);
  useEffect(() => setPage(0), [q, status, service, from, to]);

  const exportCsv = () => {
    downloadCsv(`rendez-vous-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Code', 'Date', 'Heure', 'Service', 'Statut'],
      ...filtered.map((b) => [b.code, fmtDate(b.slot!.starts_at), fmtTime(b.slot!.starts_at), SERVICE_LABEL[b.service], STATUS_LABEL[b.status]]),
    ]);
    logAction('bookings.export', 'bookings', String(filtered.length));
  };

  return (
    <div className="page">
      <div className="page-head"><h1>Gestion des rendez-vous</h1></div>
      <section className="card">
        <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <label className="search">
            <Search size={16} />
            <input placeholder="Rechercher par code…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher par code" />
          </label>
          <span className="spacer" />
          <button className={`btn sm ${showFilters ? '' : 'outline'}`} onClick={() => setShowFilters(!showFilters)}><Filter size={16} /> Filtrer</button>
          <button className="btn sm" onClick={exportCsv}><Download size={16} /> Exporter</button>
        </div>
        {showFilters && (
          <div className="grid grid-4" style={{ gap: 12, marginBottom: 12 }}>
            <div className="field"><label htmlFor="fs">Statut</label>
              <select id="fs" className="select" value={status} onChange={(e) => setStatus(e.target.value as BookingStatus | '')}>
                <option value="">Tous</option>
                {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="fsv">Service</label>
              <select id="fsv" className="select" value={service} onChange={(e) => setService(e.target.value as Service | '')}>
                <option value="">Tous</option>
                {(Object.keys(SERVICE_LABEL) as Service[]).map((s) => <option key={s} value={s}>{SERVICE_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="ff">Du</label><input id="ff" className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="field"><label htmlFor="ft">Au</label><input id="ft" className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
        )}

        {visible.length === 0 ? (
          <Empty title="Aucun rendez-vous" hint={q ? `Aucun code ne correspond à « ${q} ».` : 'Modifie les filtres ou attends les prochaines réservations.'} />
        ) : (
          <table className="table">
            <thead><tr><th>Code</th><th>Date</th><th>Heure</th><th>Service</th><th>Statut</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {visible.map((b) => (
                <tr key={b.id}>
                  <td className="code">{b.code}</td>
                  <td>{fmtDate(b.slot!.starts_at)}</td>
                  <td>{fmtTime(b.slot!.starts_at)}</td>
                  <td style={{ fontWeight: 600 }}>{SERVICE_LABEL[b.service]}</td>
                  <td><span className={`pill ${TONE[b.status]}`}>{STATUS_LABEL[b.status]}</span></td>
                  <td style={{ textAlign: 'right' }}><button className="icon-btn" aria-label={`Voir ${b.code}`} onClick={() => setOpen(b)}><Eye size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <div className="pager">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} className={i === page ? 'active' : ''} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
          </div>
        )}
      </section>
      {open && <BookingDrawer booking={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}

type FreeSlot = { id: string; starts_at: string; service: Service; remaining: number };

function BookingDrawer({ booking, onClose, onChanged }: { booking: Booking; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [slots, setSlots] = useState<FreeSlot[] | null>(null);
  const [target, setTarget] = useState('');

  const setStatus = async (status: BookingStatus) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', booking.id);
    if (error) return toast(error.message);
    toast(`${booking.code} : ${STATUS_LABEL[status]}`);
    onChanged();
  };

  const openReschedule = async () => {
    const { data } = await supabase.rpc('available_slots', { p_centre_id: booking.centre_id, p_days: 14 });
    setSlots(((data as FreeSlot[]) ?? []).filter((s) => s.service === booking.service));
  };

  const reschedule = async () => {
    const { error } = await supabase.rpc('reschedule_booking', { p_booking_id: booking.id, p_slot_id: target });
    if (error) return toast(error.message);
    toast(`${booking.code} reporté`);
    setSlots(null);
    onChanged();
  };

  const active = booking.status === 'confirmed' || booking.status === 'pending';
  return (
    <Drawer title={`Rendez-vous ${booking.code}`} onClose={onClose}>
      <div className="card" style={{ background: 'var(--cream)', boxShadow: 'none' }}>
        <div className="row"><strong className="spacer">{SERVICE_LABEL[booking.service]}</strong><span className={`pill ${TONE[booking.status]}`}>{STATUS_LABEL[booking.status]}</span></div>
        <div style={{ marginTop: 8 }}>{new Date(booking.slot!.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {fmtTime(booking.slot!.starts_at)}</div>
        <div className="small muted" style={{ marginTop: 4 }}>Réservé le {fmtDate(booking.created_at)} · identité non collectée</div>
      </div>
      {booking.status === 'pending' && <button className="btn" onClick={() => setStatus('confirmed')}><Check size={16} /> Confirmer</button>}
      {active && (
        <div className="grid grid-2" style={{ gap: 10 }}>
          <button className="btn blue" onClick={() => setStatus('attended')}><UserCheck size={16} /> Marquer venu</button>
          <button className="btn orange" onClick={() => setStatus('no_show')}><UserX size={16} /> Marquer absent</button>
        </div>
      )}
      {active && <button className="btn light" onClick={openReschedule}><CalendarClock size={16} /> Reporter</button>}
      {slots && (
        <div className="field">
          <label htmlFor="rs">Nouveau créneau</label>
          {slots.length === 0 ? <span className="small muted">Aucun créneau libre sur 14 jours pour ce service.</span> : (
            <select id="rs" className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Choisir…</option>
              {slots.map((s) => <option key={s.id} value={s.id}>{new Date(s.starts_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(s.starts_at)} ({s.remaining} place{s.remaining > 1 ? 's' : ''})</option>)}
            </select>
          )}
          <button className="btn" disabled={!target} onClick={reschedule}>Valider le report</button>
        </div>
      )}
      {active && <button className="btn red sm" onClick={() => confirm(`Annuler ${booking.code} ?`) && setStatus('cancelled')}><XCircle size={16} /> Annuler le rendez-vous</button>}
      {!active && booking.status !== 'cancelled' && <button className="link" onClick={() => setStatus('confirmed')}>Rétablir comme confirmé</button>}
    </Drawer>
  );
}
