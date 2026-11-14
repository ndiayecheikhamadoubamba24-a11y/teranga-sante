import type { ImageSourcePropType } from 'react-native';

// Arrière-plans de l'application (choisis par l'utilisateur dans « Moi »).
// `veil` = voile crème posé par-dessus pour garder le texte lisible (0 = aucun).
export type BackgroundId = 'motifs' | 'savane' | 'baobab' | 'wax';

export const BACKGROUNDS: { id: BackgroundId; label: string; source: ImageSourcePropType; thumb: ImageSourcePropType; veil: number }[] = [
  { id: 'motifs', label: 'Motifs', source: require('../../assets/backgrounds/motifs.jpg'), thumb: require('../../assets/backgrounds/motifs-mini.jpg'), veil: 0 },
  { id: 'savane', label: 'Savane', source: require('../../assets/backgrounds/savane.jpg'), thumb: require('../../assets/backgrounds/savane-mini.jpg'), veil: 0.45 },
  { id: 'baobab', label: 'Baobab', source: require('../../assets/backgrounds/baobab.jpg'), thumb: require('../../assets/backgrounds/baobab-mini.jpg'), veil: 0.3 },
  { id: 'wax', label: 'Wax', source: require('../../assets/backgrounds/wax.jpg'), thumb: require('../../assets/backgrounds/wax-mini.jpg'), veil: 0.82 },
];

export const DEFAULT_BACKGROUND: BackgroundId = 'motifs';
export const backgroundOf = (id?: string) => BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
