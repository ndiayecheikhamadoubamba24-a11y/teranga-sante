// Données de démonstration FICTIVES pour le hackathon (comptes pros, centres, 6 mois de rendez-vous…).
//
// Usage (depuis apps/web, après avoir appliqué les migrations + seed.sql) :
//   SUPABASE_SERVICE_ROLE_KEY=... DEMO_PASSWORD='MotDePasse!2026' node scripts/seed-demo.mjs
//
// La clé « service_role » se trouve dans Supabase > Project Settings > API keys (secret).
// Ne la committez jamais et ne la mettez jamais dans une variable VITE_ / EXPO_PUBLIC_.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const URL_ = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.DEMO_PASSWORD;
if (!KEY || !PASSWORD) {
  console.error('Définis SUPABASE_SERVICE_ROLE_KEY et DEMO_PASSWORD (12 caractères minimum).');
  process.exit(1);
}
const db = createClient(URL_, KEY, { auth: { persistSession: false } });
const must = (r, what) => { if (r.error) throw new Error(`${what} : ${r.error.message}`); return r.data; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const DAY = 86400000;

async function user(email, meta = {}) {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = data.users.find((u) => u.email === email);
  if (found) return found.id;
  const r = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: meta });
  return must(r, `création ${email}`).user.id;
}

const C1 = '11111111-0000-0000-0000-000000000001';
const C2 = '11111111-0000-0000-0000-000000000002';

// ---------- Centres : un par région pour la carte nationale ----------
const REGION_CENTRES = [
  [5, 'Point Santé Jeunes Kaolack', 14.152, -16.0726], [6, 'Centre Ado Kaffrine', 14.1059, -15.5508], [7, 'Espace Jeunes Saint-Louis', 16.0179, -16.4896],
  [8, 'Centre Conseil Louga', 15.6144, -16.2286], [9, 'Point Écoute Matam', 15.6559, -13.2554], [10, 'Centre Jeunes Tambacounda', 13.7708, -13.6673],
  [11, 'Espace Santé Kédougou', 12.5605, -12.1747], [12, 'Centre Ado Kolda', 12.8939, -14.9412], [13, 'Point Santé Sédhiou', 12.7081, -15.5569],
  [3, 'Centre Jeunes Diourbel', 14.6604, -16.2348], [4, 'Espace Santé Fatick', 14.3390, -16.4041],
];
for (const [region_id, name, lat, lng] of REGION_CENTRES) {
  const { data } = await db.from('centres').select('id').eq('name', name).maybeSingle();
  if (!data) must(await db.from('centres').insert({ name, region_id, lat, lng, district: name.split(' ').pop(), services: ['screening', 'counselling'] }), name);
}
const centres = must(await db.from('centres').select('id, region_id, name'), 'centres');

// ---------- Professionnels ----------
const PROS = [
  ['infirmiere@teranga.demo', { role: 'nurse', centre_id: C1, display_name: 'Awa Diop', specialty: 'Dépistage et PrEP', languages: ['fr', 'wo'], status: 'online' }],
  ['infirmiere2@teranga.demo', { role: 'nurse', centre_id: C1, display_name: 'Fatou Ndiaye', specialty: 'Conseil', languages: ['fr', 'wo'], status: 'online' }],
  ['infirmiere3@teranga.demo', { role: 'nurse', centre_id: C1, display_name: 'Mariama Diallo', specialty: 'Consultation', languages: ['fr', 'ff'], status: 'away' }],
  ['responsable@teranga.demo', { role: 'manager', centre_id: C1, display_name: 'Moussa Sow', specialty: null, languages: ['fr', 'wo'], status: 'online' }],
  ['cnls@teranga.demo', { role: 'national_admin', centre_id: null, display_name: 'Coumba Ba', specialty: null, languages: ['fr'], status: 'online' }],
];
const proIds = {};
for (const [email, p] of PROS) {
  const id = await user(email);
  must(await db.from('pros').upsert({ id, ...p }), email);
  proIds[email] = id;
}
const nurses = [proIds['infirmiere@teranga.demo'], proIds['infirmiere2@teranga.demo'], proIds['infirmiere3@teranga.demo']];

