import { AlertCircle, AlertTriangle, CheckCircle2, Minus, Plus, TriangleAlert, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CredentialsCard, generatePassword, passwordProblem, TempPasswordField } from '../components/credentials';
import { Modal, StatusPill, initials, useToast } from '../components/ui';
import { usePro } from '../lib/auth';
import { manageUsers } from '../lib/manageUsers';
import { useCentreId } from '../lib/centre';
import { logAction, supabase, type Pro } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';

type Stock = { centre_id: string; item: 'selftest' | 'condom' | 'arv' | 'prep'; level: number; threshold: number; capacity: number; updated_at: string };

const ITEM_LABEL: Record<Stock['item'], string> = { selftest: 'Autotests', condom: 'Préservatifs', arv: 'ARV', prep: 'PrEP' };
const ORDER: Stock['item'][] = ['selftest', 'condom', 'arv', 'prep'];

// Statut réservé : jamais une couleur seule (icône + libellé).
function stockStatus(s: Stock) {
  if (s.level === 0) return { tone: 'critical', color: 'var(--red)', label: 'Rupture', icon: <AlertCircle size={16} color="var(--red)" /> };
  if (s.level <= s.threshold) return { tone: 'critical', color: 'var(--red)', label: 'Sous le seuil', icon: <AlertTriangle size={16} color="var(--red)" /> };
  if (s.level / s.capacity < 0.5) return { tone: 'warning', color: 'var(--sun)', label: 'À surveiller', icon: <TriangleAlert size={16} color="#b07a00" /> };
  return { tone: 'good', color: 'var(--green)', label: 'Suffisant', icon: <CheckCircle2 size={16} color="var(--green)" /> };
}

