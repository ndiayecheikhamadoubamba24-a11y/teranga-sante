import { colors } from '../lib/colors';

type Mood = 'happy' | 'cheer' | 'wave' | 'thumb';

// Mascotte Baobi : un jeune baobab souriant (couronne de feuillage, t-shirt jaune motif wax).
export function Baobi({ size = 160, mood = 'happy' }: { size?: number; mood?: Mood }) {
  const leaf = '#2F8F3A';
  const leafDark = '#1E6B2A';
  const leafLight = '#4FAE45';
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 200 240" role="img" aria-label="Baobi">
      {/* Bras levés derrière le corps */}
      {mood === 'cheer' && (
        <g>
          <path d="M58 190 L22 132" stroke={colors.skin} strokeWidth={16} strokeLinecap="round" />
          <path d="M142 190 L178 132" stroke={colors.skin} strokeWidth={16} strokeLinecap="round" />
          <circle cx={20} cy={126} r={11} fill={colors.skin} />
          <circle cx={180} cy={126} r={11} fill={colors.skin} />
        </g>
      )}
      {mood === 'wave' && (
        <g>
          <path d="M146 192 L182 140" stroke={colors.skin} strokeWidth={16} strokeLinecap="round" />
          <circle cx={184} cy={132} r={12} fill={colors.skin} />
        </g>
      )}

      {/* Tronc / cou + t-shirt */}
      <rect x={86} y={160} width={28} height={26} fill={colors.skinDark} />
      <path d="M44 240 C44 200 66 182 100 182 C134 182 156 200 156 240 Z" fill={colors.sun} />
      <path d="M86 182 L100 200 L114 182" fill="none" stroke="#E89A00" strokeWidth={4} />
      <g fill={colors.orange}>
        <rect x={92} y={210} width={16} height={4} rx={2} />
        <rect x={98} y={204} width={4} height={18} rx={2} />
        <rect x={86} y={222} width={6} height={6} rx={1} />
        <rect x={108} y={222} width={6} height={6} rx={1} />
      </g>

      {mood === 'thumb' && (
        <g>
          <path d="M58 236 C52 214 58 200 70 196" stroke={colors.skin} strokeWidth={15} strokeLinecap="round" fill="none" />
          <rect x={60} y={176} width={20} height={22} rx={8} fill={colors.skin} />
          <rect x={64} y={162} width={9} height={20} rx={4.5} fill={colors.skin} />
        </g>
      )}

      {/* Couronne de baobab */}
      <g>
        <path d="M100 76 L100 50 M100 62 L84 44 M100 60 L118 40" stroke="#7A4A2A" strokeWidth={6} strokeLinecap="round" />
        <circle cx={56} cy={62} r={24} fill={leafDark} />
        <circle cx={144} cy={62} r={24} fill={leafDark} />
        <circle cx={80} cy={36} r={26} fill={leaf} />
        <circle cx={122} cy={34} r={26} fill={leaf} />
        <circle cx={100} cy={24} r={20} fill={leafLight} />
        <circle cx={38} cy={84} r={16} fill={leaf} />
        <circle cx={162} cy={84} r={16} fill={leaf} />
        <circle cx={66} cy={48} r={10} fill={leafLight} />
        <circle cx={140} cy={46} r={10} fill={leafLight} />
      </g>

      {/* Tête */}
      <circle cx={52} cy={124} r={10} fill={colors.skin} />
      <circle cx={148} cy={124} r={10} fill={colors.skin} />
      <ellipse cx={100} cy={118} rx={48} ry={50} fill={colors.skin} />
      {/* Frange de feuilles sur le front */}
      <path d="M54 98 C60 72 140 72 146 98 C134 86 120 92 112 84 C104 92 92 84 86 90 C76 84 64 92 54 98 Z" fill={leafDark} />

      {/* Yeux */}
      <ellipse cx={82} cy={114} rx={11} ry={13} fill={colors.white} />
      <ellipse cx={118} cy={114} rx={11} ry={13} fill={colors.white} />
      <circle cx={84} cy={116} r={6.5} fill="#2B1A10" />
      <circle cx={116} cy={116} r={6.5} fill="#2B1A10" />
      <circle cx={86} cy={113} r={2.2} fill={colors.white} />
      <circle cx={118} cy={113} r={2.2} fill={colors.white} />
      <path d="M70 98 Q82 92 92 98" stroke="#3A2214" strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <path d="M108 98 Q118 92 130 98" stroke="#3A2214" strokeWidth={3.5} fill="none" strokeLinecap="round" />

      {/* Joues + sourire */}
      <circle cx={68} cy={134} r={7} fill="#C97A5A" opacity={0.5} />
      <circle cx={132} cy={134} r={7} fill="#C97A5A" opacity={0.5} />
      <path d="M76 134 Q100 168 124 134 Z" fill="#5A1E14" />
      <path d="M80 135 Q100 142 120 135 L119 139 Q100 145 81 139 Z" fill={colors.white} />
      <path d="M88 152 Q100 160 112 152 Q100 146 88 152 Z" fill="#E0594A" />
    </svg>
  );
}
