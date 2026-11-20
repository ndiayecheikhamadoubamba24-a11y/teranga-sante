import {
  ArrowRight, BookOpen, CalendarCheck, Download, EyeOff, Gamepad2, Hash, HeartPulse, Lock, LogIn, MapPin, MessageCircle, Pill, ShieldCheck, Smartphone, Stethoscope, Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Baobi } from '../../components/Baobi';
import { Logo } from '../../components/ui';
import { ANDROID_URL, APP_ONLINE, IOS_URL, IS_APK, loadArticles, type SiteArticle } from '../../lib/site';
import { ArticleCard } from './Articles';
import { SiteLayout } from './SiteLayout';

function PhoneMock() {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone-screen">
        <div style={{ marginTop: 6 }}><Logo size={64} /></div>
        <div className="phone-tiles">
          <div style={{ background: 'var(--blue)' }}><Stethoscope size={22} /><span>Je me fais dépister</span></div>
          <div style={{ background: 'var(--orange-strong)' }}><Gamepad2 size={22} /><span>Je joue et j’apprends</span></div>
          <div style={{ background: 'var(--green)', gridColumn: '1 / -1' }}><Pill size={22} /><span>Je me soigne</span></div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, color, title, children }: { icon: ReactNode; color: string; title: string; children: ReactNode }) {
  return (
    <div className="site-card">
      <div className="site-icon" style={{ background: color }}>{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

/** QR code du lien de téléchargement (pour scanner depuis un ordinateur). */
function DownloadQr({ url }: { url: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#14213D', light: '#FFFFFF' } }).then(setSvg).catch(() => setSvg(''));
  }, [url]);
  if (!svg) return null;
  return (
    <figure className="qr">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <figcaption>Scanne avec ton téléphone</figcaption>
    </figure>
  );
}

// Site vitrine — page d'accueil publique.
export default function Landing() {
  const [conseils, setConseils] = useState<SiteArticle[] | null>(null);
  const [actus, setActus] = useState<SiteArticle[] | null>(null);
  useEffect(() => {
    loadArticles('conseil', 3).then(setConseils);
    loadArticles('actualite', 3).then(setActus);
  }, []);

  return (
    <SiteLayout>
      {/* ---------- Héros ---------- */}
      <section className="hero">
        <div className="site-wrap hero-grid">
          <div>
            <span className="pill good no-dot" style={{ marginBottom: 14 }}><Lock size={13} aria-hidden="true" /> Sans nom · gratuit · sans jugement</span>
            <h1>Ta santé, <span style={{ color: 'var(--orange)' }}>sans jugement.</span></h1>
            <p className="lead">
              Informe-toi en jouant, trouve un centre de dépistage, réserve un créneau avec un simple code et discute avec une infirmière.
              Sans donner ton nom.
            </p>
            <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
              <a href="#application" className="btn lg" style={{ width: 'auto' }}><Download size={20} /> Installer l’application</a>
              <Link to="/conseils" className="btn light lg" style={{ width: 'auto' }}><BookOpen size={20} /> Lire les conseils</Link>
            </div>
            <p className="small muted" style={{ marginTop: 14 }}>En français (wolof et pulaar en cours de traduction) · pour les 18 – 35 ans</p>
          </div>
          <div className="hero-visual">
            <PhoneMock />
            <div className="hero-baobi">
              <div className="hero-bubble">Salut ! Moi c’est Baobi. Pose-moi tes questions, sans honte 🌳</div>
              <Baobi size={150} mood="wave" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Parcours ---------- */}
      <section className="site-section">
        <div className="site-wrap">
          <h2 className="section-title">Une seule application, trois parcours</h2>
          <div className="site-grid-3">
            <Feature icon={<Gamepad2 />} color="var(--orange)" title="Je m’informe">
              Le jeu Vrai ou Faux démonte les rumeurs en une minute. Badges, série du jour et défis entre amis.
            </Feature>
            <Feature icon={<MapPin />} color="var(--blue)" title="Je me fais dépister">
              La carte des centres gratuits et confidentiels, et une réservation en 3 touches avec un code anonyme.
            </Feature>
            <Feature icon={<HeartPulse />} color="var(--green)" title="Je me soigne">
              Des rappels discrets, une plante qui grandit avec ta régularité, et une infirmière à qui écrire.
            </Feature>
          </div>
        </div>
      </section>

      {/* ---------- Confidentialité ---------- */}
      <section className="site-section band">
        <div className="site-wrap">
          <h2 className="section-title">Ta vie privée d’abord</h2>
          <div className="site-grid-4">
            {[
              { icon: <Users />, t: 'Pas de nom', d: 'Un pseudo et un avatar suffisent. Aucun numéro de téléphone.' },
              { icon: <Hash />, t: 'Un code, pas une identité', d: 'Ta réservation est liée à un code comme BAO-4821.' },
              { icon: <EyeOff />, t: 'Mode discret', d: 'Secoue ton téléphone : un faux écran météo s’affiche.' },
              { icon: <ShieldCheck />, t: 'Données de santé protégées', d: 'Ton suivi reste sur ton téléphone. Rendez-vous et messages ne sont vus que par les soignants concernés, et tu peux tout effacer.' },
            ].map((x) => (
              <div key={x.t} className="privacy-item">
                <div className="privacy-icon">{x.icon}</div>
                <strong>{x.t}</strong>
                <span>{x.d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Conseils ---------- */}
      <section className="site-section" id="conseils">
        <div className="site-wrap">
          <div className="section-head">
            <h2 className="section-title">Conseils santé</h2>
            <Link to="/conseils" className="link">Tous les conseils <ArrowRight size={14} /></Link>
          </div>
          <ArticleGrid items={conseils} empty="Les premiers conseils arrivent bientôt." />
        </div>
      </section>

      {/* ---------- Publications ---------- */}
      <section className="site-section" style={{ paddingTop: 0 }}>
        <div className="site-wrap">
          <div className="section-head">
            <h2 className="section-title">Publications</h2>
            <Link to="/publications" className="link">Toutes les publications <ArrowRight size={14} /></Link>
          </div>
          <ArticleGrid items={actus} empty="Aucune publication pour le moment." />
        </div>
      </section>

      {/* ---------- Installer l'application ---------- */}
      <section className="site-section install" id="application">
        <div className="site-wrap install-grid">
          <div>
            <h2 className="section-title" style={{ textAlign: 'left' }}>Installer l’application</h2>
            {APP_ONLINE ? (
              <p className="lead">Gratuite, pensée pour les téléphones Android d’entrée de gamme.</p>
            ) : (
              <div className="banner warning" style={{ marginBottom: 16 }}>
                <Smartphone size={18} /> <span>L’application arrive très bientôt sur Android. Voici comment l’installer dès sa sortie :</span>
              </div>
            )}
            <ol className="steps">
              <li>
                <strong>Télécharge l’application</strong>
                {ANDROID_URL ? (IS_APK
                  ? <span>Touche « Télécharger pour Android ». Si ton téléphone le demande, autorise l’installation depuis ton navigateur (Paramètres → Sécurité → Sources inconnues).</span>
                  : <span>Touche « Disponible sur Google Play », puis « Installer ».</span>)
                  : <span>Le lien de téléchargement apparaîtra ici.</span>}
              </li>
              <li><strong>Ouvre Teranga Santé</strong><span>Choisis ta langue (le wolof et le pulaar sont en cours de traduction).</span></li>
              <li><strong>Crée ton profil</strong><span>Un pseudo et un avatar, sans nom ni numéro.</span></li>
              <li><strong>C’est parti !</strong><span>Joue, trouve un centre, réserve avec un code, ou écris à une infirmière.</span></li>
            </ol>
            <div className="row" style={{ flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
              {ANDROID_URL && <a className="btn lg" style={{ width: 'auto' }} href={ANDROID_URL} target="_blank" rel="noopener noreferrer"><Download size={20} /> {IS_APK ? 'Télécharger pour Android' : 'Disponible sur Google Play'}</a>}
              {IOS_URL && <a className="btn blue lg" style={{ width: 'auto' }} href={IOS_URL} target="_blank" rel="noopener noreferrer"><Download size={20} /> Disponible sur l’App Store</a>}
              {!APP_ONLINE && <span className="btn lg light" style={{ width: 'auto', cursor: 'default' }} aria-disabled="true"><Smartphone size={20} /> Bientôt disponible</span>}
            </div>
          </div>
          <div className="install-visual">
            {ANDROID_URL ? <DownloadQr url={ANDROID_URL} /> : IOS_URL ? <DownloadQr url={IOS_URL} /> : <Baobi size={190} mood="cheer" />}
          </div>
        </div>
      </section>

      {/* ---------- Espace professionnel ---------- */}
      <section className="site-section" id="professionnels">
        <div className="site-wrap pro-box">
          <div>
            <h2 className="section-title" style={{ textAlign: 'left', marginBottom: 8 }}>Vous êtes professionnel de santé ?</h2>
            <p style={{ margin: '0 0 16px' }}>
              Infirmières, responsables de centre, CNLS et administrateurs : gérez l’agenda, les rendez-vous anonymes, la messagerie,
              les stocks et les statistiques dans un espace sécurisé et traçable.
            </p>
            <div className="pro-roles">
              <span><MessageCircle size={16} /> Infirmière</span>
              <span><CalendarCheck size={16} /> Responsable de centre</span>
              <span><ShieldCheck size={16} /> CNLS / district</span>
              <span><Lock size={16} /> Administrateur</span>
            </div>
          </div>
          <Link to="/connexion" className="btn lg" style={{ width: 'auto', whiteSpace: 'nowrap' }}><LogIn size={20} /> Se connecter</Link>
        </div>
      </section>
    </SiteLayout>
  );
}

function ArticleGrid({ items, empty }: { items: SiteArticle[] | null; empty: string }) {
  if (items === null) return <div className="site-grid-3">{[0, 1, 2].map((i) => <div key={i} className="site-card skeleton" />)}</div>;
  if (items.length === 0) return <p className="muted" style={{ textAlign: 'center' }}>{empty}</p>;
  return <div className="site-grid-3">{items.map((a) => <ArticleCard key={a.id} a={a} />)}</div>;
}
