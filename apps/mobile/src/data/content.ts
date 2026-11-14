// Contenus de secours (hors ligne). En ligne, l'app lit `quiz_questions`, `chatbot_nodes` et `centres` dans Supabase.
// ⚠️ Contenus à faire valider par une infirmière avant toute diffusion réelle.

export type QuizQuestion = { id: string; statement: string; answer: boolean; explanation: string };

export const QUIZ: QuizQuestion[] = [
  { id: 'q1', statement: 'On peut se sentir bien sans se faire dépister.', answer: true,
    explanation: 'Vrai ! On peut vivre avec le VIH pendant des années sans aucun signe. Seul un test permet de savoir.' },
  { id: 'q2', statement: 'On peut attraper le VIH en partageant un repas.', answer: false,
    explanation: 'Faux ! Le VIH ne se transmet ni par la nourriture, ni par les bisous, ni par les moustiques.' },
  { id: 'q3', statement: 'Le dépistage est confidentiel dans les centres partenaires.', answer: true,
    explanation: 'Vrai ! Personne ne connaîtra ton résultat sans ton accord.' },
  { id: 'q4', statement: 'Une personne sous traitement avec une charge virale indétectable ne transmet pas le VIH par voie sexuelle.', answer: true,
    explanation: 'Vrai ! Indétectable = Intransmissible (I = I).' },
  { id: 'q5', statement: 'La PrEP est un vaccin contre le VIH.', answer: false,
    explanation: "Faux. La PrEP est un médicament préventif à prendre comme prescrit, ce n'est pas un vaccin." },
  { id: 'q6', statement: 'Le préservatif protège du VIH et de la plupart des IST.', answer: true,
    explanation: 'Vrai ! Bien utilisé à chaque rapport, il protège efficacement.' },
  { id: 'q7', statement: 'On peut savoir si quelqu’un a le VIH juste en le regardant.', answer: false,
    explanation: 'Faux ! Le VIH ne se voit pas. Seul un test peut le dire.' },
];

export type ChatOption = { label: string; next?: string; route?: string };
export type ChatNode = { id: string; message: string; options: ChatOption[] };

export const CHATBOT: Record<string, ChatNode> = {
  root: {
    id: 'root',
    message: 'Tu as une question ? Je suis là pour toi, sans jugement ! 💚',
    options: [
      { label: 'Comment me protéger ?', next: 'proteger' },
      { label: 'Où me faire dépister ?', next: 'depister' },
      { label: 'Et si je suis positif ?', next: 'positif' },
      { label: 'Parler à une infirmière', route: '/infirmieres' },
    ],
  },
  proteger: {
    id: 'proteger',
    message: 'Pour te protéger : le préservatif à chaque rapport, la PrEP si tu es plus exposé·e, et un dépistage régulier. Une infirmière peut t’aider à choisir.',
    options: [
      { label: 'C’est quoi la PrEP ?', next: 'prep' },
      { label: 'Parler à une infirmière', route: '/infirmieres' },
      { label: 'Autre question', next: 'root' },
    ],
  },
  prep: {
    id: 'prep',
    message: 'La PrEP est un médicament qui protège du VIH avant une exposition. Elle se prend sur prescription, avec un suivi en centre.',
    options: [
      { label: 'Trouver un centre', route: '/carte' },
      { label: 'Autre question', next: 'root' },
    ],
  },
  depister: {
    id: 'depister',
    message: 'Tu peux te faire dépister dans un centre, de façon confidentielle. Réserve un créneau avec un code, sans donner ton nom.',
    options: [
      { label: 'Voir les centres', route: '/carte' },
      { label: 'Faire un autotest', next: 'autotest' },
      { label: 'Autre question', next: 'root' },
    ],
  },
  autotest: {
    id: 'autotest',
    message: 'Un autotest se fait chez toi en quelques minutes. Tu peux en récupérer un dans un centre partenaire. Si le résultat est positif, il faut le confirmer en centre.',
    options: [
      { label: 'Trouver un centre', route: '/carte' },
      { label: 'Autre question', next: 'root' },
    ],
  },
  positif: {
    id: 'positif',
    message: 'Tu n’es pas seul·e. Un traitement efficace existe : bien suivi, il permet de vivre longtemps et en bonne santé. Une infirmière peut t’accompagner dès maintenant.',
    options: [
      { label: 'Parler à une infirmière', route: '/infirmieres' },
      { label: 'Autre question', next: 'root' },
    ],
  },
  fallback: {
    id: 'fallback',
    message: 'Je n’ai pas bien compris 🌱 Choisis un sujet ou pose ta question à une infirmière.',
    options: [
      { label: 'Comment me protéger ?', next: 'proteger' },
      { label: 'Où me faire dépister ?', next: 'depister' },
      { label: 'Parler à une infirmière', route: '/infirmieres' },
    ],
  },
};

