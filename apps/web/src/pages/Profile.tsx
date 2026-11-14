import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { passwordProblem } from '../components/credentials';
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


  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const changePassword = async () => {
    const problem = passwordProblem(pw);
    if (problem) return toast(`Mot de passe trop faible : ${problem}.`);
    if (pw !== pw2) return toast('Les deux mots de passe ne sont pas identiques.');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast(error.message);
    logAction('auth.password_changed');
    setPw('');
    setPw2('');
    toast('Mot de passe modifié');
  };

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
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row"><KeyRound size={18} color="var(--green)" /><strong>Changer mon mot de passe</strong></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <input className="input" type="password" autoComplete="new-password" placeholder="Nouveau mot de passe" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Nouveau mot de passe" />
          <input className="input" type="password" autoComplete="new-password" placeholder="Confirmer" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-label="Confirmer le mot de passe" />
        </div>
        <button className="btn light" style={{ alignSelf: 'flex-start' }} disabled={!pw} onClick={changePassword}>Mettre à jour</button>
      </section>
    </div>
  );
}
