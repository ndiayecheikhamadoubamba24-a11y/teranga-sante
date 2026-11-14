import { KeyRound, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { manageUsers } from '../lib/manageUsers';
import { CredentialsCard, generatePassword, passwordProblem, TempPasswordField } from './credentials';
import { Modal, useToast } from './ui';

type Member = { id: string; display_name: string; specialty: string | null; email: string | null; phone?: string | null };

/**
 * Création ou modification d'une infirmière. Le serveur impose le centre :
 * un responsable ne crée / modifie que dans son propre centre ; le super admin passe `centreId`.
 */
export function NurseModal({ member, centreId, centreName, onClose, onSaved }: {
  member: Member | null; centreId: string; centreName: string; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState(member?.display_name ?? '');
  const [specialty, setSpecialty] = useState(member?.specialty ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [password, setPassword] = useState(() => generatePassword());
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const valid = name.trim().length >= 2 && (member || (email.includes('@') && !passwordProblem(password)));

  const save = async () => {
    setBusy(true);
    try {
      if (member) {
        await manageUsers({ action: 'update', id: member.id, display_name: name, specialty, phone });
        toast('Fiche mise à jour');
        onSaved();
      } else {
        await manageUsers({ action: 'create', email: email.trim().toLowerCase(), password, display_name: name, specialty, phone, role: 'nurse', centre_id: centreId });
        setCreated(true);
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Modal title="Compte créé" onClose={onSaved}>
        <CredentialsCard name={name} email={email.trim().toLowerCase()} password={password} onDone={onSaved} />
      </Modal>
    );
  }

  return (
    <Modal title={member ? `Modifier ${member.display_name}` : `Nouvelle infirmière · ${centreName}`} onClose={onClose}>
      {!member && <div className="field"><label htmlFor="nm-e">Email professionnel</label><input id="nm-e" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
      <div className="field"><label htmlFor="nm-n">Nom affiché aux jeunes</label><input id="nm-n" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex : Awa Diop" /></div>
      <div className="field"><label htmlFor="nm-t">Numéro professionnel (facultatif)</label><input id="nm-t" className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ex : 77 123 45 67" /><span className="small muted">Affiché aux jeunes sur la page du poste quand l’infirmière est disponible.</span></div>
      <div className="field"><label htmlFor="nm-s">Spécialité</label><input id="nm-s" className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="ex : Dépistage et PrEP" /></div>
      {!member && <TempPasswordField value={password} onChange={setPassword} id="nm-p" />}
      <button className="btn lg" disabled={busy || !valid} onClick={save}>{member ? 'Enregistrer' : <><UserPlus size={18} /> Créer le compte</>}</button>
    </Modal>
  );
}

/** Mot de passe oublié : nouveau mot de passe provisoire, à changer à la prochaine connexion. */
export function ResetPasswordModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState(() => generatePassword());
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    setBusy(true);
    try {
      await manageUsers({ action: 'reset_password', id: member.id, password });
      setDone(true);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Nouveau mot de passe — ${member.display_name}`} onClose={onClose}>
      {done ? <CredentialsCard name={member.display_name} email={member.email ?? ''} password={password} onDone={onClose} /> : <>
        <p className="small muted" style={{ margin: 0 }}>L’ancien mot de passe ne fonctionnera plus. À sa prochaine connexion, {member.display_name} devra choisir un nouveau mot de passe personnel.</p>
        <TempPasswordField value={password} onChange={setPassword} id="reset-pw" />
        <button className="btn lg" disabled={busy || !!passwordProblem(password)} onClick={reset}><KeyRound size={18} /> Réinitialiser</button>
      </>}
    </Modal>
  );
}
