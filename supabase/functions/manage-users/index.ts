// Fonction Edge : gestion des comptes professionnels.
//  - super admin : lister, inviter (tout rôle, tout centre), modifier, désactiver/réactiver
//  - responsable de centre : inviter une infirmière dans SON centre uniquement
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
  const { data: me } = await admin.from('pros').select('role, centre_id').eq('id', caller.user.id).single();
  if (!me) return json({ error: 'accès refusé' }, 403);
  const isSuper = me.role === 'super_admin';

  const body = await req.json().catch(() => ({}));
  const action = body.action ?? 'invite';
  const log = (a: string, id: string) => admin.from('activity_log').insert({ actor_id: caller.user!.id, action: a, entity: 'pros', entity_id: id });
  const superCount = async () => (await admin.from('pros').select('id', { count: 'exact', head: true }).eq('role', 'super_admin')).count ?? 0;

  // ---------- Invitation ----------
  if (action === 'invite') {
    const { email, display_name, specialty } = body;
    let role: string = body.role ?? 'nurse';
    let centre_id: string | null = body.centre_id ?? null;
    if (!isSuper) {
      if (me.role !== 'manager') return json({ error: 'réservé aux responsables et au super admin' }, 403);
      role = 'nurse';
      centre_id = me.centre_id;
    }
    if (typeof email !== 'string' || !email.includes('@') || typeof display_name !== 'string' || display_name.trim().length < 2) return json({ error: 'email et nom requis' }, 400);
    if (!ROLES.includes(role)) return json({ error: 'rôle inconnu' }, 400);
    if (NEEDS_CENTRE.includes(role) && !centre_id) return json({ error: 'un centre est requis pour ce rôle' }, 400);
    if (!NEEDS_CENTRE.includes(role)) centre_id = null;

    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase());
    if (error || !invited.user) return json({ error: error?.message ?? 'invitation impossible' }, 400);
    const { error: e2 } = await admin.from('pros').upsert({
      id: invited.user.id, role, centre_id, display_name: display_name.trim(), specialty: specialty || null, languages: ['fr'], status: 'away',
    });
    if (e2) return json({ error: e2.message }, 400);
    await log(`team.invite.${role}`, invited.user.id);
    return json({ ok: true, id: invited.user.id });
  }

  if (!isSuper) return json({ error: 'réservé au super admin' }, 403);

  // ---------- Liste des comptes (avec email, dernière connexion, désactivation) ----------
  if (action === 'list') {
    const { data: pros } = await admin.from('pros').select('*, centre:centres(name)');
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
  const { data: target } = await admin.from('pros').select('role').eq('id', id).single();
  if (!target) return json({ error: 'compte introuvable' }, 404);
  const removingSuper = target.role === 'super_admin';

  // ---------- Modification ----------
  if (action === 'update') {
    const patch: Record<string, unknown> = {};
    if (body.display_name) patch.display_name = String(body.display_name).trim();
    if ('specialty' in body) patch.specialty = body.specialty || null;
    if (body.role) {
      if (!ROLES.includes(body.role)) return json({ error: 'rôle inconnu' }, 400);
      if (id === caller.user.id && body.role !== 'super_admin') return json({ error: 'tu ne peux pas retirer ton propre rôle de super admin' }, 400);
      if (removingSuper && body.role !== 'super_admin' && (await superCount()) <= 1) return json({ error: 'il doit rester au moins un super admin' }, 400);
      patch.role = body.role;
    }
    const role = (patch.role ?? target.role) as string;
    if ('centre_id' in body || patch.role) patch.centre_id = NEEDS_CENTRE.includes(role) ? body.centre_id ?? null : null;
    if (NEEDS_CENTRE.includes(role) && !patch.centre_id && 'centre_id' in patch) return json({ error: 'un centre est requis pour ce rôle' }, 400);
    const { error } = await admin.from('pros').update(patch).eq('id', id);
    if (error) return json({ error: error.message }, 400);
    await log('user.update', id);
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
