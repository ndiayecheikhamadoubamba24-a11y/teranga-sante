// Fonction Edge : chatbot « Question sans honte » propulsé par Groq.
// Secrets requis (Supabase → Edge Functions → Secrets) : GROQ_API_KEY ; facultatif : GROQ_MODEL.
// Déploiement : supabase functions deploy ai-chat
// La clé Groq ne quitte jamais le serveur. Le contenu des questions n'est PAS enregistré (seul le sujet l'est).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const DAILY_LIMIT = 40;
const ACTIONS = ['none', 'centres', 'infirmieres', 'reserver', 'jeu', 'urgence'] as const;
const TOPICS = ['depister', 'proteger', 'prep', 'autotest', 'positif', 'traitement', 'ist', 'autre'] as const;
const ROUTES: Record<string, string | null> = { none: null, centres: '/carte', infirmieres: '/infirmieres', reserver: '/carte', jeu: '/jeu', urgence: 'urgence' };

const SYSTEM = `Tu es Baobi, l'assistant de Teranga Santé, une application pour les jeunes de 18 à 35 ans au Sénégal
(information VIH/IST, dépistage, prévention, traitement). Tu réponds à des questions anonymes, sans jugement.

RÈGLES ABSOLUES
- Réponds en 2 à 5 phrases courtes, simples, chaleureuses, en tutoyant. Pas de jargon. Pas de liste longue.
- Langue : réponds dans la langue de l'utilisateur (français, wolof ou pulaar). Si tu n'es pas sûr de bien écrire
  en wolof ou en pulaar, réponds en français simple.
- Tu ne poses JAMAIS de diagnostic, tu ne prescris rien, tu ne donnes aucune posologie. Tu orientes vers une infirmière
  ou un centre de dépistage pour tout cas personnel.
- Ne demande JAMAIS de nom, numéro, adresse ou toute information permettant d'identifier la personne. Si elle en donne,
  rappelle-lui gentiment de ne pas le faire.
- Rapport à risque récent (moins de 72 h) : dis clairement d'aller TOUT DE SUITE dans un centre de santé ou aux urgences
  pour le traitement post-exposition (TPE), qui doit commencer le plus tôt possible. action = "urgence".
- Détresse, idées suicidaires, violence ou danger immédiat : réponds avec empathie, invite à appeler le SAMU (1515) ou à
  parler à une infirmière tout de suite. action = "urgence".
- Informations fiables uniquement : le VIH ne se transmet ni par la salive, ni les moustiques, ni le partage de repas ;
  le préservatif protège ; la PrEP se prend sur prescription avec un suivi ; un autotest positif doit être confirmé en
  centre ; un traitement bien suivi permet de vivre longtemps ; charge virale indétectable = intransmissible (I = I).
  Si tu n'es pas sûr, dis-le et oriente vers une infirmière.
- Hors sujet (sans lien avec la santé) : réponds poliment en une phrase et ramène vers la santé.
- N'invente jamais d'adresse, de numéro ou de nom de centre : propose plutôt la carte des centres de l'application.

FORMAT DE SORTIE : un objet JSON uniquement, sans texte autour :
{"reply": "ta réponse", "action": "none|centres|infirmieres|reserver|jeu|urgence", "topic": "depister|proteger|prep|autotest|positif|traitement|ist|autre"}
- action "centres" pour se faire dépister ou trouver un centre, "infirmieres" pour un cas personnel ou un besoin d'écoute,
  "reserver" si la personne veut un rendez-vous, "jeu" si elle veut tester ses connaissances, sinon "none".`;

// Masque numéros de téléphone et emails avant d'envoyer le texte à l'IA.
const redact = (t: string) =>
  t
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email masqué]')
    .replace(/(\+?\d[\d\s.-]{7,}\d)/g, '[numéro masqué]');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const key = Deno.env.get('GROQ_API_KEY');
  if (!key) return json({ error: 'GROQ_API_KEY manquante dans les secrets Supabase' }, 500);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: 'session requise' }, 401);

  const { data: used } = await admin.rpc('ai_usage_hit', { p_user: auth.user.id, p_kind: 'chat' });
  if (typeof used === 'number' && used > DAILY_LIMIT) {
    return json({ reply: 'Tu as posé beaucoup de questions aujourd’hui 🌱 Pour continuer, écris directement à une infirmière.', action: 'infirmieres', topic: 'autre', limited: true });
  }

  const body = await req.json().catch(() => ({}));
  const history: { role: string; content: string }[] = Array.isArray(body.messages) ? body.messages : [];
  const messages = history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-8)
    .map((m) => ({ role: m.role, content: redact(m.content.slice(0, 1000)) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'question requise' }, 400);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 450,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, ...messages],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error('Groq', res.status, detail.slice(0, 500));
    return json({ error: `IA indisponible (${res.status})` }, 502);
  }
  const out = await res.json();
  const raw: string = out?.choices?.[0]?.message?.content ?? '';

  let reply = raw.trim();
  let action = 'none';
  let topic = 'autre';
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.reply === 'string' && parsed.reply.trim()) reply = parsed.reply.trim();
    if (ACTIONS.includes(parsed.action)) action = parsed.action;
    if (TOPICS.includes(parsed.topic)) topic = parsed.topic;
  } catch {
    // réponse non JSON : on garde le texte brut
  }
  if (!reply) return json({ error: 'réponse vide' }, 502);

  // Statistique anonyme (sujet + orientation), jamais le texte.
  await admin.from('chatbot_hits').insert({ node_id: topic, routed_to: ROUTES[action] });

  return json({ reply: reply.slice(0, 1200), action, topic });
});
