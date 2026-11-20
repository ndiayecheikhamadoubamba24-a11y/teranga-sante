// Fonction Edge : « Effacer toutes mes données » depuis l'application mobile.
// Efface immédiatement le compte anonyme de l'appelant et tout ce qui lui est lié (voir _shared/erase.ts).
// Déploiement : supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { eraseYouthAccount } from '../_shared/erase.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'méthode non autorisée' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: 'session requise' }, 401);

  try {
    await eraseYouthAccount(admin, auth.user.id);
    return json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'compte professionnel') return json({ error: 'Un compte professionnel se supprime depuis l’espace professionnel.' }, 403);
    console.error('delete-account', msg);
    return json({ error: 'Effacement impossible pour le moment. Réessaie plus tard.' }, 500);
  }
});