// A8 — Stocks et équipe (responsable de centre).
export default function StocksTeam() {
  const pro = usePro();
  const centreId = useCentreId();
  const toast = useToast();
  const [tab, setTab] = useState<'stocks' | 'team'>('stocks');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [team, setTeam] = useState<Pro[]>([]);
  const [rupture, setRupture] = useState(false);
  const [invite, setInvite] = useState(false);

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([
      supabase.from('stocks').select('*').eq('centre_id', centreId),
      supabase.from('pros').select('*').eq('centre_id', centreId).order('display_name'),
    ]);
    setStocks(((s.data as Stock[]) ?? []).sort((a, b) => ORDER.indexOf(a.item) - ORDER.indexOf(b.item)));
    setTeam((t.data as Pro[]) ?? []);
  }, [centreId]);
  useEffect(() => { load(); }, [load]);
  useRealtime('pros', load, `centre_id=eq.${centreId}`);

  async function adjust(s: Stock, level: number) {
    const v = Math.max(0, Math.min(s.capacity * 2, level));
    setStocks((cur) => cur.map((x) => (x.item === s.item ? { ...x, level: v } : x)));
    const { error } = await supabase.from('stocks').update({ level: v }).eq('centre_id', s.centre_id).eq('item', s.item);
    if (error) toast(error.message);
    else logAction('stock.update', 'stocks', `${s.item}=${v}`);
  }

  const stockCard = (
    <section className="card">
      <div className="card-head"><h2>Niveaux de stock</h2><span className="small muted">Le seuil déclenche une alerte automatique</span></div>
      {stocks.length === 0 && <span className="muted">Aucun stock suivi pour ce centre.</span>}
      {stocks.map((s) => {
        const st = stockStatus(s);
        const pct = Math.min(100, Math.round((100 * s.level) / s.capacity));
        return (
          <div key={s.item} className="row" style={{ padding: '12px 0', borderBottom: '1px solid var(--cream-dark)', gap: 14 }}>
            {st.icon}
            <strong style={{ width: 110 }}>{ITEM_LABEL[s.item]}</strong>
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, borderRadius: 6, background: 'var(--cream-dark)', overflow: 'hidden', position: 'relative' }} role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${ITEM_LABEL[s.item]} ${pct}%`}>
                <div style={{ width: `${pct}%`, height: '100%', background: st.color, borderRadius: 6 }} />
                <div title="Seuil d’alerte" style={{ position: 'absolute', top: 0, bottom: 0, left: `${(100 * s.threshold) / s.capacity}%`, width: 2, background: 'var(--night)', opacity: 0.4 }} />
              </div>
              <div className="small muted" style={{ marginTop: 2 }}>{s.level} / {s.capacity} · seuil {s.threshold} · <span style={{ color: 'var(--ink)' }}>{st.label}</span></div>
            </div>
            <strong style={{ width: 44, textAlign: 'right' }}>{pct}%</strong>
            <div className="row" style={{ gap: 4 }}>
              <button className="icon-btn" aria-label={`Retirer 1 ${ITEM_LABEL[s.item]}`} onClick={() => adjust(s, s.level - 1)}><Minus size={16} /></button>
              <input className="input" style={{ width: 70, padding: '6px 8px' }} type="number" min={0} value={s.level} aria-label={`Niveau ${ITEM_LABEL[s.item]}`} onChange={(e) => adjust(s, Number(e.target.value))} />
              <button className="icon-btn" aria-label={`Ajouter 1 ${ITEM_LABEL[s.item]}`} onClick={() => adjust(s, s.level + 1)}><Plus size={16} /></button>
            </div>
          </div>
        );
      })}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button className="btn red" onClick={() => setRupture(true)}><AlertTriangle size={16} /> Signaler une rupture</button>
      </div>
    </section>
  );

  const teamCard = (
    <section className="card">
      <div className="card-head"><h2>Équipe ({team.length})</h2></div>
      {team.map((m) => (
        <div key={m.id} className="list-item">
          <div className="avatar">{initials(m.display_name)}</div>
          <div style={{ flex: 1 }}>
            <strong>{m.display_name}</strong>
            <div className="small muted">{m.role === 'manager' ? 'Responsable' : m.specialty ?? 'Infirmière'} · {m.languages.map((l) => l.toUpperCase()).join(', ')}</div>
          </div>
          <StatusPill status={m.status} />
        </div>
      ))}
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button className="btn light" onClick={() => setInvite(true)}><UserPlus size={16} /> Ajouter un membre</button>
      </div>
    </section>
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1>Stocks et équipe</h1>
        <div className="tabs" style={{ border: 0 }}>
          <button className={tab === 'stocks' ? 'active' : ''} onClick={() => setTab('stocks')}>Stocks</button>
          <button className={tab === 'team' ? 'active' : ''} onClick={() => setTab('team')}>Équipe</button>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '3fr 2fr', alignItems: 'start' }}>
        {tab === 'stocks' ? stockCard : teamCard}
        {tab === 'stocks' ? teamCard : stockCard}
      </div>
      {rupture && <RuptureModal centreId={centreId} proId={pro.id} onClose={() => setRupture(false)} />}
      {invite && <InviteModal onClose={() => setInvite(false)} onDone={() => { setInvite(false); load(); }} />}
    </div>
  );
}

function RuptureModal({ centreId, proId, onClose }: { centreId: string; proId: string; onClose: () => void }) {
  const toast = useToast();
  const [item, setItem] = useState<Stock['item']>('selftest');
  const [note, setNote] = useState('');
  const send = async () => {
    const { error } = await supabase.from('alerts').insert({ centre_id: centreId, kind: 'stock_out', item, created_by: proId, message: `Rupture de ${ITEM_LABEL[item].toLowerCase()}${note ? ` — ${note}` : ''}` });
    if (error) return toast(error.message);
    logAction('alert.stock_out', 'alerts', item);
    toast('Rupture signalée au district et au CNLS');
    onClose();
  };
  return (
    <Modal title="Signaler une rupture" onClose={onClose}>
      <div className="field"><label htmlFor="ri">Produit</label>
        <select id="ri" className="select" value={item} onChange={(e) => setItem(e.target.value as Stock['item'])}>
          {ORDER.map((i) => <option key={i} value={i}>{ITEM_LABEL[i]}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="rn">Précision (optionnel)</label><textarea id="rn" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : livraison attendue depuis 2 semaines" /></div>
      <button className="btn red lg" onClick={send}>Envoyer l’alerte</button>
    </Modal>
  );
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [password, setPassword] = useState(() => generatePassword());
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      // Fonction Edge (clé service côté serveur uniquement) : supabase/functions/manage-users
      await manageUsers({ action: 'create', email: email.trim().toLowerCase(), password, display_name: name, specialty });
      setCreated(true);
    } catch (e) {
      toast(`Création impossible : ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={created ? 'Compte créé' : 'Ajouter un membre'} onClose={created ? onDone : onClose}>
      {created ? <CredentialsCard name={name} email={email.trim().toLowerCase()} password={password} onDone={onDone} /> : <>
        <div className="field"><label htmlFor="ie">Email professionnel</label><input id="ie" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="in">Nom affiché aux jeunes</label><input id="in" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex : Awa" /></div>
        <div className="field"><label htmlFor="is">Spécialité</label><input id="is" className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="ex : Dépistage et PrEP" /></div>
        <TempPasswordField value={password} onChange={setPassword} />
        <button className="btn lg" disabled={busy || !email.includes('@') || name.trim().length < 2 || !!passwordProblem(password)} onClick={send}><UserPlus size={16} /> Créer le compte</button>
      </>}
    </Modal>
  );
}