// ---------- Jeunes fictifs (comptes techniques, aucun nom) ----------
const PSEUDOS = ['Lion21', 'Etoile', 'Baobab7', 'Soleil', 'Teranga22', 'Gazelle', 'Thiof', 'Kora', 'Sabar', 'Djembe', 'Ndar', 'Casa', 'Rufisque', 'Lamb', 'Jolof', 'Yassa', 'Mbalax', 'Saloum', 'Fleuve', 'Niokolo'];
const players = [];
for (let i = 0; i < 40; i++) {
  const id = await user(`joueur-${i}@demo.invalid`, { demo: true });
  const c = pick(centres);
  must(await db.from('players').upsert({
    id, pseudo: `${pick(PSEUDOS)}${i}`, lang: pick(['fr', 'fr', 'wo', 'ff']), points: Math.floor(Math.random() * 1200),
    streak: Math.floor(Math.random() * 6), last_played: new Date(Date.now() - Math.random() * 60 * DAY).toISOString().slice(0, 10),
    badges: ['curieux'], age_band: pick(['18-24', '18-24', '25-29', '30-35']), region_id: c.region_id,
  }), 'player');
  players.push(id);
}

// ---------- Créneaux passés + réservations (6 mois) ----------
const { count: existing } = await db.from('bookings').select('id', { count: 'exact', head: true });
if ((existing ?? 0) < 50) {
  const weight = { 1: 6, 2: 4, 3: 2, 4: 2, 5: 3, 6: 1, 7: 3, 8: 2, 9: 1, 10: 2, 11: 1, 12: 1, 13: 1, 14: 3 };
  const codes = new Set();
  for (let d = 180; d >= 1; d--) {
    const day = new Date(Date.now() - d * DAY);
    if (day.getDay() === 0) continue;
    for (const c of centres) {
      const n = Math.round((weight[c.region_id] ?? 1) * (0.4 + (180 - d) / 180) * Math.random());
      if (!n) continue;
      const start = new Date(day); start.setHours(pick([8, 10, 14, 16]), 0, 0, 0);
      const service = pick(['screening', 'screening', 'counselling', 'consultation']);
      const slot = must(await db.from('slots').insert({
        centre_id: c.id, service, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 2 * 3600000).toISOString(),
        capacity: n + 2, nurse_id: c.id === C1 ? pick(nurses) : null,
      }).select('id').single(), 'slot');
      const rows = [];
      for (let k = 0; k < n; k++) {
        let code; do { code = `BAO-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`; } while (codes.has(code)); codes.add(code);
        rows.push({ code, player_id: pick(players), slot_id: slot.id, centre_id: c.id, service, status: pick(['attended', 'attended', 'attended', 'no_show', 'cancelled']), created_at: new Date(start.getTime() - 3 * DAY).toISOString() });
      }
      const r = await db.from('bookings').insert(rows);
      if (r.error && !r.error.message.includes('duplicate')) throw new Error(r.error.message);
    }
  }
  console.log('Réservations historiques créées.');
}

