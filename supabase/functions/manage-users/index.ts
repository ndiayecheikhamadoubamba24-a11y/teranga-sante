// Fonction Edge : gestion des comptes professionnels.
//  - super admin : lister, créer (tout rôle, tout centre) avec mot de passe provisoire, modifier,
//    réinitialiser le mot de passe, désactiver/réactiver
//  - responsable de centre : créer, modifier (nom, spécialité), réinitialiser le mot de passe,
//    désactiver/réactiver les infirmières de SON centre uniquement
// Le mot de passe provisoire doit être changé à la 1re connexion (voir migration 20261118000000_temp_password.sql).
// Déploiement : supabase functions deploy manage-users
// La clé service (SUPABASE_SERVICE_ROLE_KEY) est fournie par Supabase et ne quitte jamais le serveur.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const ROLES = ['nurse', 'manager', 'national_admin', 'super_admin'];
const NEEDS_CENTRE = ['nurse', 'manager'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller.user) return json({ error: 'non authentifié' }, 401);
  const { data: me, error: meErr } = await admin.from('pros').select('role, centre_id, must_change_password').eq('id', caller.user.id).maybeSingle();
  if (meErr) return json({ error: `base de données pas à jour (${meErr.message}) : exécute les migrations` }, 500);
  if (!me || me.must_change_password) return json({ error: 'accès refusé' }, 403);
  const isSuper = me.role === 'super_admin';

  const body = await req.json().catch(() => ({}));
  const action = body.action;
  const log = (a: string, id: string) => admin.from('activity_log').insert({ actor_id: caller.user!.id, action: a, entity: 'pros', entity_id: id });
  const superCount = async () => (await admin.from('pros').select('id', { count: 'exact', head: true }).eq('role', 'super_admin')).count ?? 0;

  // ---------- Création d'un compte avec mot de passe provisoire ----------
  // Le compte est confirmé d'office ; la personne devra choisir son propre mot de passe à la 1re connexion.
  if (action === 'create') {
    const { email, password, display_name, specialty } = body;
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
    if (phone && !/^[0-9 +().-]{7,20}$/.test(phone)) return json({ error: 'numéro invalide' }, 400);
    let role: string = body.role ?? 'nurse';
    let centre_id: string | null = body.centre_id ?? null;
    if (!isSuper) {
      if (me.role !== 'manager') return json({ error: 'réservé aux responsables et au super admin' }, 403);
      role = 'nurse';
      centre_id = me.centre_id;
    }
    if (typeof email !== 'string' || !email.includes('@') || typeof display_name !== 'string' || display_name.trim().length < 2) return json({ error: 'email et nom requis' }, 400);
    if (typeof password !== 'string' || password.length < 8) return json({ error: 'mot de passe provisoire : 8 caractères minimum' }, 400);
    if (!ROLES.includes(role)) return json({ error: 'rôle inconnu' }, 400);
    if (NEEDS_CENTRE.includes(role) && !centre_id) return json({ error: 'un centre est requis pour ce rôle' }, 400);
    if (!NEEDS_CENTRE.includes(role)) centre_id = null;

    const { data: created, error } = await admin.auth.admin.createUser({ email: email.trim().toLowerCase(), password, email_confirm: true });
    if (error || !created.user) {
      const msg = error?.message?.includes('already') ? 'un compte existe déjà avec cet email' : error?.message ?? 'création impossible';
      return json({ error: msg }, 400);
    }
    const { error: e2 } = await admin.from('pros').upsert({
      id: created.user.id, role, centre_id, display_name: display_name.trim(), specialty: specialty || null, phone, languages: ['fr'], status: 'away',
    });
    if (e2) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: e2.message }, 400);
    }
    const { error: e3 } = await admin.rpc('mark_temp_password', { p_user_id: created.user.id });
    if (e3) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: `mark_temp_password : ${e3.message}` }, 500);
    }
    await log(`user.create.${role}`, created.user.id);
    return json({ ok: true, id: created.user.id });
  }

  // Au-delà de la création : super admin (tous les comptes) ou responsable (infirmières de SON centre).
  const isManager = me.role === 'manager' && !!me.centre_id;
  if (!isSuper && !isManager) return json({ error: 'réservé au super admin et aux responsables de centre' }, 403);

  // ---------- Liste des comptes (avec email, dernière connexion, désactivation) ----------
  if (action === 'list') {
    let q = admin.from('pros').select('*, centre:centres(name)');
    if (!isSuper) q = q.eq('centre_id', me.centre_id);
    const { data: pros } = await q;
    const users: Record<string, unknown>[] = [];
    for (let page = 1; page < 20; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      users.push(...(data?.users ?? []));
      if (!data || data.users.length < 1000) break;
    }
    const byId = new Map(users.map((u) => [u.id as string, u]));
    return json({
      users: (pros ?? []).map((p) => {
        const u = byId.get(p.id) as { email?: string; last_sign_in_at?: string; banned_until?: string } | undefined;
        return {
          ...p,
          email: u?.email ?? null,
          last_sign_in_at: u?.last_sign_in_at ?? null,
          disabled: !!u?.banned_until && new Date(u.banned_until) > new Date(),
        };
      }),
    });
  }

  const id: string = body.id;
  if (!id) return json({ error: 'identifiant requis' }, 400);
  const { data: target } = await admin.from('pros').select('role, centre_id').eq('id', id).single();
  if (!target) return json({ error: 'compte introuvable' }, 404);
  // Un responsable n'agit que sur les infirmières de son propre centre.
  if (!isSuper && (target.role !== 'nurse' || target.centre_id !== me.centre_id)) {
    return json({ error: 'tu ne peux gérer que les infirmières de ton centre' }, 403);
  }
  const removingSuper = target.role === 'super_admin';

  // ---------- Modification ----------
  if (action === 'update') {
    const patch: Record<string, unknown> = {};
    if (body.display_name) patch.display_name = String(body.display_name).trim();
    if ('specialty' in body) patch.specialty = body.specialty || null;
    if ('phone' in body) {
      const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;
      if (phone && !/^[0-9 +().-]{7,20}$/.test(phone)) return json({ error: 'numéro invalide' }, 400);
      patch.phone = phone;
    }
    if (body.role && !isSuper && body.role !== target.role) return json({ error: 'seul le super admin peut changer un rôle' }, 403);
    if ('centre_id' in body && !isSuper && body.centre_id !== target.centre_id) return json({ error: 'seul le super admin peut changer le centre' }, 403);
    if (body.role && isSuper) {
      if (!ROLES.includes(body.role)) return json({ error: 'rôle inconnu' }, 400);
      if (id === caller.user.id && body.role !== 'super_admin') return json({ error: 'tu ne peux pas retirer ton propre rôle de super admin' }, 400);
      if (removingSuper && body.role !== 'super_admin' && (await superCount()) <= 1) return json({ error: 'il doit rester au moins un super admin' }, 400);
      patch.role = body.role;
    }
    const role = (patch.role ?? target.role) as string;
    if (isSuper && ('centre_id' in body || patch.role)) patch.centre_id = NEEDS_CENTRE.includes(role) ? body.centre_id ?? null : null;
    if (NEEDS_CENTRE.includes(role) && !patch.centre_id && 'centre_id' in patch) return json({ error: 'un centre est requis pour ce rôle' }, 400);
    const { error } = await admin.from('pros').update(patch).eq('id', id);
    if (error) return json({ error: error.message }, 400);
    await log('user.update', id);
    return json({ ok: true });
  }

  // ---------- Nouveau mot de passe provisoire (mot de passe oublié) ----------
  if (action === 'reset_password') {
    if (id === caller.user.id) return json({ error: 'change ton propre mot de passe depuis ton profil' }, 400);
    if (typeof body.password !== 'string' || body.password.length < 8) return json({ error: 'mot de passe provisoire : 8 caractères minimum' }, 400);
    const { error } = await admin.auth.admin.updateUserById(id, { password: body.password });
    if (error) return json({ error: error.message }, 400);
    const { error: e3 } = await admin.rpc('mark_temp_password', { p_user_id: id });
    if (e3) return json({ error: `mark_temp_password : ${e3.message}` }, 500);
    await log('user.reset_password', id);
    return json({ ok: true });
  }

  // ---------- Désactivation / réactivation ----------
  if (action === 'disable' || action === 'enable') {
    if (id === caller.user.id) return json({ error: 'tu ne peux pas désactiver ton propre compte' }, 400);
    if (action === 'disable' && removingSuper && (await superCount()) <= 1) return json({ error: 'il doit rester au moins un super admin' }, 400);
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: action === 'disable' ? '876000h' : 'none' });
    if (error) return json({ error: error.message }, 400);
    if (action === 'disable') await admin.from('pros').update({ status: 'away' }).eq('id', id);
    await log(`user.${action}`, id);
    return json({ ok: true });
  }

  return json({ error: 'action inconnue' }, 400);
});
