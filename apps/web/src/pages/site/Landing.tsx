import { ArrowRight, BookOpen, Download, EyeOff, LogIn, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { WaxBand } from '../../components/Decor';
import { ANDROID_URL, APP_ONLINE, IOS_URL, IS_APK, loadArticles, type SiteArticle } from '../../lib/site';
import { ArticleCard } from './Articles';
import { SiteLayout } from './SiteLayout';
import './landing.css';

// Site vitrine — page d'accueil publique.
// Direction (passe « unslop ») : chaleureux, discret, franc. Univers : la cour d'un centre de santé de quartier.
// Surfaces sable neutres, le vert de la marque comme seul accent. Moment : le vrai écran de l'app et le ticket de
// rendez-vous. Signature : le code BAO-4821 en chasse fixe, comme un tampon.

/** Le code de rendez-vous, signature visuelle du produit : un code à la place d'une identité. */
function Code({ children = 'BAO-4821', small = false }: { children?: string; small?: boolean }) {
  return <span className={`lp-code${small ? ' sm' : ''}`}>{children}</span>;
}

/** Aperçu du produit : capture réelle de l'écran d'accueil de l'app, et le ticket de rendez-vous qu'on y obtient. */
function ProductView() {
  return (
    <div className="lp-visual">
      <div className="lp-phone">
        <img
          src="/app-accueil.webp"
          width={585}
          height={1266}
          alt="Écran d’accueil de l’application Teranga Santé : trois gros boutons, Je me fais dépister, Je joue et j’apprends, Je me soigne"
        />
      </div>
      <div className="lp-ticket" aria-hidden="true">
        <WaxBand height={10} />
        <div className="lp-ticket-body">
          <span className="lp-ticket-label">Ton code de rendez-vous</span>
          <Code />
          <span className="lp-ticket-meta">Dépistage · présente-le à l’accueil</span>
        </div>
      </div>
    </div>
  );
}

/** QR code du lien de téléchargement (pour scanner depuis un ordinateur). */
function DownloadQr({ url }: { url: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#1F1B16', light: '#FFFFFF' } }).then(setSvg).catch(() => setSvg(''));
  }, [url]);
  if (!svg) return null;
  return (
    <figure className="lp-qr">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption>Scanne avec ton téléphone</figcaption>
    </figure>
  );
}

const PATHS = [
  { dot: 'var(--orange)', title: 'Je m’informe', text: 'Le jeu Vrai ou Faux démonte les rumeurs en une minute. Badges, série du jour et défis entre amis.' },
  { dot: 'var(--blue)', title: 'Je me fais dépister', text: 'La carte des centres gratuits et confidentiels, et une réservation avec un simple code, sans ton nom.' },
  { dot: 'var(--green)', title: 'Je me soigne', text: 'Des rappels discrets, une plante qui grandit avec ta régularité, et une infirmière à qui écrire.' },
];

