import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Baobi } from '../components/Baobi';
import { Empty, Modal, useToast } from '../components/ui';
import { usePro } from '../lib/auth';
import { LANG_LABEL } from '../lib/format';
import { logAction, supabase, type I18n, type Lang } from '../lib/supabase';

type Tab = 'articles' | 'quiz' | 'chatbot';
type Article = { id: string; title: I18n; body: I18n; illustration: string | null; published: boolean; category: 'conseil' | 'actualite' };
type Quiz = { id: string; statement: I18n; answer: boolean; explanation: I18n; topic: string | null; published: boolean; source?: 'manuel' | 'ia' };
type ChatOption = { label: I18n; next?: string; route?: string };
type Node = { id: string; message: I18n; options: ChatOption[]; published: boolean };
type Item = { kind: 'articles'; v: Article } | { kind: 'quiz'; v: Quiz } | { kind: 'chatbot'; v: Node };

const LANGS: Lang[] = ['fr', 'wo', 'ff'];
const MOODS = { baobi: 'happy', 'baobi-cheer': 'cheer', 'baobi-wave': 'wave', 'baobi-thumb': 'thumb' } as const;
const ROUTES = [
  { value: '/infirmieres', label: 'Liste des infirmières' },
  { value: '/discussion', label: 'Discussion avec une infirmière' },
  { value: '/carte', label: 'Carte des centres' },
  { value: '/jeu', label: 'Jeu Vrai ou Faux' },
  { value: '/traitement', label: 'Rappel de traitement' },
];

const tr = (x: I18n | undefined) => x?.fr ?? '';
const missing = (x: I18n | undefined) => LANGS.filter((l) => !x?.[l]?.trim());

function Thumb({ mood = 'baobi' }: { mood?: string | null }) {
  return (
    <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--sun-light)', display: 'grid', placeItems: 'center', overflow: 'hidden', flex: 'none' }}>
      <Baobi size={40} mood={MOODS[(mood ?? 'baobi') as keyof typeof MOODS] ?? 'happy'} />
    </div>
  );
}