// Petit routage par mots-clés pour les questions tapées librement.
export function matchNode(text: string): string {
  const s = text.toLowerCase();
  if (/prep/.test(s)) return 'prep';
  if (/autotest|auto-test/.test(s)) return 'autotest';
  if (/positi|séropo|seropo|traitement|arv/.test(s)) return 'positif';
  if (/dépist|depist|test|centre/.test(s)) return 'depister';
  if (/proté|prote|préserv|preserv|capote/.test(s)) return 'proteger';
  return 'fallback';
}

export type Centre = {
  id: string;
  name: string;
  district: string | null;
  address: string | null;
  lat: number;
  lng: number;
  is_free: boolean;
  is_confidential: boolean;
  opening_hours: Record<string, [string, string]>;
};

export const CENTRES: Centre[] = [
  { id: '11111111-0000-0000-0000-000000000001', name: 'Centre Jeunes Teranga – Médina', district: 'Dakar Centre', address: 'Rue 11 x 6, Médina', lat: 14.6823, lng: -17.447, is_free: true, is_confidential: true, opening_hours: { 'mon-fri': ['08:00', '18:00'], sat: ['09:00', '13:00'] } },
  { id: '11111111-0000-0000-0000-000000000002', name: 'Espace Santé Pikine', district: 'Pikine', address: 'Marché Zinc, Pikine', lat: 14.7545, lng: -17.3906, is_free: true, is_confidential: true, opening_hours: { 'mon-fri': ['08:00', '17:00'] } },
  { id: '11111111-0000-0000-0000-000000000003', name: 'Point Écoute Thiès', district: 'Thiès Nord', address: 'Avenue Lamine Guèye', lat: 14.791, lng: -16.9359, is_free: true, is_confidential: true, opening_hours: { 'mon-fri': ['09:00', '17:00'] } },
  { id: '11111111-0000-0000-0000-000000000004', name: 'Centre Ado Ziguinchor', district: 'Ziguinchor', address: 'Quartier Boucotte', lat: 12.5681, lng: -16.2719, is_free: true, is_confidential: true, opening_hours: { 'mon-fri': ['08:30', '16:30'] } },
];

// Horaires du jour + statut ouvert.
export function todayHours(c: Centre, now = new Date()): { label: string; open: boolean } {
  const dow = now.getDay(); // 0 = dimanche
  const key = dow === 0 ? 'sun' : dow === 6 ? 'sat' : 'mon-fri';
  const h = c.opening_hours[key];
  if (!h) return { label: 'Fermé aujourd’hui', open: false };
  const hm = now.getHours() * 60 + now.getMinutes();
  const toMin = (x: string) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5));
  const fmt = (x: string) => x.replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
  return { label: `${fmt(h[0])} – ${fmt(h[1])}`, open: hm >= toMin(h[0]) && hm < toMin(h[1]) };
}

// « Ouvert · 8h – 18h » / « Fermé · 8h – 18h » / « Fermé aujourd’hui »
export const hoursText = (h: { open: boolean; label: string }) => (h.label.startsWith('Fermé') ? h.label : `${h.open ? 'Ouvert' : 'Fermé'} · ${h.label}`);