export default function Landing() {
  const [conseils, setConseils] = useState<SiteArticle[] | null>(null);
  const [actus, setActus] = useState<SiteArticle[] | null>(null);
  useEffect(() => {
    loadArticles('conseil', 3).then(setConseils);
    loadArticles('actualite', 3).then(setActus);
  }, []);

  return (
    <SiteLayout>
      <div className="lp">
        {/* ---------- Héros ---------- */}
        <section className="lp-hero">
          <div className="site-wrap lp-hero-grid">
            <div className="lp-hero-text">
              <h1>Ta santé, sans jugement</h1>
              <p className="lp-sub">
                Pour les 18 – 35 ans au Sénégal : informe-toi en jouant, trouve un centre de dépistage, réserve avec un simple code et
                discute avec une infirmière. Gratuit, et sans donner ton nom.
              </p>
              <div className="lp-actions">
                <a href="#application" className="s-btn"><Download size={18} strokeWidth={1.75} aria-hidden="true" /> Installer l’application</a>
                <Link to="/conseils" className="s-btn secondary"><BookOpen size={18} strokeWidth={1.75} aria-hidden="true" /> Lire les conseils</Link>
              </div>
            </div>
            <ProductView />
          </div>
        </section>

        {/* ---------- Parcours ---------- */}
        <section className="lp-section">
          <div className="site-wrap">
            <h2 className="lp-title">Une seule application, trois parcours</h2>
            <div className="lp-paths">
              {PATHS.map((p) => (
                <div key={p.title} className="lp-path">
                  <h3><span className="lp-dot" style={{ background: p.dot }} aria-hidden="true" />{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Confidentialité ---------- */}
        <section className="lp-section raised">
          <div className="site-wrap">
            <h2 className="lp-title">Ta vie privée d’abord</h2>
            <div className="lp-privacy">
              <div><UserRound size={18} strokeWidth={1.5} aria-hidden="true" /><h3>Pas de nom</h3><p>Un pseudo et un avatar suffisent. Aucun numéro de téléphone.</p></div>
              <div><Code small /><h3>Un code, pas une identité</h3><p>Ta réservation est liée à un code, que tu présentes à l’accueil du centre.</p></div>
              <div><EyeOff size={18} strokeWidth={1.5} aria-hidden="true" /><h3>Mode discret</h3><p>Secoue ton téléphone : un faux écran météo s’affiche.</p></div>
              <div><ShieldCheck size={18} strokeWidth={1.5} aria-hidden="true" /><h3>Données de santé protégées</h3><p>Ton suivi reste sur ton téléphone. Rendez-vous et messages ne sont vus que par les soignants concernés, et tu peux tout effacer.</p></div>
            </div>
          </div>
        </section>

        {/* ---------- Conseils ---------- */}
        <section className="lp-section" id="conseils">
          <div className="site-wrap">
            <div className="lp-head">
              <h2 className="lp-title">Conseils santé</h2>
              <Link to="/conseils" className="lp-link">Tous les conseils <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" /></Link>
            </div>
            <ArticleGrid items={conseils} empty="Les premiers conseils arrivent bientôt." />
          </div>
        </section>

        {/* ---------- Publications ---------- */}
        <section className="lp-section tight">
          <div className="site-wrap">
            <div className="lp-head">
              <h2 className="lp-title">Publications</h2>
              <Link to="/publications" className="lp-link">Toutes les publications <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" /></Link>
            </div>
            <ArticleGrid items={actus} empty="Aucune publication pour le moment." />
          </div>
        </section>

        {/* ---------- Installer l'application ---------- */}
        <section className="lp-section raised" id="application">
          <div className="site-wrap">
            <div className="lp-install-head">
              <div>
                <h2 className="lp-title">Installer l’application</h2>
                <p className="lp-sub small">
                  {APP_ONLINE
                    ? 'Gratuite, pensée pour les téléphones Android d’entrée de gamme.'
                    : 'Elle arrive bientôt sur Android. Voici comment l’installer dès sa sortie.'}
                </p>
              </div>
              {ANDROID_URL ? <DownloadQr url={ANDROID_URL} /> : IOS_URL ? <DownloadQr url={IOS_URL} /> : null}
            </div>
            <ol className="lp-steps">
              <li>
                <h3>Télécharge l’application</h3>
                {ANDROID_URL ? (IS_APK
                  ? <p>Touche « Télécharger pour Android ». Si ton téléphone le demande, autorise l’installation depuis ton navigateur (Paramètres → Sécurité → Sources inconnues).</p>
                  : <p>Touche « Disponible sur Google Play », puis « Installer ».</p>)
                  : <p>Le lien de téléchargement apparaîtra ici.</p>}
              </li>
              <li><h3>Ouvre Teranga Santé</h3><p>Choisis ta langue. Le wolof et le pulaar sont en cours de traduction.</p></li>
              <li><h3>Crée ton profil</h3><p>Un pseudo et un avatar, sans nom ni numéro.</p></li>
              <li><h3>C’est parti</h3><p>Joue, trouve un centre, réserve avec un code, ou écris à une infirmière.</p></li>
            </ol>
            {APP_ONLINE && (
              <div className="lp-actions">
                {ANDROID_URL && <a className="s-btn" href={ANDROID_URL} target="_blank" rel="noopener noreferrer"><Download size={18} strokeWidth={1.75} aria-hidden="true" /> {IS_APK ? 'Télécharger pour Android' : 'Disponible sur Google Play'}</a>}
                {IOS_URL && <a className="s-btn secondary" href={IOS_URL} target="_blank" rel="noopener noreferrer"><Smartphone size={18} strokeWidth={1.75} aria-hidden="true" /> Disponible sur l’App Store</a>}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Espace professionnel ---------- */}
        <section className="lp-section" id="professionnels">
          <div className="site-wrap lp-pro">
            <div>
              <h2 className="lp-title">Vous êtes professionnel de santé ?</h2>
              <p className="lp-sub small">
                Infirmières, responsables de centre, CNLS et administrateurs : gérez l’agenda, les rendez-vous anonymes, la messagerie,
                les stocks et les statistiques dans un espace sécurisé et traçable.
              </p>
            </div>
            <Link to="/connexion" className="s-btn secondary"><LogIn size={18} strokeWidth={1.75} aria-hidden="true" /> Se connecter</Link>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

function ArticleGrid({ items, empty }: { items: SiteArticle[] | null; empty: string }) {
  if (items === null) return <div className="site-grid-3">{[0, 1, 2].map((i) => <div key={i} className="site-card skeleton" />)}</div>;
  if (items.length === 0) return <p className="lp-empty">{empty}</p>;
  return <div className="site-grid-3">{items.map((a) => <ArticleCard key={a.id} a={a} />)}</div>;
}