// A6 — Bibliothèque de contenus : fiches, questions Vrai ou Faux, réponses du chatbot, aperçu mobile, brouillon/publié.
export default function Contents() {
  usePro();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [quiz, setQuiz] = useState<Quiz[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [preview, setPreview] = useState<Item | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const [a, q, n] = await Promise.all([
      supabase.from('articles').select('*').order('updated_at', { ascending: false }),
      supabase.from('quiz_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('chatbot_nodes').select('*').order('id'),
    ]);
    setArticles((a.data as Article[]) ?? []);
    setQuiz((q.data as Quiz[]) ?? []);
    setNodes((n.data as Node[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const items: Item[] = tab === 'articles' ? articles.map((v) => ({ kind: 'articles' as const, v }))
    : tab === 'quiz' ? quiz.map((v) => ({ kind: 'quiz' as const, v }))
    : nodes.map((v) => ({ kind: 'chatbot' as const, v }));
  const current = preview && preview.kind === tab ? preview : items[0] ?? null;

  const blank = (): Item => tab === 'articles'
    ? { kind: 'articles', v: { id: '', title: {}, body: {}, illustration: 'baobi', published: false, category: 'conseil' } }
    : tab === 'quiz'
      ? { kind: 'quiz', v: { id: '', statement: {}, answer: true, explanation: {}, topic: '', published: false } }
      : { kind: 'chatbot', v: { id: '', message: {}, options: [{ label: {}, next: 'root' }], published: false } };

  async function togglePublish(it: Item) {
    const table = it.kind === 'articles' ? 'articles' : it.kind === 'quiz' ? 'quiz_questions' : 'chatbot_nodes';
    const { error } = await supabase.from(table).update({ published: !it.v.published }).eq('id', it.v.id);
    if (error) return toast(error.message);
    logAction(`content.${it.v.published ? 'unpublish' : 'publish'}`, table, it.v.id);
    load();
  }

  return (
    <div className="page">
      <div className="page-head"><h1>Bibliothèque de contenus</h1></div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 300px', alignItems: 'start' }}>
        <section className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="tabs spacer">
              <button className={tab === 'articles' ? 'active' : ''} onClick={() => setTab('articles')}>Infos santé</button>
              <button className={tab === 'quiz' ? 'active' : ''} onClick={() => setTab('quiz')}>Jeux</button>
              <button className={tab === 'chatbot' ? 'active' : ''} onClick={() => setTab('chatbot')}>Chatbot</button>
            </div>
            {tab === 'quiz' && <button className="btn blue" onClick={() => setGenerating(true)}><Sparkles size={18} /> Générer avec l’IA</button>}
            <button className="btn" onClick={() => setEditing(blank())}><Plus size={18} /> Créer</button>
          </div>
          {items.length === 0 && <Empty title="Rien ici pour l’instant" hint="Crée un premier contenu : il restera en brouillon jusqu’à sa publication." />}
          {items.map((it) => {
            const title = it.kind === 'articles' ? tr(it.v.title) : it.kind === 'quiz' ? tr(it.v.statement) : `${it.v.id} — ${tr(it.v.message)}`;
            const sub = it.kind === 'quiz' ? `Réponse : ${it.v.answer ? 'Vrai' : 'Faux'}${it.v.topic ? ` · ${it.v.topic}` : ''}` : it.kind === 'chatbot' ? `${it.v.options.length} bouton(s)` : `${it.v.category === 'actualite' ? 'Publication' : 'Conseil'} · ${tr(it.v.body).slice(0, 70)}`;
            const miss = missing(it.kind === 'articles' ? it.v.title : it.kind === 'quiz' ? it.v.statement : it.v.message);
            return (
              <div key={it.v.id} className="list-item" style={{ cursor: 'pointer', background: current?.v.id === it.v.id ? 'var(--cream)' : undefined }} onClick={() => setPreview(it)}>
                <Thumb mood={it.kind === 'articles' ? it.v.illustration : it.kind === 'quiz' ? 'baobi-thumb' : 'baobi-wave'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                  <div className="small muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
                  {it.kind === 'quiz' && it.v.source === 'ia' && (
                    <div className="small" style={{ color: 'var(--blue)', fontWeight: 600 }}>
                      <Sparkles size={12} style={{ verticalAlign: -1 }} /> Générée par l’IA{it.v.published ? ' · validée' : ' · à relire avant publication'}
                    </div>
                  )}
                  {miss.length > 0 && <div className="small" style={{ color: '#8a5a00' }}>À traduire : {miss.map((l) => LANG_LABEL[l]).join(', ')}</div>}
                </div>
                <button className={`pill ${it.v.published ? 'good' : 'warning'}`} style={{ border: 0 }} onClick={(e) => { e.stopPropagation(); togglePublish(it); }} title="Changer le statut">
                  {it.v.published ? 'Publié' : 'Brouillon'}
                </button>
                <button className="btn light sm" onClick={(e) => { e.stopPropagation(); setEditing(it); }}>Modifier</button>
              </div>
            );
          })}
        </section>

        <aside className="card" style={{ position: 'sticky', top: 90 }}>
          <h2 style={{ fontSize: 15, marginBottom: 10 }}>Aperçu sur mobile</h2>
          <PhonePreview item={editing ?? current} />
        </aside>
      </div>
      {generating && <GenerateModal onClose={() => setGenerating(false)} onDone={() => { setGenerating(false); setTab('quiz'); load(); }} />}
      {editing && <Editor item={editing} onChange={setEditing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function PhonePreview({ item }: { item: Item | null }) {
  return (
    <div style={{ margin: '0 auto', width: 230, height: 440, borderRadius: 32, border: '8px solid var(--night)', background: 'var(--cream)', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 14, gap: 10, textAlign: 'center' }}>
      {!item ? <span className="small muted">Sélectionne un contenu</span> : item.kind === 'articles' ? (
        <>
          <Baobi size={90} mood={MOODS[(item.v.illustration ?? 'baobi') as keyof typeof MOODS] ?? 'happy'} />
          <strong style={{ fontSize: 16 }}>{tr(item.v.title) || 'Titre de la fiche'}</strong>
          <p className="small" style={{ margin: 0, overflow: 'hidden' }}>{tr(item.v.body) || 'Texte de la fiche…'}</p>
        </>
      ) : item.kind === 'quiz' ? (
        <>
          <Baobi size={80} mood="thumb" />
          <div style={{ background: '#fff', borderRadius: 16, padding: 12, fontWeight: 700, boxShadow: 'var(--shadow)' }}>{tr(item.v.statement) || 'Affirmation…'}</div>
          <div className="row" style={{ width: '100%' }}>
            <span className="btn red sm" style={{ flex: 1 }}>Faux</span>
            <span className="btn sm" style={{ flex: 1 }}>Vrai</span>
          </div>
          <p className="small" style={{ margin: 0 }}><strong>{item.v.answer ? 'Vrai' : 'Faux'}</strong> — {tr(item.v.explanation)}</p>
        </>
      ) : (
        <>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <Baobi size={56} />
            <div style={{ background: '#fff', borderRadius: 14, padding: 10, fontSize: 12, textAlign: 'left', boxShadow: 'var(--shadow)' }}>{tr(item.v.message) || 'Message de Baobi…'}</div>
          </div>
          {item.v.options.map((o, i) => (
            <span key={i} style={{ border: '2px solid var(--border)', background: '#fff', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600, width: '100%' }}>{tr(o.label) || 'Bouton'}</span>
          ))}
        </>
      )}
    </div>
  );
}

function I18nField({ label, value, onChange, multiline }: { label: string; value: I18n; onChange: (v: I18n) => void; multiline?: boolean }) {
  const [lang, setLang] = useState<Lang>('fr');
  const Comp = multiline ? 'textarea' : 'input';
  return (
    <div className="field">
      <div className="row">
        <label className="spacer">{label}</label>
        {LANGS.map((l) => (
          <button key={l} type="button" className={`pill ${lang === l ? 'good' : value[l]?.trim() ? 'muted' : 'warning'} no-dot`} style={{ border: 0 }} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
        ))}
      </div>
      <Comp
        className={multiline ? 'textarea' : 'input'}
        value={value[lang] ?? ''}
        onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
        placeholder={lang === 'fr' ? '' : `Traduction en ${LANG_LABEL[lang].toLowerCase()} (relue par un locuteur natif)`}
        aria-label={`${label} (${LANG_LABEL[lang]})`}
      />
    </div>
  );
}

function Editor({ item, onChange, onClose, onSaved }: { item: Item; onChange: (i: Item) => void; onClose: () => void; onSaved: () => void }) {
  const pro = usePro();
  const toast = useToast();
  const [isNew] = useState(() => !item.v.id);
  const set = <K extends Item['kind']>(patch: Partial<Extract<Item, { kind: K }>['v']>) => onChange({ ...item, v: { ...item.v, ...patch } } as Item);

  async function save(published?: boolean) {
    const v = { ...item.v, ...(published !== undefined ? { published } : {}) };
    let res;
    if (item.kind === 'articles') {
      const a = v as Article;
      if (!a.title.fr?.trim()) return toast('Le titre en français est obligatoire.');
      const row = { title: a.title, body: a.body, illustration: a.illustration, category: a.category, published: a.published, author_id: pro.id, updated_at: new Date().toISOString() };
      res = a.id ? await supabase.from('articles').update(row).eq('id', a.id) : await supabase.from('articles').insert(row);
    } else if (item.kind === 'quiz') {
      const q = v as Quiz;
      if (!q.statement.fr?.trim() || !q.explanation.fr?.trim()) return toast('L’affirmation et l’explication en français sont obligatoires.');
      const row = { statement: q.statement, answer: q.answer, explanation: q.explanation, topic: q.topic, published: q.published, author_id: pro.id };
      res = q.id ? await supabase.from('quiz_questions').update(row).eq('id', q.id) : await supabase.from('quiz_questions').insert(row);
    } else {
      const n = v as Node;
      if (!/^[a-z0-9_-]{2,30}$/.test(n.id)) return toast('Identifiant : 2 à 30 caractères (a-z, 0-9, - ou _).');
      if (!n.message.fr?.trim()) return toast('Le message en français est obligatoire.');
      res = await supabase.from('chatbot_nodes').upsert({ id: n.id, message: n.message, options: n.options, published: n.published });
    }
    if (res.error) return toast(res.error.message);
    logAction(`content.${item.kind}.save`, item.kind, item.v.id || 'new');
    toast('Contenu enregistré');
    onSaved();
  }

  async function remove() {
    if (!item.v.id || !confirm('Supprimer définitivement ce contenu ?')) return;
    const table = item.kind === 'articles' ? 'articles' : item.kind === 'quiz' ? 'quiz_questions' : 'chatbot_nodes';
    const { error } = await supabase.from(table).delete().eq('id', item.v.id);
    if (error) return toast(error.message);
    logAction(`content.${item.kind}.delete`, table, item.v.id);
    onSaved();
  }

  return (
    <Modal title={`${isNew ? 'Créer' : 'Modifier'} — ${item.kind === 'articles' ? 'fiche d’information' : item.kind === 'quiz' ? 'question Vrai ou Faux' : 'réponse du chatbot'}`} onClose={onClose}>
      {item.kind === 'articles' && (
        <>
          <div className="field"><label>Rubrique du site</label>
            <div className="row">
              <button type="button" className={`btn sm ${item.v.category === 'conseil' ? '' : 'light'}`} onClick={() => set<'articles'>({ category: 'conseil' })}>Conseil santé</button>
              <button type="button" className={`btn sm ${item.v.category === 'actualite' ? 'blue' : 'light'}`} onClick={() => set<'articles'>({ category: 'actualite' })}>Publication</button>
            </div>
            <span className="small muted">Une fois publiée, la fiche apparaît sur le site vitrine (rubrique {item.v.category === 'conseil' ? 'Conseils' : 'Publications'}).</span>
          </div>
          <I18nField label="Titre" value={item.v.title} onChange={(title) => set<'articles'>({ title })} />
          <I18nField label="Texte" value={item.v.body} onChange={(body) => set<'articles'>({ body })} multiline />
        </>
      )}
      {item.kind === 'quiz' && (
        <>
          <I18nField label="Affirmation" value={item.v.statement} onChange={(statement) => set<'quiz'>({ statement })} multiline />
          <div className="field"><label>Bonne réponse</label>
            <div className="row">
              <button type="button" className={`btn sm ${item.v.answer ? '' : 'light'}`} onClick={() => set<'quiz'>({ answer: true })}>Vrai</button>
              <button type="button" className={`btn sm ${!item.v.answer ? 'red' : 'light'}`} onClick={() => set<'quiz'>({ answer: false })}>Faux</button>
            </div>
          </div>
          <I18nField label="Explication courte" value={item.v.explanation} onChange={(explanation) => set<'quiz'>({ explanation })} multiline />
          <div className="field"><label htmlFor="qt">Thème</label><input id="qt" className="input" value={item.v.topic ?? ''} onChange={(e) => set<'quiz'>({ topic: e.target.value })} /></div>
        </>
      )}
      {item.kind === 'chatbot' && (
        <>
          <div className="field"><label htmlFor="ni">Identifiant</label><input id="ni" className="input" value={item.v.id} onChange={(e) => set<'chatbot'>({ id: e.target.value.toLowerCase() })} placeholder="ex : prep" /></div>
          <I18nField label="Message de Baobi" value={item.v.message} onChange={(message) => set<'chatbot'>({ message })} multiline />
          <div className="field"><label>Boutons de réponse</label>
            {item.v.options.map((o, i) => (
              <div key={i} className="row" style={{ alignItems: 'flex-start', background: 'var(--cream)', borderRadius: 12, padding: 8 }}>
                <div style={{ flex: 1 }}>
                  <I18nField label={`Bouton ${i + 1}`} value={o.label} onChange={(label) => { const options = [...item.v.options]; options[i] = { ...o, label }; set<'chatbot'>({ options }); }} />
                  <select className="select" style={{ marginTop: 6 }} aria-label="Destination" value={o.route ? `route:${o.route}` : `next:${o.next ?? ''}`} onChange={(e) => {
                    const [k, val] = e.target.value.split(':');
                    const options = [...item.v.options];
                    options[i] = { label: o.label, ...(k === 'route' ? { route: val } : { next: val }) };
                    set<'chatbot'>({ options });
                  }}>
                    <optgroup label="Réponse suivante">
                      {['root', 'proteger', 'depister', 'positif', 'prep', 'autotest'].map((id) => <option key={id} value={`next:${id}`}>{id}</option>)}
                    </optgroup>
                    <optgroup label="Ouvrir un module">
                      {ROUTES.map((r) => <option key={r.value} value={`route:${r.value}`}>{r.label}</option>)}
                    </optgroup>
                  </select>
                </div>
                <button type="button" className="icon-btn" aria-label="Retirer le bouton" onClick={() => set<'chatbot'>({ options: item.v.options.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
              </div>
            ))}
            {item.v.options.length < 4 && <button type="button" className="link" onClick={() => set<'chatbot'>({ options: [...item.v.options, { label: {}, next: 'root' }] })}><Plus size={14} /> Ajouter un bouton</button>}
          </div>
        </>
      )}
      <div className="banner info small">Les contenus de santé doivent être validés par une infirmière avant publication.</div>
      <div className="row">
        <button className="btn light" onClick={() => save(false)}>Enregistrer en brouillon</button>
        <button className="btn" onClick={() => save(true)}>Publier</button>
        <span className="spacer" />
        {item.v.id && item.kind !== 'chatbot' && <button className="btn red sm" onClick={remove}><Trash2 size={14} /> Supprimer</button>}
      </div>
    </Modal>
  );
}

/** Message d'erreur précis pour « Générer avec l'IA » : on distingue fonction absente, plantage, clé manquante, refus. */
async function explainQuizError(error: { message: string; context?: unknown }): Promise<string> {
  const res = error.context instanceof Response ? error.context : null;
  if (!res) {
    // Aucune réponse HTTP exploitable : la fonction n'existe pas sous ce nom, ou elle plante avant de répondre.
    return 'La fonction « ai-quiz » ne répond pas. Vérifie dans Supabase → Edge Functions qu’elle existe sous ce nom exact, puis ouvre ses « Logs » : une erreur au démarrage s’y affiche.';
  }
  let body: { error?: string; message?: string; code?: string } = {};
  try { body = await res.clone().json(); } catch { /* corps non JSON */ }
  const detail = body.error ?? body.message ?? '';
  if (res.status === 404 || body.code === 'NOT_FOUND') return 'La fonction « ai-quiz » n’est pas déployée : Supabase → Edge Functions → Deploy a new function, nommée exactement ai-quiz (voir le README).';
  if (/GEMINI_API_KEY/.test(detail)) return 'La clé GEMINI_API_KEY manque : Supabase → Edge Functions → Secrets → ajouter GEMINI_API_KEY, puis réessayer (pas besoin de redéployer).';
  if (res.status === 401) return `Session refusée par la fonction (${detail || 'jeton invalide'}). Déconnecte-toi puis reconnecte-toi ; si ça continue, vérifie le réglage « Verify JWT » de la fonction ai-quiz.`;
  if (/IA indisponible \((400|403)\)/.test(detail)) return `${detail} : la clé Gemini est refusée par Google (clé invalide, API non activée ou région non autorisée). Vérifie la clé sur aistudio.google.com.`;
  if (/IA indisponible \(429\)/.test(detail)) return `${detail} : quota Gemini dépassé. Réessaie plus tard ou passe à une clé avec facturation.`;
  if (/IA indisponible \(404\)/.test(detail)) return `${detail} : modèle Gemini introuvable. Retire ou corrige le secret GEMINI_MODEL (défaut : gemini-2.5-flash).`;
  return detail ? `${detail} (code ${res.status})` : `Erreur ${res.status} de la fonction « ai-quiz » : consulte ses Logs dans Supabase.`;
}

/** Génération de questions Vrai ou Faux par l'IA (Gemini, fonction serveur ai-quiz) : créées en brouillon. */
function GenerateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [count, setCount] = useState(5);
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('ai-quiz', { body: { count, topic } });
    setBusy(false);
    if (error) return toast(await explainQuizError(error));
    toast(`${data.inserted} question(s) générée(s) en brouillon : relis-les puis publie-les.`);
    onDone();
  };
  return (
    <Modal title="Générer des questions avec l’IA" onClose={onClose}>
      <div className="field">
        <label htmlFor="gq-c">Nombre de questions</label>
        <select id="gq-c" className="select" value={count} onChange={(e) => setCount(Number(e.target.value))}>
          {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="gq-t">Thème (facultatif)</label>
        <input id="gq-t" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ex : PrEP, autotest, idées reçues sur la transmission…" maxLength={80} />
      </div>
      <div className="banner info small">
        <span>Les questions sont créées en <strong>brouillon</strong>. Une infirmière doit vérifier chaque affirmation et son explication avant de la publier dans le jeu.</span>
      </div>
      <button className="btn lg blue" disabled={busy} onClick={run}><Sparkles size={18} /> {busy ? 'Génération en cours…' : `Générer ${count} questions`}</button>
    </Modal>
  );
}
