import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusSelect, initials, useToast } from '../components/ui';
import { useAuth, usePro } from '../lib/auth';
import { LANG_LABEL, ROLE_LABEL } from '../lib/format';
import { logAction, supabase, type Lang } from '../lib/supabase';

export default function Profile() {
  const pro = usePro();
  const { setStatus, refresh, session } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(pro.display_name);
  const [specialty, setSpecialty] = useState(pro.specialty ?? '');
  const [langs, setLangs] = useState<Lang[]>(pro.languages);
  const [factors, setFactors] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => setFactors(data?.totp?.filter((f) => f.status === 'verified').length ?? 0));
  }, []);

  const save = async () => {
    const { error } = await supabase.from('pros').update({ display_name: name.trim(), specialty: specialty || null, languages: langs }).eq('id', pro.id);
    if (error) return toast(error.message);
    logAction('profile.update', 'pros', pro.id);
    await refresh();
    toast('Profil enregistré');
  };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-head"><h1>Mon profil</h1></div>
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row">
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{initials(pro.display_name)}</div>
          <div className="spacer">
            <strong>{session?.user.email}</strong>
            <div className="small muted">{ROLE_LABEL[pro.role]}{pro.centre ? ` · ${pro.centre.name}` : ''}</div>
          </div>
          {(pro.role === 'nurse' || pro.role === 'manager') && <StatusSelect value={pro.status} onChange={setStatus} />}
        </div>
        <div className="field"><label htmlFor="pn">Nom affiché aux jeunes</label><input id="pn" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        {pro.role === 'nurse' && <div className="field"><label htmlFor="ps">Spécialité</label><input id="ps" className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} /></div>}
        <div className="field"><label>Langues parlées</label>
          <div className="row">
            {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
              <label key={l} className="row small" style={{ gap: 6 }}>
                <input type="checkbox" checked={langs.includes(l)} onChange={(e) => setLangs(e.target.checked ? [...langs, l] : langs.filter((x) => x !== l))} /> {LANG_LABEL[l]}
              </label>
            ))}
          </div>
        </div>
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={save}>Enregistrer</button>
      </section>
      <section className="card row">
        <ShieldCheck color="var(--green)" />
        <div className="spacer">
          <strong>Validation en 2 étapes</strong>
          <div className="small muted">{factors === null ? '…' : factors > 0 ? 'Activée avec une application d’authentification.' : 'Non activée : elle sera demandée à la prochaine connexion.'}</div>
        </div>
        <span className={`pill ${factors ? 'good' : 'warning'}`}>{factors ? 'Activée' : 'À activer'}</span>
      </section>
    </div>
  );
}
