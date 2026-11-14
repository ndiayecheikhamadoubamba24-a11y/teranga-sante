import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Empty, Modal, useToast } from '../../components/ui';
import { SENEGAL_REGIONS } from '../../data/senegal';
import { useCentre } from '../../lib/centre';
import { SERVICE_LABEL } from '../../lib/format';
import { logAction, supabase, type Service } from '../../lib/supabase';

type Hours = Partial<Record<'mon-fri' | 'sat' | 'sun', [string, string]>>;
type Centre = {
  id: string; name: string; region_id: number; district: string | null; address: string | null; phone: string | null;
  lat: number | null; lng: number | null; is_free: boolean; is_confidential: boolean; opening_hours: Hours; services: Service[];
};

const regionName = (id: number) => SENEGAL_REGIONS.find((r) => r.id === id)?.name ?? '—';
const REGIONS = [...SENEGAL_REGIONS].sort((a, b) => a.name.localeCompare(b.name));
const hoursLabel = (h: Hours) => [h['mon-fri'] && `Lun–Ven ${h['mon-fri'][0]}–${h['mon-fri'][1]}`, h.sat && `Sam ${h.sat[0]}–${h.sat[1]}`].filter(Boolean).join(' · ') || 'Non renseigné';

// Super admin — gestion des centres de dépistage (carte mobile M4, réservations, stocks).
export default function Centres() {
  const toast = useToast();
  const { reload } = useCentre();
  const [centres, setCentres] = useState<Centre[] | null>(null);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<number | ''>('');
  const [editing, setEditing] = useState<Centre | 'new' | null>(null);
  const [staff, setStaff] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabase.from('centres').select('*').order('name'),
      supabase.from('pros').select('centre_id').not('centre_id', 'is', null),
    ]);
    setCentres((c.data as Centre[]) ?? []);
    const counts: Record<string, number> = {};
    for (const r of (p.data as { centre_id: string }[]) ?? []) counts[r.centre_id] = (counts[r.centre_id] ?? 0) + 1;
    setStaff(counts);
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => (centres ?? []).filter((c) => (!region || c.region_id === region) && (!q || `${c.name} ${c.district ?? ''}`.toLowerCase().includes(q.toLowerCase()))), [centres, q, region]);

  async function remove(c: Centre) {
    if (!confirm(`Supprimer « ${c.name} » ? Ses créneaux seront supprimés. Impossible si des rendez-vous existent.`)) return;
    const { error } = await supabase.from('centres').delete().eq('id', c.id);
    if (error) return toast('Suppression impossible : des rendez-vous ou des comptes sont liés à ce centre.');
    logAction('centre.delete', 'centres', c.id);
    load();
    reload();
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Centres ({centres?.length ?? 0})</h1>
        <button className="btn" onClick={() => setEditing('new')}><Plus size={18} /> Ajouter un centre</button>
      </div>
      <section className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <label className="search"><Search size={16} /><input placeholder="Nom ou quartier…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" /></label>
          <select className="select" style={{ width: 'auto' }} value={region} onChange={(e) => setRegion(e.target.value ? Number(e.target.value) : '')} aria-label="Région">
            <option value="">Toutes les régions</option>
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {centres === null ? <span className="muted">Chargement…</span> : list.length === 0 ? <Empty title="Aucun centre" /> : (
          <table className="table">
            <thead><tr><th>Centre</th><th>Région</th><th>Horaires</th><th>Services</th><th>Équipe</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <div className="small muted">{[c.district, c.address].filter(Boolean).join(' · ') || '—'}</div>
                    <div className="row" style={{ gap: 4, marginTop: 4 }}>
                      {c.is_free && <span className="pill good no-dot">Gratuit</span>}
                      {c.is_confidential && <span className="pill info no-dot">Confidentiel</span>}
                      {(c.lat == null || c.lng == null) && <span className="pill warning">Pas sur la carte</span>}
                    </div>
                  </td>
                  <td>{regionName(c.region_id)}</td>
                  <td className="small">{hoursLabel(c.opening_hours)}</td>
                  <td className="small">{c.services.map((s) => SERVICE_LABEL[s]).join(', ')}</td>
                  <td>{staff[c.id] ?? 0}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" aria-label={`Modifier ${c.name}`} onClick={() => setEditing(c)}><Pencil size={17} /></button>
                    <button className="icon-btn" aria-label={`Supprimer ${c.name}`} onClick={() => remove(c)}><Trash2 size={17} color="var(--red)" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {editing && <CentreModal centre={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); reload(); }} />}
    </div>
  );
}

