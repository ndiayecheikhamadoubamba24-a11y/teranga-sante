import { FileCheck2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LEGAL } from '../lib/legal';
import { logAction, supabase } from '../lib/supabase';

/** Case d'acceptation des CGU (jamais pré-cochée), réutilisée à la première connexion. */
export function TermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="row small" style={{ alignItems: 'flex-start', gap: 8, fontWeight: 500 }}>
      <input type="checkbox" required checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3 }} />
      <span>
        J’ai lu et j’accepte les <Link to="/cgu" target="_blank" className="link">conditions d’utilisation</Link>, notamment mes
        engagements de confidentialité, et j’ai pris connaissance de la{' '}
        <Link to="/confidentialite" target="_blank" className="link">politique de confidentialité</Link>. <span aria-hidden="true">*</span>
      </span>
    </label>
  );
}

/** Enregistre l'acceptation de la version en vigueur des CGU pour le professionnel connecté. */
export async function acceptTerms(proId: string) {
  const { error } = await supabase.from('pros').update({ terms_version: LEGAL.termsVersion, terms_accepted_at: new Date().toISOString() }).eq('id', proId);
  if (!error) logAction('auth.terms_accepted', 'pros', LEGAL.termsVersion);
  return error;
}

/** Bloque l'espace professionnel tant que la version en vigueur des CGU n'est pas acceptée. */
export function TermsGate({ children }: { children: ReactNode }) {
  const { pro, refresh, signOut } = useAuth();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!pro || pro.terms_version === LEGAL.termsVersion) return <>{children}</>;

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--cream)' }}>
      <form
        className="card"
        style={{ width: 'min(560px, 100%)', display: 'grid', gap: 16 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const err = await acceptTerms(pro.id);
          setBusy(false);
          if (err) return setError(/terms_version/.test(err.message) ? 'Base de données pas à jour : exécutez la migration 20261124000000_privacy.sql.' : err.message);
          await refresh();
        }}
      >
        <h1 style={{ fontSize: 22, display: 'flex', gap: 8, alignItems: 'center' }}><FileCheck2 aria-hidden="true" /> Conditions d’utilisation</h1>
        <p style={{ margin: 0 }}>
          {pro.terms_version ? 'Les conditions d’utilisation ont été mises à jour.' : 'Avant de continuer, merci de lire et d’accepter les conditions d’utilisation de l’espace professionnel.'}{' '}
          Elles rappellent vos engagements : secret professionnel, aucune demande d’identité aux jeunes, numéro professionnel uniquement,
          validation des contenus avant publication.
        </p>
        <TermsCheckbox checked={ok} onChange={setOk} />
        {error && <div className="banner critical small" role="alert">{error}</div>}
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn light" onClick={() => signOut()}>Se déconnecter</button>
          <button className="btn" disabled={!ok || busy}>{busy ? 'Enregistrement…' : 'Accepter et continuer'}</button>
        </div>
      </form>
    </main>
  );
}
