// Fonction Edge : un responsable de centre invite une infirmière dans SON centre.
// Déploiement : supabase functions deploy invite-member
// La clé service (SUPABASE_SERVICE_ROLE_KEY) est fournie automatiquement par Supabase et ne quitte jamais le serveur.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Qui appelle ? (jeton de l'utilisateur connecté)
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller.user) return json({ error: 'non authentifié' }, 401);
  const { data: me } = await admin.from('pros').select('role, centre_id').eq('id', caller.user.id).single();
  if (!me || me.role !== 'manager' || !me.centre_id) return json({ error: 'réservé aux responsables de centre' }, 403);

  const { email, display_name, specialty } = await req.json();
  if (typeof email !== 'string' || !email.includes('@') || typeof display_name !== 'string' || display_name.trim().length < 2) {
    return json({ error: 'email et nom requis' }, 400);
  }

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase());
  if (error || !invited.user) return json({ error: error?.message ?? 'invitation impossible' }, 400);

  const { error: e2 } = await admin.from('pros').upsert({
    id: invited.user.id, role: 'nurse', centre_id: me.centre_id, display_name: display_name.trim(), specialty: specialty || null, languages: ['fr'], status: 'away',
  });
  if (e2) return json({ error: e2.message }, 400);

  await admin.from('activity_log').insert({ actor_id: caller.user.id, action: 'team.invite', entity: 'pros', entity_id: invited.user.id });
  return json({ ok: true });
});