function CentreModal({ centre, onClose, onSaved }: { centre: Centre | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Omit<Centre, 'id'>>(centre ?? {
    name: '', region_id: 1, district: '', address: '', phone: '', lat: null, lng: null, is_free: true, is_confidential: true,
    opening_hours: { 'mon-fri': ['08:00', '17:00'] }, services: ['screening'],
  });
  const set = (patch: Partial<Centre>) => setF({ ...f, ...patch });
  const setHours = (k: 'mon-fri' | 'sat', i: 0 | 1, v: string) => {
    const cur = f.opening_hours[k] ?? ['08:00', '13:00'];
    const next: [string, string] = [...cur] as [string, string];
    next[i] = v;
    set({ opening_hours: { ...f.opening_hours, [k]: next } });
  };

  const save = async () => {
    if (f.name.trim().length < 3) return toast('Nom du centre requis.');
    if (!f.services.length) return toast('Choisis au moins un service.');
    const row = { ...f, name: f.name.trim(), district: f.district || null, address: f.address || null, phone: f.phone || null };
    const { data, error } = centre
      ? await supabase.from('centres').update(row).eq('id', centre.id).select('id').single()
      : await supabase.from('centres').insert(row).select('id').single();
    if (error) return toast(error.message);
    if (!centre) {
      // Stocks suivis par défaut pour un nouveau centre
      await supabase.from('stocks').insert(['selftest', 'condom', 'arv', 'prep'].map((item) => ({ centre_id: data.id, item, level: 0, threshold: 10, capacity: 100 })));
    }
    logAction(centre ? 'centre.update' : 'centre.create', 'centres', data.id);
    toast('Centre enregistré');
    onSaved();
  };

  return (
    <Modal title={centre ? `Modifier ${centre.name}` : 'Ajouter un centre'} onClose={onClose}>
      <div className="field"><label htmlFor="cn">Nom</label><input id="cn" className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field"><label htmlFor="cr">Région</label>
          <select id="cr" className="select" value={f.region_id} onChange={(e) => set({ region_id: Number(e.target.value) })}>
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="cd">District / quartier</label><input id="cd" className="input" value={f.district ?? ''} onChange={(e) => set({ district: e.target.value })} /></div>
        <div className="field"><label htmlFor="ca">Adresse</label><input id="ca" className="input" value={f.address ?? ''} onChange={(e) => set({ address: e.target.value })} /></div>
        <div className="field"><label htmlFor="cp">Téléphone du centre</label><input id="cp" className="input" value={f.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} /></div>
        <div className="field"><label htmlFor="clat">Latitude</label><input id="clat" className="input" type="number" step="0.0001" value={f.lat ?? ''} onChange={(e) => set({ lat: e.target.value === '' ? null : Number(e.target.value) })} placeholder="14.6928" /></div>
        <div className="field"><label htmlFor="clng">Longitude</label><input id="clng" className="input" type="number" step="0.0001" value={f.lng ?? ''} onChange={(e) => set({ lng: e.target.value === '' ? null : Number(e.target.value) })} placeholder="-17.4467" /></div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Astuce : sur Google Maps ou OpenStreetMap, un clic droit sur le centre affiche ses coordonnées. Sans coordonnées, le centre n’apparaît pas sur la carte mobile.</p>
      <div className="field"><label>Horaires</label>
        <div className="row small">
          <span style={{ width: 90 }}>Lun – Ven</span>
          <input className="input" type="time" style={{ width: 120 }} value={f.opening_hours['mon-fri']?.[0] ?? ''} onChange={(e) => setHours('mon-fri', 0, e.target.value)} aria-label="Ouverture lundi-vendredi" />
          <input className="input" type="time" style={{ width: 120 }} value={f.opening_hours['mon-fri']?.[1] ?? ''} onChange={(e) => setHours('mon-fri', 1, e.target.value)} aria-label="Fermeture lundi-vendredi" />
        </div>
        <div className="row small">
          <label className="row" style={{ width: 90, gap: 4 }}>
            <input type="checkbox" checked={!!f.opening_hours.sat} onChange={(e) => {
              const { sat: _omit, ...rest } = f.opening_hours;
              set({ opening_hours: e.target.checked ? { ...rest, sat: ['09:00', '13:00'] } : rest });
            }} /> Samedi
          </label>
          {f.opening_hours.sat && <>
            <input className="input" type="time" style={{ width: 120 }} value={f.opening_hours.sat[0]} onChange={(e) => setHours('sat', 0, e.target.value)} aria-label="Ouverture samedi" />
            <input className="input" type="time" style={{ width: 120 }} value={f.opening_hours.sat[1]} onChange={(e) => setHours('sat', 1, e.target.value)} aria-label="Fermeture samedi" />
          </>}
        </div>
      </div>
      <div className="field"><label>Services proposés</label>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {(Object.keys(SERVICE_LABEL) as Service[]).map((s) => (
            <label key={s} className="row small" style={{ gap: 4 }}>
              <input type="checkbox" checked={f.services.includes(s)} onChange={(e) => set({ services: e.target.checked ? [...f.services, s] : f.services.filter((x) => x !== s) })} /> {SERVICE_LABEL[s]}
            </label>
          ))}
        </div>
      </div>
      <div className="row">
        <label className="row small" style={{ gap: 4 }}><input type="checkbox" checked={f.is_free} onChange={(e) => set({ is_free: e.target.checked })} /> Gratuit</label>
        <label className="row small" style={{ gap: 4 }}><input type="checkbox" checked={f.is_confidential} onChange={(e) => set({ is_confidential: e.target.checked })} /> Confidentiel</label>
      </div>
      <button className="btn lg" onClick={save}>Enregistrer</button>
    </Modal>
  );
}
