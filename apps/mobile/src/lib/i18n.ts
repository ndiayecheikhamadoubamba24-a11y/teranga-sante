// Libellés de l'interface. Le wolof (wo) et le pulaar (ff) doivent être traduits et relus
// par des locuteurs natifs : en attendant, les clés manquantes retombent sur le français.
export type Lang = 'fr' | 'wo' | 'ff';

const fr = {
  tagline: "S'informer • Se protéger\n• Avancer ensemble",
  baobiHello: 'Salut ! Je suis Baobi ! Bienvenue sur Teranga Santé !',
  chooseLang: 'Choisissez votre langue :',
  createProfile: 'Crée ton profil',
  createProfileSub: 'Choisis un pseudo et ton avatar',
  pseudo: 'Mon pseudo',
  accessories: 'Accessoires (optionnel)',
  letsGo: "C'est parti !",
  getTested: 'Je me fais\ndépister',
  playLearn: 'Je joue\net j’apprends',
  treatment: 'Je me soigne',
  home: 'Accueil',
  games: 'Jeux',
  map: 'Carte',
  me: 'Moi',
};

type Dict = typeof fr;
const dicts: Record<Lang, Partial<Dict>> = { fr, wo: {}, ff: {} };

export function translate(lang: Lang, key: keyof Dict): string {
  return dicts[lang][key] ?? fr[key];
}
export type I18nKey = keyof Dict;
