import { AlertTriangle, CalendarPlus, CheckCircle2, Lock, Mic, Send, Share2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Baobi } from '../components/Baobi';
import { Empty, Modal, Youth, useToast } from '../components/ui';
import { usePro } from '../lib/auth';
import { fmtTime, LANG_LABEL, SERVICE_LABEL, timeAgo } from '../lib/format';
import { logAction, supabase, type Conversation, type Message, type Service } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';

/** Message vocal du jeune (bucket privé, URL signée d'une heure). */
function VoiceNote({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from('voice').createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  return url ? <audio controls preload="none" src={url} style={{ height: 36, maxWidth: 260 }} aria-label="Message vocal" /> : <span className="muted small">🎤 Chargement du vocal…</span>;
}

type ConvRow = Conversation & { last?: string; unread?: number };
type FreeSlot = { id: string; starts_at: string; service: Service; remaining: number };
type CentreRow = { id: string; name: string; district: string | null };

const QUICK = [
  { label: 'Conseil santé', text: 'Merci pour ta question. Le dépistage est rapide, gratuit et confidentiel. Tu peux venir quand tu veux, sans donner ton nom.' },
  { label: 'Autre question', text: 'As-tu une autre question ? Je suis là pour t’aider, sans jugement.' },
  { label: 'Rappel confidentialité', text: 'Pour ta sécurité, ne partage ni ton nom ni ton numéro ici.' },
];

// A5 — Messagerie avec les jeunes (anonyme) : priorités, réponses rapides, proposer un rendez-vous, orienter.
export default function Messages() {
  const pro = usePro();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [hasBooking, setHasBooking] = useState<boolean | null>(null);
  const [modal, setModal] = useState<'booking' | 'referral' | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const activeId = params.get('c');
  const active = convs.find((c) => c.id === activeId) ?? null;

  const loadConvs = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*, messages(body, kind, sender_id, read_at, created_at)')
      .or(`nurse_id.eq.${pro.id},nurse_id.is.null`)
      .order('last_message_at', { ascending: false })
      .limit(50);
    type Raw = Conversation & { messages: Pick<Message, 'body' | 'kind' | 'sender_id' | 'read_at' | 'created_at'>[] };
    const rows = ((data as Raw[]) ?? []).map(({ messages, ...c }) => {
      const sorted = [...messages].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return { ...c, last: sorted[0] ? (sorted[0].kind === 'audio' ? '🎤 Message vocal' : sorted[0].body ?? '') : '', unread: messages.filter((m) => !m.read_at && m.sender_id !== pro.id).length };
    });
    // Priorité : urgent, puis non lus, puis récents.
    rows.sort((a, b) => Number(b.urgent && !b.closed) - Number(a.urgent && !a.closed) || Number(a.closed) - Number(b.closed) || (b.unread ?? 0) - (a.unread ?? 0) || (a.last_message_at < b.last_message_at ? 1 : -1));
    setConvs(rows);
    if (!activeId && rows[0]) setParams({ c: rows[0].id }, { replace: true });
  }, [pro.id, activeId, setParams]);

  const loadMsgs = useCallback(async () => {
    if (!activeId) return setMsgs([]);
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', activeId).order('created_at');
    setMsgs((data as Message[]) ?? []);
    const unread = ((data as Message[]) ?? []).filter((m) => !m.read_at && m.sender_id !== pro.id).map((m) => m.id);
    if (unread.length) {
      await supabase.rpc('mark_read', { p_conversation_id: activeId });
      loadConvs();
    }
    const { data: hb } = await supabase.rpc('conversation_has_booking', { p_conversation_id: activeId });
    setHasBooking(hb as boolean | null);
  }, [activeId, pro.id, loadConvs]);

  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => { loadMsgs(); }, [loadMsgs]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs]);
  useRealtime('messages', (c) => {
    if (c.new.conversation_id === activeId) loadMsgs();
    else loadConvs();
  });
  useRealtime('conversations', loadConvs);

  async function send(body: string, kind: Message['kind'] = 'text', payload: Record<string, unknown> | null = null) {
    if (!active || !body.trim()) return;
    if (!active.nurse_id) await claim();
    const { error } = await supabase.from('messages').insert({ conversation_id: active.id, sender_id: pro.id, body: body.trim(), kind, payload });
    if (error) return toast(error.message);
    setText('');
    loadMsgs();
  }

  async function claim() {
    if (!active) return;
    await supabase.from('conversations').update({ nurse_id: pro.id }).eq('id', active.id);
    logAction('conversation.claim', 'conversations', active.id);
    await loadConvs();
  }

  async function toggle(field: 'urgent' | 'closed', value: boolean) {
    if (!active) return;
    await supabase.from('conversations').update({ [field]: value }).eq('id', active.id);
    logAction(`conversation.${field}.${value}`, 'conversations', active.id);
    loadConvs();
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
  };

  return (
    <div className="page" style={{ paddingBottom: 20 }}>
      <h1 className="sr-only">Messagerie</h1>
      <div className="banner warning" style={{ justifyContent: 'center' }}>
        <Lock size={16} /> <strong>Confidentialité :</strong> ne demandez pas de données personnelles (nom, numéro, adresse).
      </div>
      <div className="card" style={{ padding: 0, display: 'grid', gridTemplateColumns: '280px 1fr 260px', height: 'calc(100vh - 190px)', minHeight: 480, overflow: 'hidden' }}>
        {/* Conversations */}
        <div style={{ borderRight: '1px solid var(--border)', overflow: 'auto' }}>
          <h2 style={{ fontSize: 16, padding: '16px 16px 8px' }}>Conversations</h2>
          {convs.length === 0 && <Empty title="Aucune conversation" hint="Les questions des jeunes arriveront ici." />}
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => setParams({ c: c.id })}
              className="list-item"
              style={{ width: '100%', border: 0, borderRadius: 0, textAlign: 'left', background: c.id === activeId ? 'var(--blue-light)' : 'transparent', opacity: c.closed ? 0.6 : 1 }}
            >
              <Youth alias={c.alias} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <strong className="spacer">{c.alias}</strong>
                  <span className="small muted">{timeAgo(c.last_message_at)}</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="small spacer" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last}</span>
                  {c.urgent && !c.closed && <AlertTriangle size={14} color="var(--red)" aria-label="Urgent" />}
                  {!!c.unread && <span className="dot-badge" style={{ position: 'static' }}>{c.unread}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Discussion */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FFFCF5' }}>
          {!active ? <Empty title="Choisis une conversation" /> : (
            <>
              <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
                <Youth alias={active.alias} />
                <div className="spacer">
                  <strong>{active.alias}</strong>
                  <div className="small muted">{active.closed ? 'Conversation clôturée' : active.nurse_id ? 'Prise en charge' : 'En attente d’une infirmière'}</div>
                </div>
                {!active.nurse_id && <button className="btn sm" onClick={claim}>Prendre en charge</button>}
                <button className={`btn sm ${active.urgent ? 'red' : 'light'}`} onClick={() => toggle('urgent', !active.urgent)}><AlertTriangle size={14} /> {active.urgent ? 'Urgent' : 'Marquer urgent'}</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {msgs.map((m) => {
                  const mine = m.sender_id !== active.player_id; // côté soignant (y compris un compte supprimé : sender_id null)
                  return (
                    <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                      <div style={{ background: mine ? 'var(--green-light)' : 'var(--white)', border: `1px solid ${mine ? '#bfe0bb' : 'var(--border)'}`, borderRadius: 16, padding: '10px 14px', whiteSpace: 'pre-wrap' }}>
                        {m.kind === 'booking_offer' && <div className="small" style={{ fontWeight: 700, color: 'var(--green)' }}><CalendarPlus size={13} /> Proposition de rendez-vous</div>}
                        {m.kind === 'referral' && <div className="small" style={{ fontWeight: 700, color: 'var(--blue)' }}><Share2 size={13} /> Orientation</div>}
                        {m.kind === 'audio' && m.audio_path ? <VoiceNote path={m.audio_path} /> : m.body}
                      </div>
                      <div className="small muted" style={{ textAlign: mine ? 'right' : 'left', marginTop: 2 }}>{fmtTime(m.created_at)}{mine && m.read_at ? ' · lu' : ''}</div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {!active.closed && (
                <>
                  <div className="row" style={{ padding: '0 16px 8px', flexWrap: 'wrap', gap: 8 }}>
                    <button className="btn outline sm" onClick={() => setModal('booking')}>Voir les créneaux</button>
                    {QUICK.map((q) => <button key={q.label} className="btn outline sm" onClick={() => send(q.text)}>{q.label}</button>)}
                  </div>
                  <form onSubmit={onSubmit} className="row" style={{ padding: '0 16px 16px' }}>
                    <button type="button" className="icon-btn" title="Message vocal (bientôt)" disabled aria-label="Message vocal bientôt disponible"><Mic size={20} color="var(--muted)" /></button>
                    <input className="input" placeholder="Écrire un message…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" />
                    <button className="btn" aria-label="Envoyer" disabled={!text.trim()}><Send size={16} /></button>
                  </form>
                </>
              )}
            </>
          )}
        </div>

        {/* Informations */}
        <div style={{ borderLeft: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <h2 style={{ fontSize: 16 }}>Informations</h2>
          {active && (
            <>
              <div className="small" style={{ lineHeight: 1.9 }}>
                <div>Motif : <strong>{active.topic ?? 'Non précisé'}</strong></div>
                <div>Langue : <strong>{LANG_LABEL[active.lang]}</strong></div>
                <div>Rendez-vous : <strong>{hasBooking === null ? '…' : hasBooking ? 'Oui' : 'Non'}</strong></div>
              </div>
              {!active.closed && (
                <>
                  <button className="btn" onClick={() => setModal('booking')}><CalendarPlus size={16} /> Proposer un rendez-vous</button>
                  <button className="btn light" onClick={() => setModal('referral')}><Share2 size={16} /> Orienter vers un autre service</button>
                </>
              )}
              <button className="link" onClick={() => toggle('closed', !active.closed)}>
                <CheckCircle2 size={14} /> {active.closed ? 'Rouvrir la conversation' : 'Clôturer la conversation'}
              </button>
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Baobi size={64} />
                <span className="small muted">Aucune identité n’est visible : le jeune est désigné par son code.</span>
              </div>
            </>
          )}
        </div>
      </div>

      {modal === 'booking' && pro.centre_id && (
        <OfferModal centreId={pro.centre_id} onClose={() => setModal(null)} onSend={(s) => {
          const when = `${new Date(s.starts_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${fmtTime(s.starts_at)}`;
          send(`Je te propose un créneau de ${SERVICE_LABEL[s.service].toLowerCase()} le ${when}. Réserve-le dans l’app : tu recevras un code, pas besoin de ton nom.`, 'booking_offer', { slot_id: s.id, starts_at: s.starts_at, centre_id: pro.centre_id });
          setModal(null);
        }} />
      )}
      {modal === 'referral' && (
        <ReferralModal onClose={() => setModal(null)} onSend={(c, reason) => {
          send(`Je t’oriente vers ${c.name}${c.district ? ` (${c.district})` : ''} : ${reason}`, 'referral', { centre_id: c.id, reason });
          setModal(null);
        }} />
      )}
    </div>
  );
}

function OfferModal({ centreId, onClose, onSend }: { centreId: string; onClose: () => void; onSend: (s: FreeSlot) => void }) {
  const [slots, setSlots] = useState<FreeSlot[] | null>(null);
  useEffect(() => {
    supabase.rpc('available_slots', { p_centre_id: centreId, p_days: 7 }).then(({ data }) => setSlots((data as FreeSlot[]) ?? []));
  }, [centreId]);
  return (
    <Modal title="Proposer un rendez-vous" onClose={onClose}>
      {slots === null ? <span className="muted">Chargement…</span> : slots.length === 0 ? <Empty title="Aucun créneau libre cette semaine" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflow: 'auto' }}>
          {slots.slice(0, 20).map((s) => (
            <button key={s.id} className="list-item" style={{ border: '1px solid var(--border)', background: 'var(--white)', textAlign: 'left' }} onClick={() => onSend(s)}>
              <strong style={{ width: 150 }}>{new Date(s.starts_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(s.starts_at)}</strong>
              <span className="spacer">{SERVICE_LABEL[s.service]}</span>
              <span className="pill good">{s.remaining} place{s.remaining > 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ReferralModal({ onClose, onSend }: { onClose: () => void; onSend: (c: CentreRow, reason: string) => void }) {
  const [centres, setCentres] = useState<CentreRow[]>([]);
  const [centre, setCentre] = useState('');
  const [reason, setReason] = useState('accompagnement psychologique');
  useEffect(() => {
    supabase.from('centres').select('id, name, district').order('name').then(({ data }) => setCentres((data as CentreRow[]) ?? []));
  }, []);
  const c = centres.find((x) => x.id === centre);
  return (
    <Modal title="Orienter vers un autre service" onClose={onClose}>
      <div className="field"><label htmlFor="rc">Centre ou association</label>
        <select id="rc" className="select" value={centre} onChange={(e) => setCentre(e.target.value)}>
          <option value="">Choisir…</option>
          {centres.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="rr">Motif</label>
        <select id="rr" className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
          {['accompagnement psychologique', 'suivi du traitement', 'consultation PrEP', 'aide juridique ou associative', 'soutien par les pairs'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <button className="btn lg" disabled={!c} onClick={() => c && onSend(c, reason)}>Envoyer l’orientation</button>
    </Modal>
  );
}
