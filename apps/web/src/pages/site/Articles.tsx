import { ArrowLeft, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Baobi } from '../../components/Baobi';
import { excerpt, fmtLongDate, loadArticle, loadArticles, type Category, type SiteArticle } from '../../lib/site';
import { SiteLayout } from './SiteLayout';

const MOODS = { baobi: 'happy', 'baobi-cheer': 'cheer', 'baobi-wave': 'wave', 'baobi-thumb': 'thumb' } as const;
const mood = (k: string | null) => MOODS[(k ?? 'baobi') as keyof typeof MOODS] ?? 'happy';
const LABEL: Record<Category, string> = { conseil: 'Conseil santé', actualite: 'Publication' };

export function ArticleCard({ a }: { a: SiteArticle }) {
  return (
    <Link to={`/article/${a.id}`} className="site-card article-card">
      <div className="article-thumb"><Baobi size={92} mood={mood(a.illustration)} /></div>
      <span className={`pill ${a.category === 'conseil' ? 'good' : 'info'} no-dot`}>{LABEL[a.category]}</span>
      <h3>{a.title.fr}</h3>
      <p>{excerpt(a.body)}</p>
      {a.published_at && <span className="small muted">{fmtLongDate(a.published_at)}</span>}
    </Link>
  );
}

/** Liste publique : /conseils ou /publications. */
export function ArticleList({ category }: { category: Category }) {
  const [items, setItems] = useState<SiteArticle[] | null>(null);
  useEffect(() => {
    setItems(null);
    loadArticles(category).then(setItems);
  }, [category]);
  const title = category === 'conseil' ? 'Conseils santé' : 'Publications';
  return (
    <SiteLayout title={title}>
      <section className="site-section">
        <div className="site-wrap">
          <h1 className="section-title" style={{ fontSize: 34 }}>{title}</h1>
          <p className="lead" style={{ textAlign: 'center', margin: '-12px auto 32px', maxWidth: 620 }}>
            {category === 'conseil'
              ? 'Des réponses simples et fiables, validées par des infirmières, pour prendre soin de toi.'
              : 'Les nouvelles de Teranga Santé, des centres partenaires et de la riposte au VIH chez les jeunes.'}
          </p>
          {items === null ? (
            <div className="site-grid-3">{[0, 1, 2].map((i) => <div key={i} className="site-card skeleton" />)}</div>
          ) : items.length === 0 ? (
            <div className="empty"><Baobi size={100} /><strong>Rien de publié pour le moment</strong></div>
          ) : (
            <div className="site-grid-3">{items.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

/** Page d'un conseil ou d'une publication. */
export function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const [a, setA] = useState<SiteArticle | null | undefined>(undefined);
  const [more, setMore] = useState<SiteArticle[]>([]);
  useEffect(() => {
    setA(undefined);
    if (!id) return;
    loadArticle(id).then((x) => {
      setA(x);
      if (x) loadArticles(x.category, 4).then((l) => setMore(l.filter((y) => y.id !== x.id).slice(0, 3)));
    });
  }, [id]);

  if (a === undefined) return <SiteLayout><div className="site-wrap site-section"><div className="site-card skeleton" style={{ height: 300 }} /></div></SiteLayout>;
  if (a === null) {
    return (
      <SiteLayout title="Introuvable">
        <div className="site-wrap site-section empty">
          <Baobi size={120} />
          <strong>Ce contenu n’existe pas ou n’est plus publié.</strong>
          <Link to="/" className="btn">Retour à l’accueil</Link>
        </div>
      </SiteLayout>
    );
  }

  const back = a.category === 'conseil' ? '/conseils' : '/publications';
  return (
    <SiteLayout title={a.title.fr}>
      <article className="site-section">
        <div className="site-wrap article">
          <Link to={back} className="link"><ArrowLeft size={14} /> {a.category === 'conseil' ? 'Tous les conseils' : 'Toutes les publications'}</Link>
          <div className="article-hero">
            <Baobi size={140} mood={mood(a.illustration)} />
            <div>
              <span className={`pill ${a.category === 'conseil' ? 'good' : 'info'} no-dot`}>{LABEL[a.category]}</span>
              <h1>{a.title.fr}</h1>
              {a.published_at && <span className="small muted">Publié le {fmtLongDate(a.published_at)}</span>}
            </div>
          </div>
          <div className="article-body">
            {(a.body.fr ?? '').split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="article-cta">
            <div>
              <strong>Une question ? Envie d’en parler ?</strong>
              <span>Dans l’application, pose ta question à Baobi ou écris à une infirmière, sans donner ton nom.</span>
            </div>
            <Link to="/#application" className="btn"><Download size={18} /> Installer l’application</Link>
          </div>
          {more.length > 0 && (
            <>
              <h2 style={{ fontSize: 20, margin: '40px 0 16px' }}>À lire aussi</h2>
              <div className="site-grid-3">{more.map((x) => <ArticleCard key={x.id} a={x} />)}</div>
            </>
          )}
        </div>
      </article>
    </SiteLayout>
  );
}
