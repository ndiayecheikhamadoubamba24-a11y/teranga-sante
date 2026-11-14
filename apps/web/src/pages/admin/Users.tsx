import { KeyRound, Pencil, Power, Search, ShieldOff, UserPlus } from 'lucide-react';
import { CredentialsCard, generatePassword, passwordProblem, TempPasswordField } from '../../components/credentials';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Empty, Modal, StatusPill, initials, useToast } from '../../components/ui';
import { usePro } from '../../lib/auth';
import { ROLE_LABEL } from '../../lib/format';
import { manageUsers } from '../../lib/manageUsers';
import { supabase, type Pro, type ProRole } from '../../lib/supabase';

type Account = Pro & { email: string | null; last_sign_in_at: string | null; disabled: boolean };
type CentreRow = { id: string; name: string };

const ROLES: ProRole[] = ['nurse', 'manager', 'national_admin', 'super_admin'];
const NEEDS_CENTRE: ProRole[] = ['nurse', 'manager'];
const ROLE_TONE: Record<ProRole, string> = { nurse: 'good', manager: 'info', national_admin: 'warning', super_admin: 'critical' };

// Super admin — gestion de tous les comptes professionnels.
export default function Users() {
  const me = usePro();
  const toast = useToast();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [centres, setCentres] = useState<CentreRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<ProRole | ''>('');
  const [centre, setCentre] = useState('');
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [resetting, setResetting] = useState<Account | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { users } = await manageUsers<{ users: Account[] }>({ action: 'list' });
      setAccounts(users.sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || a.display_name.localeCompare(b.display_name)));
    } catch (e) {
      setError(`${(e as Error).message}. Vérifie que la fonction « manage-users » est déployée.`);
      // Repli : liste sans email depuis la table pros
      const { data } = await supabase.from('pros').select('*, centre:centres(name)');
      setAccounts(((data as Pro[]) ?? []).map((p) => ({ ...p, email: null, last_sign_in_at: null, disabled: false })));
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from('centres').select('id, name').order('name').then(({ data }) => setCentres((data as CentreRow[]) ?? []));
  }, []);

  const list = useMemo(() => (accounts ?? []).filter((a) => {
    if (role && a.role !== role) return false;
    if (centre && a.centre_id !== centre) return false;
    const s = q.trim().toLowerCase();
    return !s || `${a.display_name} ${a.email ?? ''}`.toLowerCase().includes(s);
  }), [accounts, q, role, centre]);

  const counts = useMemo(() => Object.fromEntries(ROLES.map((r) => [r, (accounts ?? []).filter((a) => a.role === r).length])), [accounts]);

  async function act(a: Account, action: 'disable' | 'enable') {
    const label = { disable: `Désactiver le compte de ${a.display_name} ? Il ne pourra plus se connecter.`, enable: `Réactiver le compte de ${a.display_name} ?` }[action];
    if (!confirm(label)) return;
    try {
      await manageUsers({ action, id: a.id });
      toast('C’est fait');
      load();
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Utilisateurs</h1>
        <button className="btn" onClick={() => setEditing('new')}><UserPlus size={18} /> Créer un utilisateur</button>
      </div>

      <div className="grid grid-4">
        {ROLES.map((r) => (
          <button key={r} className="card" onClick={() => setRole(role === r ? '' : r)} style={{ border: role === r ? '2px solid var(--green)' : '2px solid transparent', textAlign: 'left' }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{counts[r] ?? 0}</div>
            <div className="small muted">{ROLE_LABEL[r]}{(counts[r] ?? 0) > 1 ? 's' : ''}</div>
          </button>
        ))}
      </div>

      {error && <div className="banner warning small">{error}</div>}

      <section className="card">
        <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <label className="search"><Search size={16} /><input placeholder="Nom ou email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" /></label>
          <select className="select" style={{ width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value as ProRole | '')} aria-label="Rôle">
            <option value="">Tous les rôles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={centre} onChange={(e) => setCentre(e.target.value)} aria-label="Centre">
            <option value="">Tous les centres</option>
            {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {accounts === null ? <span className="muted">Chargement…</span> : list.length === 0 ? <Empty title="Aucun utilisateur" /> : (
          <table className="table">
            <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Centre</th><th>Dernière connexion</th><th>État</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} style={{ opacity: a.disabled ? 0.55 : 1 }}>
                  <td>
                    <div className="row">
                      <div className="avatar">{initials(a.display_name)}</div>
                      <div>
                        <strong>{a.display_name}{a.id === me.id && <span className="small muted"> (moi)</span>}</strong>
                        <div className="small muted">{a.email ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`pill ${ROLE_TONE[a.role]} no-dot`}>{ROLE_LABEL[a.role]}</span></td>
                  <td className="small">{a.centre?.name ?? <span className="muted">National</span>}</td>
                  <td className="small">{a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : <span className="muted">Jamais</span>}</td>
                  <td>{a.disabled ? <span className="pill muted">Désactivé</span> : a.must_change_password ? <span className="pill warning" title="La personne doit choisir son mot de passe à sa prochaine connexion">Mot de passe provisoire</span> : NEEDS_CENTRE.includes(a.role) ? <StatusPill status={a.status} /> : <span className="pill good">Actif</span>}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" title="Modifier" aria-label={`Modifier ${a.display_name}`} onClick={() => setEditing(a)}><Pencil size={17} /></button>
                    {a.id !== me.id && <button className="icon-btn" title="Nouveau mot de passe provisoire" aria-label={`Réinitialiser le mot de passe de ${a.display_name}`} onClick={() => setResetting(a)}><KeyRound size={17} /></button>}
                    {a.id !== me.id && (a.disabled
                      ? <button className="icon-btn" title="Réactiver" aria-label={`Réactiver ${a.display_name}`} onClick={() => act(a, 'enable')}><Power size={17} color="var(--green)" /></button>
                      : <button className="icon-btn" title="Désactiver" aria-label={`Désactiver ${a.display_name}`} onClick={() => act(a, 'disable')}><ShieldOff size={17} color="var(--red)" /></button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {resetting && <ResetPasswordModal account={resetting} onClose={() => { setResetting(null); load(); }} />}
      {editing && <UserModal account={editing === 'new' ? null : editing} centres={centres} isMe={editing !== 'new' && editing.id === me.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function UserModal({ account, centres, isMe, onClose, onSaved }: { account: Account | null; centres: CentreRow[]; isMe: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState(account?.display_name ?? '');
  const [specialty, setSpecialty] = useState(account?.specialty ?? '');
  const [role, setRole] = useState<ProRole>(account?.role ?? 'nurse');
  const [centreId, setCentreId] = useState(account?.centre_id ?? centres[0]?.id ?? '');
  const [password, setPassword] = useState(() => generatePassword());
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const needsCentre = NEEDS_CENTRE.includes(role);
  const valid = name.trim().length >= 2 && (!needsCentre || !!centreId) && (account || (email.includes('@') && !passwordProblem(password)));

  const save = async () => {
    setBusy(true);
    try {
      if (account) {
        await manageUsers({ action: 'update', id: account.id, display_name: name, specialty, role, centre_id: needsCentre ? centreId : null });
        toast('Compte mis à jour');
        onSaved();
      } else {
        await manageUsers({ action: 'create', email: email.trim().toLowerCase(), password, display_name: name, specialty, role, centre_id: needsCentre ? centreId : null });
        setCreated(true);
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={account ? `Modifier ${account.display_name}` : created ? 'Compte créé' : 'Créer un utilisateur'} onClose={created ? onSaved : onClose}>
      {created ? <CredentialsCard name={name} email={email.trim().toLowerCase()} password={password} onDone={onSaved} /> : <>
      {!account && <div className="field"><label htmlFor="ue">Email professionnel</label><input id="ue" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
      <div className="field"><label htmlFor="un">Nom affiché</label><input id="un" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="ur">Rôle</label>
          <select id="ur" className="select" value={role} disabled={isMe} onChange={(e) => setRole(e.target.value as ProRole)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="uc">Centre</label>
          <select id="uc" className="select" value={needsCentre ? centreId : ''} disabled={!needsCentre} onChange={(e) => setCentreId(e.target.value)}>
            {!needsCentre && <option value="">National (aucun centre)</option>}
            {centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      {role === 'nurse' && <div className="field"><label htmlFor="us">Spécialité</label><input id="us" className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="ex : Dépistage et PrEP" /></div>}
      {role === 'super_admin' && <div className="banner critical small">Le super admin a accès à toute la plateforme (sauf aux conversations des jeunes). Attribue ce rôle avec prudence.</div>}
      {isMe && <p className="small muted" style={{ margin: 0 }}>Tu ne peux pas modifier ton propre rôle.</p>}
      {!account && <TempPasswordField value={password} onChange={setPassword} />}
      <button className="btn lg" disabled={busy || !valid} onClick={save}>{account ? 'Enregistrer' : <><UserPlus size={18} /> Créer le compte</>}</button>
      </>}
    </Modal>
  );
}

/** Mot de passe oublié : le super admin donne un nouveau mot de passe provisoire. */
function ResetPasswordModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState(() => generatePassword());
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    setBusy(true);
    try {
      await manageUsers({ action: 'reset_password', id: account.id, password });
      setDone(true);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Nouveau mot de passe — ${account.display_name}`} onClose={onClose}>
      {done ? <CredentialsCard name={account.display_name} email={account.email ?? ''} password={password} onDone={onClose} /> : <>
        <p className="small muted" style={{ margin: 0 }}>L’ancien mot de passe ne fonctionnera plus. À sa prochaine connexion, {account.display_name} devra choisir un nouveau mot de passe personnel.</p>
        <TempPasswordField value={password} onChange={setPassword} id="reset-pw" />
        <button className="btn lg" disabled={busy || !!passwordProblem(password)} onClick={reset}><KeyRound size={18} /> Réinitialiser</button>
      </>}
    </Modal>
  );
}
