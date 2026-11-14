import { ArrowLeft, KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Baobi } from '../components/Baobi';
import { Village, WaxBand } from '../components/Decor';
import { HOME_BY_ROLE } from '../components/Layout';
import { Logo } from '../components/ui';
import { passwordProblem } from '../components/credentials';
import { fetchPro, useAuth } from '../lib/auth';
import { logAction, setRemember, supabase } from '../lib/supabase';

// A1 — Connexion : identifiant professionnel (email) et mot de passe.
// 1re connexion avec le mot de passe provisoire du super admin → choix obligatoire d'un mot de passe personnel.
export default function Login() {
  const { session, pro, refresh } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRememberState] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const mustChange = !!(session && pro?.must_change_password);
  if (session && pro && !mustChange) return <Navigate to={HOME_BY_ROLE[pro.role]} replace />;

  async function submitNewPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = passwordProblem(newPw);
    if (problem) return setError(`Mot de passe trop faible : ${problem}.`);
    if (newPw !== confirmPw) return setError('Les deux mots de passe ne sont pas identiques.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPw });
    if (err) {
      setBusy(false);
      return setError(/different/i.test(err.message) ? 'Choisis un mot de passe différent de celui qu’on t’a donné.' : err.message);
    }
    const { data: ok } = await supabase.rpc('password_changed');
    if (!ok) {
      setBusy(false);
      return setError('Le mot de passe n’a pas pu être changé. Réessaie.');
    }
    logAction('auth.password_changed');
    await refresh();
    setBusy(false);
    if (pro) navigate(HOME_BY_ROLE[pro.role], { replace: true });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setRemember(remember);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err || !data.user) {
      setBusy(false);
      return setError('Identifiant ou mot de passe incorrect.');
    }
    const p = await fetchPro(data.user.id);
    if (!p) {
      await supabase.auth.signOut();
      setBusy(false);
      return setError('Ce compte n’a pas accès à l’espace professionnel.');
    }
    await refresh();
    setBusy(false);
    if (p.must_change_password) return; // l'écran « nouveau mot de passe » s'affiche
    logAction('auth.login');
    navigate(HOME_BY_ROLE[p.role], { replace: true });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 16, padding: 24, background: 'var(--cream)' }}>
      <Link to="/" className="link" style={{ width: 'min(920px, 100%)' }}><ArrowLeft size={14} /> Retour au site Teranga Santé</Link>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 0, overflow: 'hidden', width: 'min(920px, 100%)', minHeight: 540 }}>
        <div style={{ background: '#FFF1CC', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, position: 'relative' }}>
          <Logo size={170} />
          <p style={{ fontWeight: 600, textAlign: 'center', margin: '4px 24px 0' }}>Espace réservé aux<br />professionnels de santé</p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', position: 'relative', width: '100%', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 'auto 0 0 0' }}><Village height={130} /></div>
            <div style={{ position: 'relative', marginBottom: 6 }}><Baobi size={170} mood="thumb" /></div>
          </div>
          <div style={{ width: '100%', background: 'var(--sun)', textAlign: 'center', padding: '8px 0', fontWeight: 700, color: 'var(--green-dark)', fontStyle: 'italic' }}>
            Ensemble pour une jeunesse en bonne santé !
          </div>
          <WaxBand height={22} />
        </div>

        <div style={{ padding: '48px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {mustChange ? (
            <form onSubmit={submitNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h1 style={{ fontSize: 22 }}>Bienvenue {pro?.display_name} !</h1>
              <p className="muted" style={{ margin: 0 }}>
                Pour sécuriser ton compte, remplace le mot de passe provisoire qu’on t’a donné par ton <strong>mot de passe personnel</strong>.
              </p>
              <label className="search" style={{ maxWidth: 'none', padding: '10px 16px' }}>
                <KeyRound size={18} />
                <input type="password" autoComplete="new-password" required autoFocus placeholder="Nouveau mot de passe" value={newPw} onChange={(e) => setNewPw(e.target.value)} aria-label="Nouveau mot de passe" />
              </label>
              <label className="search" style={{ maxWidth: 'none', padding: '10px 16px' }}>
                <KeyRound size={18} />
                <input type="password" autoComplete="new-password" required placeholder="Confirmer le mot de passe" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} aria-label="Confirmer le mot de passe" />
              </label>
              <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                <li style={{ color: newPw.length >= 8 ? 'var(--green)' : undefined }}>8 caractères minimum</li>
                <li style={{ color: /[A-Za-z]/.test(newPw) && /[0-9]/.test(newPw) ? 'var(--green)' : undefined }}>au moins une lettre et un chiffre</li>
                <li style={{ color: newPw && newPw === confirmPw ? 'var(--green)' : undefined }}>les deux saisies identiques</li>
              </ul>
              {error && <div className="banner critical small">{error}</div>}
              <button className="btn lg" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer et accéder à mon compte'}</button>
              <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={() => supabase.auth.signOut()}>Ce n’est pas moi</button>
            </form>
          ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h1 style={{ fontSize: 24 }}>Connexion</h1>
            <label className="search" style={{ maxWidth: 'none', padding: '10px 16px' }}>
              <User size={18} />
              <input type="email" autoComplete="username" required placeholder="Email ou identifiant" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email ou identifiant" />
            </label>
            <label className="search" style={{ maxWidth: 'none', padding: '10px 16px' }}>
              <Lock size={18} />
              <input type="password" autoComplete="current-password" required placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Mot de passe" />
            </label>
            <label className="row small" style={{ fontWeight: 500 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRememberState(e.target.checked)} /> Se souvenir de moi
            </label>
            {error && <div className="banner critical small">{error}</div>}
            <button className="btn lg" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
            <div className="row small" style={{ justifyContent: 'center', fontWeight: 600 }}>
              <ShieldCheck size={16} color="var(--green)" /> Accès sécurisé et traçable
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
