// Fonction Edge : génération de questions « Vrai ou Faux » par Gemini.
// Secrets requis (Supabase → Edge Functions → Secrets) : GEMINI_API_KEY ; facultatif : GEMINI_MODEL.
// Déploiement : supabase functions deploy ai-quiz
// Les questions sont créées en BROUILLON (source « ia ») : une infirmière les relit et les publie dans l'admin.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const ALLOWED = ['nurse', 'national_admin', 'super_admin'];
const DAILY_LIMIT = 30; // appels de génération par professionnel et par jour

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return json({ error: 'GEMINI_API_KEY manquante dans les secrets Supabase' }, 500);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: 'session requise' }, 401);
  const { data: me } = await admin.from('pros').select('role, must_change_password').eq('id', auth.user.id).maybeSingle();
  if (!me || me.must_change_password || !ALLOWED.includes(me.role)) return json({ error: 'réservé aux infirmières et administrateurs' }, 403);

  const { data: used } = await admin.rpc('ai_usage_hit', { p_user: auth.user.id, p_kind: 'quiz' });
  if (typeof used === 'number' && used > DAILY_LIMIT) return json({ error: 'limite quotidienne de génération atteinte' }, 429);

  const body = await req.json().catch(() => ({}));
  const count = Math.min(10, Math.max(1, Number(body.count) || 5));
  const theme = typeof body.topic === 'string' ? body.topic.slice(0, 80) : '';

  // On donne les questions existantes pour éviter les doublons.
  const { data: existing } = await admin.from('quiz_questions').select('statement').limit(60);
  const known = (existing ?? []).map((q: { statement: { fr?: string } }) => `- ${q.statement?.fr ?? ''}`).join('\n');

  const prompt = `Tu crées des questions pour le jeu « Vrai ou Faux » de Teranga Santé, une application de prévention du VIH
pour les jeunes de 18 à 35 ans au Sénégal. Objectif : démonter les rumeurs et donner des informations fiables.

Génère ${count} affirmations ${theme ? `sur le thème « ${theme} »` : 'variées (transmission, dépistage, autotest, préservatif, PrEP, traitement, I = I, IST, stigmatisation)'}.
Règles :
- En français simple, adapté à des jeunes, contexte sénégalais, tutoiement dans l'explication.
- Affirmation courte (max 15 mots). Mélange équilibré de vraies et de fausses.
- Explication en 1 ou 2 phrases, qui commence par « Vrai ! » ou « Faux ! », exacte selon les recommandations de l'OMS.
- Aucune information douteuse, aucun chiffre incertain, aucun nom de médicament ou de posologie, pas de contenu choquant.
- Ne reprends pas ces questions déjà existantes :
${known || '- (aucune)'}

Réponds UNIQUEMENT avec un tableau JSON :
[{"statement": "...", "answer": true, "explanation": "...", "topic": "transmission|depistage|prevention|prep|traitement|ist|stigmatisation"}]`;

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error('Gemini', res.status, detail.slice(0, 500));
    return json({ error: `IA indisponible (${res.status})` }, 502);
  }
  const out = await res.json();
  const text: string = out?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';

  let items: { statement?: unknown; answer?: unknown; explanation?: unknown; topic?: unknown }[] = [];
  try {
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
    items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : [];
  } catch {
    return json({ error: 'réponse de l’IA illisible, réessaie' }, 502);
  }

  const rows = items
    .filter((q) => typeof q.statement === 'string' && typeof q.answer === 'boolean' && typeof q.explanation === 'string')
    .slice(0, count)
    .map((q) => ({
      statement: { fr: String(q.statement).trim().slice(0, 200) },
      answer: q.answer as boolean,
      explanation: { fr: String(q.explanation).trim().slice(0, 400) },
      topic: typeof q.topic === 'string' ? q.topic.slice(0, 30) : null,
      published: false,
      source: 'ia',
      author_id: auth.user!.id,
    }));
  if (!rows.length) return json({ error: 'aucune question exploitable, réessaie' }, 502);

  const { error } = await admin.from('quiz_questions').insert(rows);
  if (error) return json({ error: error.message }, 400);
  await admin.from('activity_log').insert({ actor_id: auth.user.id, action: 'content.quiz.ai_generate', entity: 'quiz_questions', entity_id: String(rows.length) });
  return json({ ok: true, inserted: rows.length });
});
