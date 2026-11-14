import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

export const AVATAR_BG = ['#FFD966', '#BFE0F7', '#D6EAF8', '#FFE29A'];
export const ACCESSORIES = ['cap', 'headphones', 'glasses', 'crown'] as const;
export type Accessory = (typeof ACCESSORIES)[number];

const SKIN = ['#8D5A3B', '#7A4A2E', '#6E4226', '#94603F'];

// Avatars personnalisables : 4 visages + accessoires optionnels. Aucun lien avec l'identité réelle.
export function Avatar({ face, accessory, size = 80, bg = true }: { face: number; accessory?: string | null; size?: number; bg?: boolean }) {
  const skin = SKIN[face % 4];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {bg && <Rect width={100} height={100} rx={18} fill={AVATAR_BG[face % 4]} />}
      {/* Épaules */}
      <Path d="M18 100 C18 80 32 72 50 72 C68 72 82 80 82 100 Z" fill={['#E85A05', '#1F5FBF', '#E8F0FA', '#076236'][face % 4]} />
      <Rect x={44} y={62} width={12} height={12} fill={skin} />
      {/* Cheveux arrière */}
      {face === 0 && <Circle cx={50} cy={20} r={12} fill="#2B1A10" />}
      {face === 2 && (
        <G fill="#2B1A10">
          <Circle cx={24} cy={30} r={11} />
          <Circle cx={76} cy={30} r={11} />
        </G>
      )}
      {/* Tête */}
      <Ellipse cx={50} cy={46} rx={22} ry={24} fill={skin} />
      {/* Cheveux avant */}
      {face === 0 && (
        <G>
          <Path d="M28 44 C28 20 72 20 72 44 C64 34 40 32 28 44 Z" fill="#2B1A10" />
          <Path d="M29 36 C40 26 60 26 71 36" stroke={colors.orange} strokeWidth={5} fill="none" />
        </G>
      )}
      {face === 1 && <Path d="M28 42 C28 22 72 22 72 42 C62 36 38 36 28 42 Z" fill="#2B1A10" />}
      {face === 2 && <Path d="M28 42 C28 20 72 20 72 42 C62 32 38 32 28 42 Z" fill="#2B1A10" />}
      {face === 3 && <Path d="M29 40 C30 22 70 22 71 40 C62 34 38 34 29 40 Z" fill="#1E120A" />}
      {/* Visage */}
      <Ellipse cx={42} cy={48} rx={3.2} ry={4} fill="#1E120A" />
      <Ellipse cx={58} cy={48} rx={3.2} ry={4} fill="#1E120A" />
      <Path d="M41 58 Q50 66 59 58" stroke="#3A1A10" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      {face === 2 && (
        <G stroke="#3A2214" strokeWidth={2} fill="none">
          <Circle cx={42} cy={48} r={7} />
          <Circle cx={58} cy={48} r={7} />
          <Path d="M49 48 L51 48" />
        </G>
      )}
      {/* Casquette par défaut du visage 1 */}
      {(face === 1 || accessory === 'cap') && (
        <G>
          <Path d="M27 36 C27 16 73 16 73 36 Z" fill={colors.blue} />
          <Path d="M50 34 L84 36 C84 40 70 41 50 38 Z" fill={colors.blueDark} />
        </G>
      )}
      {accessory === 'headphones' && (
        <G>
          <Path d="M26 46 C26 14 74 14 74 46" stroke="#333" strokeWidth={5} fill="none" />
          <Rect x={20} y={40} width={10} height={16} rx={4} fill="#333" />
          <Rect x={70} y={40} width={10} height={16} rx={4} fill="#333" />
        </G>
      )}
      {accessory === 'glasses' && (
        <G>
          <Rect x={33} y={42} width={15} height={10} rx={4} fill="#222" />
          <Rect x={52} y={42} width={15} height={10} rx={4} fill="#222" />
          <Path d="M48 46 L52 46" stroke="#222" strokeWidth={2} />
        </G>
      )}
      {accessory === 'crown' && (
        <Path d="M34 22 L38 8 L44 18 L50 6 L56 18 L62 8 L66 22 Z" fill={colors.sun} stroke="#E09A00" strokeWidth={1.5} />
      )}
    </Svg>
  );
}

export function AccessoryIcon({ kind, size = 30 }: { kind: Accessory; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {kind === 'cap' && (
        <G>
          <Path d="M6 26 C6 8 34 8 34 26 Z" fill={colors.blue} />
          <Path d="M20 24 L38 26 C38 29 30 30 20 28 Z" fill={colors.blueDark} />
        </G>
      )}
      {kind === 'headphones' && (
        <G>
          <Path d="M8 24 C8 6 32 6 32 24" stroke="#333" strokeWidth={4} fill="none" />
          <Rect x={4} y={20} width={9} height={13} rx={3} fill="#333" />
          <Rect x={27} y={20} width={9} height={13} rx={3} fill="#333" />
        </G>
      )}
      {kind === 'glasses' && (
        <G>
          <Rect x={3} y={14} width={15} height={11} rx={4} fill="#222" />
          <Rect x={22} y={14} width={15} height={11} rx={4} fill="#222" />
          <Path d="M18 18 L22 18" stroke="#222" strokeWidth={2} />
        </G>
      )}
      {kind === 'crown' && <Path d="M6 30 L9 12 L15 22 L20 8 L25 22 L31 12 L34 30 Z" fill={colors.sun} stroke="#E09A00" strokeWidth={1.5} />}
    </Svg>
  );
}