// Rendez-vous à venir au centre C1 (pour l'agenda de l'infirmière)
const upcoming = must(await db.rpc('available_slots', { p_centre_id: C1, p_days: 7 }), 'slots à venir');
for (const s of upcoming.slice(0, 10)) {
  const code = `BAO-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  await db.from('bookings').insert({ code, player_id: pick(players), slot_id: s.id, centre_id: C1, service: s.service, status: pick(['confirmed', 'confirmed', 'pending']) });
}

// ---------- Conversations ----------
const { count: convCount } = await db.from('conversations').select('id', { count: 'exact', head: true });
if (!convCount) {
  const CONVS = [
    { topic: 'Dépistage', nurse: nurses[0], msgs: [['p', 'Bonjour, je voudrais me faire dépister. Est-ce possible ?'], ['n', 'Oui, c’est possible ! Le dépistage est gratuit et confidentiel. Je peux te proposer un créneau.'], ['p', 'Merci ! Est-ce que c’est vraiment anonyme ?']] },
    { topic: 'PrEP', nurse: nurses[0], urgent: true, msgs: [['p', 'J’ai eu un rapport non protégé hier, que dois-je faire ?']] },
    { topic: 'Autotest', nurse: null, msgs: [['p', 'Comment lire le résultat d’un autotest ?']] },
    { topic: 'Dépistage', nurse: nurses[0], msgs: [['p', 'Merci beaucoup pour les conseils !'], ['n', 'Avec plaisir, à bientôt 😊']] },
  ];
  for (const [i, c] of CONVS.entries()) {
    const player = players[i];
    const conv = must(await db.from('conversations').insert({ player_id: player, nurse_id: c.nurse, topic: c.topic, urgent: !!c.urgent }).select('id').single(), 'conversation');
    for (const [j, [who, body]] of c.msgs.entries()) {
      must(await db.from('messages').insert({
        conversation_id: conv.id, sender_id: who === 'p' ? player : c.nurse ?? nurses[0], body,
        created_at: new Date(Date.now() - (c.msgs.length - j) * 4 * 60000 - i * 3600000).toISOString(),
        read_at: who === 'n' ? new Date().toISOString() : null,
      }), 'message');
    }
  }
}

// ---------- Signalements, fiches, chatbot ----------
const { count: repCount } = await db.from('reports').select('id', { count: 'exact', head: true });
if (!repCount) {
  must(await db.from('reports').insert([
    { player_id: players[5], category: 'discrimination', region_id: 1, body: 'On m’a fait des remarques à l’accueil quand j’ai demandé un dépistage.' },
    { player_id: players[6], category: 'discrimination', region_id: 2, body: 'Un agent a refusé de me renseigner.', status: 'assigned', assigned_to: proIds['cnls@teranga.demo'] },
    { player_id: players[7], category: 'confidentialite', region_id: 14, body: 'Mon motif de visite a été dit à voix haute dans la salle d’attente.' },
  ]), 'reports');
}
const { count: artCount } = await db.from('articles').select('id', { count: 'exact', head: true });
if (!artCount) {
  must(await db.from('articles').insert([
    { title: { fr: 'Le dépistage, c’est important' }, body: { fr: 'Se faire dépister est rapide, gratuit et confidentiel. Seul un test permet de connaître son statut.' }, illustration: 'baobi-thumb', published: true },
    { title: { fr: 'Les IST : ce qu’il faut savoir' }, body: { fr: 'Les infections sexuellement transmissibles sont fréquentes et se soignent. Le préservatif protège.' }, illustration: 'baobi-wave', published: true },
    { title: { fr: 'Les bons réflexes' }, body: { fr: 'Préservatif, PrEP si tu es exposé·e, dépistage régulier : trois réflexes pour te protéger.' }, illustration: 'baobi-cheer', published: false },
  ]), 'articles');
}
const hits = [];
for (let i = 0; i < 400; i++) {
  const node = pick(['depister', 'depister', 'depister', 'positif', 'positif', 'proteger', 'prep', 'autotest']);
  hits.push({ node_id: node, routed_to: Math.random() < 0.4 ? '/carte' : null, created_at: new Date(Date.now() - Math.random() * 150 * DAY).toISOString() });
}
must(await db.from('chatbot_hits').insert(hits), 'chatbot_hits');

console.log('\nDonnées de démo prêtes. Comptes (mot de passe = DEMO_PASSWORD) :');
for (const [email, p] of PROS) console.log(`  ${email.padEnd(28)} ${p.role}`);
console.log('\nÀ la première connexion, chaque compte active la validation en 2 étapes (sauf si VITE_MFA_OPTIONAL=true).');
