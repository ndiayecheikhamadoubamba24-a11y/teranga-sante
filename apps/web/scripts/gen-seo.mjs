// Après « vite build » : génère robots.txt, sitemap.xml, llms.txt et llms-full.txt dans dist/,
// et renseigne l'adresse du site dans index.html. Les conseils et publications sont lus dans
// Supabase (articles publiés uniquement, clé publique). Sans réseau, les pages fixes suffisent.
// Variable requise : VITE_SITE_URL (ex. https://teranga-sante.sn), dans .env ou l'environnement.
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const dist = new URL('../dist/', import.meta.url);
let SITE = (env.VITE_SITE_URL ?? '').trim().replace(/\/$/, '');
if (!SITE) {
  console.warn('⚠ gen-seo : VITE_SITE_URL est vide. Renseignez l’adresse publique du site pour des URL absolues valides.');
  SITE = 'https://example.invalid';
}
const SB_URL = (env.VITE_SUPABASE_URL || 'https://aqmcghhktfsntdcrfxtd.supabase.co').trim();
const SB_KEY = (env.VITE_SUPABASE_KEY || 'sb_publishable_8pNDm69DoKJ8lgHhDKRivA_2aC_tfhR').trim();

let articles = [];
try {
  const r = await fetch(`${SB_URL}/rest/v1/articles?select=id,title,body,category,published_at&published=eq.true&order=published_at.desc`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (r.ok) articles = await r.json();
  else console.warn(`⚠ gen-seo : articles non lus (${r.status}).`);
} catch (e) {
  console.warn(`⚠ gen-seo : articles non lus (${e.message}).`);
}
const fr = (x) => (x && (x.fr ?? Object.values(x)[0])) || '';
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- index.html : adresse du site dans les balises canonical et JSON-LD
const indexPath = new URL('index.html', dist);
writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replaceAll('__SITE_URL__', SITE));

// ---- robots.txt : site public ouvert à tous les robots (y compris IA), espace professionnel exclu
const PRIVATE = ['/connexion', '/espace', '/tableau-de-bord', '/agenda', '/rendez-vous', '/messagerie', '/contenus', '/centre', '/stocks', '/national', '/signalements', '/equipe', '/admin/', '/profil', '/aide'];
writeFileSync(new URL('robots.txt', dist), `# Teranga Santé — le site public peut être lu et cité, y compris par les agents IA.
# L'espace professionnel (données de santé, accès sur invitation) est exclu.
User-agent: *
${PRIVATE.map((p) => `Disallow: ${p}`).join('\n')}
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);

// ---- sitemap.xml
const pages = [
  { loc: '/', priority: '1.0' },
  { loc: '/conseils', priority: '0.9', lastmod: iso(articles.find((a) => a.category === 'conseil')?.published_at) },
  { loc: '/publications', priority: '0.7', lastmod: iso(articles.find((a) => a.category === 'actualite')?.published_at) },
  ...articles.map((a) => ({ loc: `/article/${a.id}`, priority: a.category === 'conseil' ? '0.8' : '0.6', lastmod: iso(a.published_at) })),
  { loc: '/confidentialite', priority: '0.3' },
  { loc: '/cgu', priority: '0.2' },
  { loc: '/mentions-legales', priority: '0.2' },
];
writeFileSync(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${xml(SITE + p.loc)}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}<priority>${p.priority}</priority></url>`).join('\n')}
</urlset>
`);

// ---- llms.txt (format https://llmstxt.org) : description claire du site pour les agents IA
const list = (cat) => articles.filter((a) => a.category === cat).map((a) => `- [${fr(a.title)}](${SITE}/article/${a.id}): ${fr(a.body).replace(/\s+/g, ' ').slice(0, 140).trim()}…`).join('\n');
writeFileSync(new URL('llms.txt', dist), `# Teranga Santé

> Projet gratuit, sans but commercial, pour les jeunes de 18 à 35 ans au Sénégal : information fiable sur le VIH et les IST, carte des centres de dépistage, réservation avec un code (sans donner son nom), discussion avec une infirmière et rappel de traitement discret. Application Android, site public et espace réservé aux professionnels de santé. Projet né au hackathon Hack4VIH.

Les informations publiées ne remplacent pas une consultation. Urgence au Sénégal : SAMU 1515. Après un rapport à risque de moins de 72 heures, se rendre tout de suite dans un centre de santé (traitement post-exposition).

## Pages principales

- [Accueil](${SITE}/): présentation de l'application et de ses trois parcours (s'informer, se faire dépister, se soigner), installation.
- [Conseils santé](${SITE}/conseils): fiches validées par des infirmières.
- [Publications](${SITE}/publications): actualités du projet et des centres partenaires.
- [Texte intégral des conseils](${SITE}/llms-full.txt): toutes les fiches publiées, en texte brut.

## Conseils
${list('conseil') || '- (aucun conseil publié au moment de la génération)'}

## Publications
${list('actualite') || '- (aucune publication au moment de la génération)'}

## Informations légales

- [Mentions légales](${SITE}/mentions-legales)
- [Politique de confidentialité](${SITE}/confidentialite)
- [Conditions d'utilisation](${SITE}/cgu)

## Optional

- L'espace professionnel (${SITE}/connexion) est réservé aux soignants et n'a pas vocation à être lu ni cité.
`);

// ---- llms-full.txt : texte intégral des fiches publiées (lisible sans JavaScript)
writeFileSync(new URL('llms-full.txt', dist), `# Teranga Santé — texte intégral des conseils et publications

Source : ${SITE}. Contenu rédigé et validé par des professionnels de santé partenaires. Ne remplace pas une consultation.

${articles.map((a) => `## ${fr(a.title)}

URL : ${SITE}/article/${a.id}
Rubrique : ${a.category === 'conseil' ? 'Conseil santé' : 'Publication'}${a.published_at ? ` · publié le ${iso(a.published_at)}` : ''}

${fr(a.body).trim()}
`).join('\n') || '(Aucun article publié au moment de la génération.)\n'}`);

console.log(`gen-seo : ${SITE} · ${articles.length} article(s) · robots.txt, sitemap.xml, llms.txt, llms-full.txt`);
