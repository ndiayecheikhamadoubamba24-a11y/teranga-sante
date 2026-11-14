import { Ban, ChevronLeft, ChevronRight, Plus, Trash2, Unlock } from 'lucide-react';
import { type DragEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, useToast } from '../components/ui';
import { usePro } from '../lib/auth';
import { addDays, fmtTime, isoDate, sameDay, SERVICE_FAMILY, SERVICE_LABEL, startOfWeek } from '../lib/format';
import { logAction, supabase, type Pro, type Service, type Slot } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';

const START_H = 8;
const END_H = 19;
const HOUR_PX = 56;
const FAMILY_STYLE = {
  green: { bg: '#CDEBC9', border: '#1E7B3C' },
  orange: { bg: '#FBD9B8', border: '#D2540E' },
  blue: { bg: '#CFE0F8', border: '#1F5FBF' },
};

type SlotRow = Slot & { booked: number; codes: string[] };

// A3 — Agenda et créneaux : semaine/jour, création, blocage, déplacement (glisser-déposer).
export default function Agenda() {
  const pro = usePro();
  const toast = useToast();
  const [view, setView] = useState<'week' | 'day'>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [nurses, setNurses] = useState<Pro[]>([]);
  const [selected, setSelected] = useState<SlotRow | null>(null);
  const [creating, setCreating] = useState<{ date: string; time: string } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const days = useMemo(() => {
    if (view === 'day') {
      const d = new Date(anchor);
      d.setHours(0, 0, 0, 0);
      return [d];
    }
    const m = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(m, i));
  }, [view, anchor]);

  const load = useCallback(async () => {
    const from = days[0];
    const to = addDays(days[days.length - 1], 1);
    const { data } = await supabase
      .from('slots')
      .select('*, bookings(code, status)')
      .eq('centre_id', pro.centre_id!)
      .gte('starts_at', from.toISOString())
      .lt('starts_at', to.toISOString())
      .order('starts_at');
    type Raw = Slot & { bookings: { code: string; status: string }[] };
    setSlots(
      ((data as Raw[]) ?? []).map(({ bookings, ...s }) => {
        const active = bookings.filter((b) => b.status !== 'cancelled');
        return { ...s, booked: active.length, codes: active.map((b) => b.code) };
      }),
    );
  }, [days, pro.centre_id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase.from('pros').select('*').eq('centre_id', pro.centre_id!).eq('role', 'nurse').then(({ data }) => setNurses((data as Pro[]) ?? []));
  }, [pro.centre_id]);

  useRealtime('slots', load, `centre_id=eq.${pro.centre_id}`);
  useRealtime('bookings', (c) => {
    if (c.eventType === 'INSERT') {
      setFlashId(String(c.new.slot_id));
      toast(`Nouvelle réservation ${String(c.new.code)}`);
      setTimeout(() => setFlashId(null), 4000);
    }
    load();
  }, `centre_id=eq.${pro.centre_id}`);

  const nurseName = (id: string | null) => nurses.find((n) => n.id === id)?.display_name;

  async function moveSlot(slotId: string, day: Date, minutesFromStart: number) {
    const s = slots.find((x) => x.id === slotId);
    if (!s) return;
    const dur = new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime();
    const start = new Date(day);
    const snapped = Math.max(0, Math.round(minutesFromStart / 30) * 30);
    start.setHours(START_H, snapped, 0, 0);
    if (start.getTime() === new Date(s.starts_at).getTime()) return;
    if (s.booked > 0 && !confirm(`${s.booked} rendez-vous (${s.codes.join(', ')}) seront déplacés. Continuer ?`)) return;
    const { error } = await supabase.from('slots').update({ starts_at: start.toISOString(), ends_at: new Date(start.getTime() + dur).toISOString() }).eq('id', s.id);
    if (error) return toast(`Déplacement impossible : ${error.message}`);
    logAction('slot.move', 'slots', s.id);
    load();
  }

  function onDrop(e: DragEvent<HTMLDivElement>, day: Date) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = Number(e.dataTransfer.getData('offset') || 0);
    moveSlot(id, day, ((e.clientY - rect.top - offset) / HOUR_PX) * 60);
    setDragId(null);
  }

  const title = view === 'week'
    ? sameDay(startOfWeek(new Date()), days[0]) ? 'Cette semaine' : `Semaine du ${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : days[0].toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Agenda – {title}</h1>
        <div className="tabs" style={{ border: 0 }}>
          <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semaine</button>
          <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Jour</button>
        </div>
        <button className="icon-btn" aria-label="Précédent" onClick={() => setAnchor(addDays(anchor, view === 'week' ? -7 : -1))}><ChevronLeft /></button>
        <button className="btn light sm" onClick={() => setAnchor(new Date())}>Aujourd’hui</button>
        <button className="icon-btn" aria-label="Suivant" onClick={() => setAnchor(addDays(anchor, view === 'week' ? 7 : 1))}><ChevronRight /></button>
        <button className="btn" onClick={() => setCreating({ date: isoDate(days[0] < new Date() && view === 'week' ? new Date() : days[0]), time: '09:00' })}><Plus size={18} /> Ajouter</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `64px repeat(${days.length}, minmax(110px, 1fr))`, minWidth: view === 'week' ? 860 : 0 }}>
          <div />
          {days.map((d) => {
            const today = sameDay(d, new Date());
            return (
              <button
                key={d.toISOString()}
                onClick={() => { setAnchor(d); setView('day'); }}
                style={{ border: 0, background: today ? 'var(--green-light)' : 'transparent', padding: '12px 0', borderBottom: '2px solid var(--border)', borderRadius: '12px 12px 0 0' }}
                aria-label={d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}
              >
                <div className="small" style={{ fontWeight: 600, textTransform: 'capitalize' }}>{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</div>
                <div style={{ display: 'inline-grid', placeItems: 'center', width: 34, height: 34, borderRadius: 17, fontWeight: 700, background: today ? 'var(--green)' : 'var(--cream-dark)', color: today ? '#fff' : 'inherit', marginTop: 4 }}>{d.getDate()}</div>
              </button>
            );
          })}

          <div style={{ position: 'relative' }}>
            {hours.map((h) => (
              <div key={h} className="small muted" style={{ height: HOUR_PX, textAlign: 'right', paddingRight: 8, transform: 'translateY(-8px)' }}>{String(h).padStart(2, '0')}h</div>
            ))}
          </div>
          {days.map((d) => (
            <div
              key={d.toISOString()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, d)}
              onDoubleClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mins = Math.floor(((e.clientY - rect.top) / HOUR_PX) * 2) * 30;
                setCreating({ date: isoDate(d), time: `${String(START_H + Math.floor(mins / 60)).padStart(2, '0')}:${mins % 60 ? '30' : '00'}` });
              }}
              style={{
                position: 'relative', height: hours.length * HOUR_PX, borderLeft: '1px solid var(--cream-dark)',
                backgroundImage: `repeating-linear-gradient(to bottom, var(--cream-dark) 0 1px, transparent 1px ${HOUR_PX}px)`,
              }}
            >
              {slots.filter((s) => sameDay(new Date(s.starts_at), d)).map((s) => {
                const st = new Date(s.starts_at);
                const en = new Date(s.ends_at);
                const top = ((st.getHours() - START_H) * 60 + st.getMinutes()) * (HOUR_PX / 60);
                const height = Math.max(26, ((en.getTime() - st.getTime()) / 60000) * (HOUR_PX / 60) - 3);
                const fam = FAMILY_STYLE[SERVICE_FAMILY[s.service]];
                const full = s.booked >= s.capacity;
                return (
                  <button
                    key={s.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', s.id);
                      e.dataTransfer.setData('offset', String(e.clientY - e.currentTarget.getBoundingClientRect().top));
                      setDragId(s.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setSelected(s)}
                    className={flashId === s.id ? 'flash' : ''}
                    title={`${SERVICE_LABEL[s.service]} ${fmtTime(s.starts_at)}–${fmtTime(s.ends_at)} · ${s.booked}/${s.capacity}`}
                    style={{
                      position: 'absolute', top: top + 1, left: 4, right: 4, height, borderRadius: 10, cursor: 'grab', textAlign: 'left',
                      border: 0, borderLeft: `4px solid ${s.blocked ? '#9b927f' : fam.border}`, padding: '3px 8px', overflow: 'hidden',
                      background: s.blocked ? 'repeating-linear-gradient(45deg, #eee7d8 0 6px, #f8f3e7 6px 12px)' : fam.bg,
                      opacity: dragId === s.id ? 0.5 : 1, color: 'var(--ink)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>{s.blocked ? 'Bloqué' : SERVICE_LABEL[s.service]}</div>
                    {height > 34 && (
                      <div style={{ fontSize: 11, lineHeight: 1.3 }}>
                        {fmtTime(s.starts_at)} · <strong>{s.booked}/{s.capacity}</strong>{full ? ' complet' : ''}
                        {nurseName(s.nurse_id) ? ` · ${nurseName(s.nurse_id)}` : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="row small" style={{ justifyContent: 'center', gap: 22, padding: 12, borderTop: '1px solid var(--cream-dark)' }}>
          <span className="muted">Glisser un créneau pour le déplacer · double-clic pour en créer un</span>
          {(['green', 'orange', 'blue'] as const).map((f) => (
            <span key={f} className="row" style={{ gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: FAMILY_STYLE[f].border }} />
              {f === 'green' ? 'Dépistage' : f === 'orange' ? 'Conseil' : 'Consultation / PrEP'}
            </span>
          ))}
        </div>
      </div>

      {selected && <SlotModal slot={selected} nurses={nurses} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); load(); }} />}
      {creating && <CreateSlotModal centreId={pro.centre_id!} nurses={nurses} defaultNurse={pro.role === 'nurse' ? pro.id : null} initial={creating} onClose={() => setCreating(null)} onCreated={() => { setCreating(null); load(); }} />}
    </div>
  );
}

function SlotModal({ slot, nurses, onClose, onChanged }: { slot: SlotRow; nurses: Pro[]; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [nurse, setNurse] = useState(slot.nurse_id ?? '');
  const [capacity, setCapacity] = useState(slot.capacity);

  const save = async (patch: Partial<Slot>, action: string) => {
    const { error } = await supabase.from('slots').update(patch).eq('id', slot.id);
    if (error) return toast(error.message);
    logAction(action, 'slots', slot.id);
    onChanged();
  };
  const remove = async () => {
    if (!confirm('Supprimer ce créneau ?')) return;
    const { error } = await supabase.from('slots').delete().eq('id', slot.id);
    if (error) return toast('Suppression impossible : des rendez-vous y sont liés.');
    logAction('slot.delete', 'slots', slot.id);
    onChanged();
  };

  return (
    <Modal title={`${SERVICE_LABEL[slot.service]} · ${new Date(slot.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`} onClose={onClose}>
      <div className="row"><strong>{fmtTime(slot.starts_at)} – {fmtTime(slot.ends_at)}</strong><span className="spacer" /><span className={`pill ${slot.booked >= slot.capacity ? 'warning' : 'good'}`}>{slot.booked}/{slot.capacity} réservé(s)</span></div>
      {slot.codes.length > 0 && <div className="small">Codes : {slot.codes.map((c) => <span key={c} className="pill muted no-dot" style={{ marginRight: 4 }}>{c}</span>)}</div>}
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="sn">Infirmière</label>
          <select id="sn" className="select" value={nurse} onChange={(e) => setNurse(e.target.value)}>
            <option value="">Indifférent</option>
            {nurses.map((n) => <option key={n.id} value={n.id}>{n.display_name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sc">Places</label>
          <input id="sc" className="input" type="number" min={Math.max(1, slot.booked)} max={20} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </div>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => save({ nurse_id: nurse || null, capacity }, 'slot.update')}>Enregistrer</button>
        {slot.blocked
          ? <button className="btn light" onClick={() => save({ blocked: false }, 'slot.unblock')}><Unlock size={16} /> Débloquer</button>
          : <button className="btn light" onClick={() => save({ blocked: true }, 'slot.block')}><Ban size={16} /> Bloquer</button>}
        <span className="spacer" />
        <button className="btn red sm" disabled={slot.booked > 0} onClick={remove} title={slot.booked > 0 ? 'Des rendez-vous sont liés à ce créneau' : ''}><Trash2 size={16} /> Supprimer</button>
      </div>
    </Modal>
  );
}

function CreateSlotModal({ centreId, nurses, defaultNurse, initial, onClose, onCreated }: {
  centreId: string; nurses: Pro[]; defaultNurse: string | null; initial: { date: string; time: string }; onClose: () => void; onCreated: () => void;
}) {
  const toast = useToast();
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [duration, setDuration] = useState(60);
  const [count, setCount] = useState(1);
  const [service, setService] = useState<Service>('screening');
  const [capacity, setCapacity] = useState(2);
  const [nurse, setNurse] = useState(defaultNurse ?? '');

  const create = async () => {
    const base = new Date(`${date}T${time}:00`);
    const rows = Array.from({ length: count }, (_, i) => {
      const s = new Date(base.getTime() + i * duration * 60000);
      return { centre_id: centreId, service, capacity, nurse_id: nurse || null, starts_at: s.toISOString(), ends_at: new Date(s.getTime() + duration * 60000).toISOString() };
    });
    const { error } = await supabase.from('slots').insert(rows);
    if (error) return toast(error.message);
    logAction('slot.create', 'slots', `${rows.length}`);
    onCreated();
  };

  return (
    <Modal title="Ajouter des créneaux" onClose={onClose}>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field"><label htmlFor="cd">Date</label><input id="cd" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label htmlFor="ct">Début</label><input id="ct" className="input" type="time" step={1800} value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="cs">Service</label>
          <select id="cs" className="select" value={service} onChange={(e) => setService(e.target.value as Service)}>
            {(Object.keys(SERVICE_LABEL) as Service[]).map((s) => <option key={s} value={s}>{SERVICE_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cdu">Durée</label>
          <select id="cdu" className="select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="cn">Nombre de créneaux à la suite</label><input id="cn" className="input" type="number" min={1} max={12} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
        <div className="field"><label htmlFor="cc">Places par créneau</label><input id="cc" className="input" type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="cnu">Infirmière</label>
          <select id="cnu" className="select" value={nurse} onChange={(e) => setNurse(e.target.value)}>
            <option value="">Indifférent</option>
            {nurses.map((n) => <option key={n.id} value={n.id}>{n.display_name}</option>)}
          </select>
        </div>
      </div>
      <button className="btn lg" onClick={create}><Plus size={18} /> Créer {count > 1 ? `${count} créneaux` : 'le créneau'}</button>
    </Modal>
  );
}
