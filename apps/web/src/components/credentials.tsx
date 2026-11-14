import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';

// Sans caractères ambigus (0/O, 1/l/I) pour être dicté ou recopié sans erreur.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generatePassword(length = 10) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Règles communes à tous les mots de passe. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return '8 caractères minimum';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'au moins une lettre et un chiffre';
  return null;
}

export function TempPasswordField({ value, onChange, id = 'tmp-pw' }: { value: string; onChange: (v: string) => void; id?: string }) {
  const [show, setShow] = useState(true);
  const problem = value ? passwordProblem(value) : null;
  return (
    <div className="field">
      <label htmlFor={id}>Mot de passe provisoire</label>
      <div className="row">
        <div className="search" style={{ maxWidth: 'none', flex: 1, padding: '8px 14px' }}>
          <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="new-password" style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 1 }} />
          <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? 'Masquer' : 'Afficher'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
        <button type="button" className="btn light sm" onClick={() => onChange(generatePassword())}><RefreshCw size={14} /> Générer</button>
      </div>
      <span className="small" style={{ color: problem ? 'var(--red)' : 'var(--muted)' }}>
        {problem ?? 'La personne devra le remplacer par son propre mot de passe à sa première connexion.'}
      </span>
    </div>
  );
}

/** Identifiants à transmettre (affichés une seule fois, jamais stockés en clair). */
export function CredentialsCard({ name, email, password, onDone }: { name: string; email: string; password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Teranga Santé — espace professionnel\nIdentifiant : ${email}\nMot de passe provisoire : ${password}\nÀ ta première connexion, tu choisiras ton propre mot de passe.`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="banner info small"><span>Compte de <strong>{name}</strong> prêt. Transmets-lui ces identifiants (en main propre, SMS ou appel) : le mot de passe ne sera plus affiché.</span></div>
      <div className="card" style={{ background: 'var(--cream)', boxShadow: 'none', fontSize: 15, lineHeight: 1.9 }}>
        <div>Identifiant : <strong>{email}</strong></div>
        <div>Mot de passe provisoire : <strong style={{ fontFamily: 'monospace', fontSize: 17, letterSpacing: 1 }}>{password}</strong></div>
      </div>
      <div className="row">
        <button
          className="btn light"
          onClick={async () => {
            await navigator.clipboard?.writeText(text).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier les identifiants</>}
        </button>
        <span className="spacer" />
        <button className="btn" onClick={onDone}>Terminé</button>
      </div>
    </div>
  );
}
