// Fonction Edge : applique chaque jour les durées de conservation (politique de confidentialité).
// Secret requis (Supabase → Edge Functions → Secrets) : CRON_SECRET (une longue chaîne aléatoire).
// Déploiement : supabase functions deploy purge-data
// Planification : Supabase → Integrations → Cron → nouvelle tâche quotidienne de type « Supabase Edge Function »
// qui appelle purge-data en POST avec l'en-tête  x-cron-secret: <CRON_SECRET>  (voir README).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { eraseYouthAccount, removeVoiceFolder } from '../_shared/erase.ts';

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'non autorisé' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.rpc('purge_expired_data');
  if (error) return json({ error: error.message }, 500);

  const report = data as { voice_folders: string[]; stale_users: string[]; [k: string]: unknown };
  const failures: string[] = [];
  for (const folder of report.voice_folders ?? []) {
    try { await removeVoiceFolder(admin, folder); } catch (e) { failures.push(`voice:${folder}:${(e as Error).message}`); }
  }
  let users = 0;
  for (const id of report.stale_users ?? []) {
    try { await eraseYouthAccount(admin, id); users++; } catch (e) { failures.push(`user:${id}:${(e as Error).message}`); }
  }
  const { voice_folders: _v, stale_users: _s, ...counts } = report;
  console.log('purge-data', JSON.stringify({ ...counts, users, failures: failures.length }));
  return json({ ok: failures.length === 0, ...counts, users, failures });
});
