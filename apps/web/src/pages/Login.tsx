import { KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Baobi } from '../components/Baobi';
import { Village, WaxBand } from '../components/Decor';
import { HOME_BY_ROLE } from '../components/Layout';
import { Logo } from '../components/ui';
import { currentAal, fetchPro, MFA_OPTIONAL, useAuth } from '../lib/auth';
import { logAction, setRemember, supabase } from '../lib/supabase';

type Step = 'credentials' | 'challenge' | 'enroll';

// A1 — Connexion : identifiant professionnel, mot de passe, validation en 2 étapes (TOTP).
export default function Login() {
  const { session, pro, aal2, refresh } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRememberState] = useState(true);
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ svg: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Session déjà ouverte mais 2e étape manquante → reprendre à la vérification.
  useEffect(() => {
    if (session && pro && !aal2 && step === 'credentials') nextStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pro, aal2]);

  if (session && pro && (aal2 || MFA_OPTIONAL) && step === 'credentials') return <Navigate to={HOME_BY_ROLE[pro.role]} replace />;

  async function nextStep() {
    const aal = await currentAal();
    if (aal.current === 'aal2') return finish();
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find((f) => f.status === 'verified');
    if (totp) {
      setFactorId(totp.id);
      setStep('challenge');
      return;
    }
    if (MFA_OPTIONAL) return finish();
    // Première connexion : enrôlement de l'application d'authentification.
    const unverified = data?.all?.filter((f) => f.factor_type === 'totp' && f.status !== 'verified') ?? [];
    for (const f of unverified) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data: en, error: e } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Teranga Santé' });
    if (e || !en) return setError(e?.message ?? 'Impossible de configurer la validation en 2 étapes.');
    setFactorId(en.id);
    setQr({ svg: en.totp.qr_code, secret: en.totp.secret });
    setStep('enroll');
  }

  async function finish() {
    await refresh();
    const { data } = await supabase.auth.getUser();
    const p = data.user ? await fetchPro(data.user.id) : null;
    logAction('auth.login');
    navigate(p ? HOME_BY_ROLE[p.role] : '/', { replace: true });
  }

  async function submitCredentials(e: FormEvent) {
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
    await nextStep();
    setBusy(false);
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') });
    setBusy(false);
    if (err) return setError('Code invalide ou expiré. Réessaie avec le code affiché maintenant.');
    await finish();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--cream)' }}>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 0, overflow: 'hidden', width: 'min(920px, 100%)', minHeight: 540 }}>
        <div style={{ background: '#FFF1CC', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, position: 'relative' }}>
          <Logo size={200} />
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

        <div style={{ padding: '48px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          {step === 'credentials' && (
            <form onSubmit={submitCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                <ShieldCheck size={16} color="var(--green)" /> Authentification en 2 étapes
              </div>
            </form>
          )}

          {step === 'challenge' && (
            <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h1 style={{ fontSize: 22 }}>Validation en 2 étapes</h1>
              <p className="muted">Saisis le code à 6 chiffres affiché dans ton application d’authentification.</p>
              <label className="search" style={{ maxWidth: 'none', padding: '10px 16px' }}>
                <KeyRound size={18} />
                <input inputMode="numeric" autoComplete="one-time-code" autoFocus required placeholder="123 456" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code à 6 chiffres" style={{ letterSpacing: 4, fontWeight: 700 }} />
              </label>
              {error && <div className="banner critical small">{error}</div>}
              <button className="btn lg" disabled={busy || code.replace(/\s/g, '').length < 6}>Valider</button>
              <button type="button" className="link" onClick={async () => { await supabase.auth.signOut(); setStep('credentials'); }}>Changer de compte</button>
            </form>
          )}

          {step === 'enroll' && qr && (
            <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h1 style={{ fontSize: 22 }}>Active la validation en 2 étapes</h1>
              <p className="muted small" style={{ margin: 0 }}>
                1. Scanne ce QR code avec Google Authenticator, Microsoft Authenticator ou une application équivalente.
              </p>
              <img src={qr.svg} alt="QR code d’authentification" width={170} height={170} style={{ alignSelf: 'center', background: '#fff', borderRadius: 12 }} />
              <p className="small muted" style={{ margin: 0, textAlign: 'center', wordBreak: 'break-all' }}>Clé : {qr.secret}</p>
              <p className="muted small" style={{ margin: 0 }}>2. Saisis le code affiché :</p>
              <label className="search" style={{ maxWidth: 'none', padding: '10px 16px' }}>
                <KeyRound size={18} />
                <input inputMode="numeric" autoComplete="one-time-code" required placeholder="123 456" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code à 6 chiffres" style={{ letterSpacing: 4, fontWeight: 700 }} />
              </label>
              {error && <div className="banner critical small">{error}</div>}
              <button className="btn lg" disabled={busy || code.replace(/\s/g, '').length < 6}>Activer et continuer</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
