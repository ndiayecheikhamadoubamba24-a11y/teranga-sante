import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

// Bandeau de motifs wax (bas d'écran).
export function WaxBand({ height = 26 }: { height?: number }) {
  const tri = Array.from({ length: 24 }, (_, i) => i);
  return (
    <Svg width="100%" height={height} viewBox="0 0 240 26" preserveAspectRatio="none">
      <Rect width={240} height={26} fill={colors.green} />
      {tri.map((i) => (
        <G key={i}>
          <Polygon points={`${i * 10},26 ${i * 10 + 5},10 ${i * 10 + 10},26`} fill={i % 2 ? colors.orange : colors.sun} />
          <Polygon points={`${i * 10},0 ${i * 10 + 5},10 ${i * 10 + 10},0`} fill={i % 3 ? colors.sun : colors.orange} />
        </G>
      ))}
    </Svg>
  );
}

function Baobab({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path d="M-5 0 L-7 -34 L-16 -46 M-7 -34 L0 -50 M-6 -34 L8 -46" stroke="#7A4A2A" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M-8 0 Q-6 -20 -5 -34 L5 -34 Q6 -20 8 0 Z" fill="#7A4A2A" />
      <Circle cx={-18} cy={-50} r={12} fill="#2F8F3A" />
      <Circle cx={0} cy={-56} r={14} fill="#3C9E3F" />
      <Circle cx={16} cy={-50} r={12} fill="#2F8F3A" />
    </G>
  );
}

function House({ x, y, w, h, wall, roof }: { x: number; y: number; w: number; h: number; wall: string; roof: string }) {
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} fill={wall} />
      <Polygon points={`${x - 4},${y} ${x + w / 2},${y - h * 0.45} ${x + w + 4},${y}`} fill={roof} />
      <Rect x={x + w * 0.15} y={y + h * 0.25} width={w * 0.2} height={h * 0.25} fill={colors.blue} />
      <Rect x={x + w * 0.65} y={y + h * 0.25} width={w * 0.2} height={h * 0.25} fill={colors.blue} />
      <Rect x={x + w * 0.4} y={y + h * 0.5} width={w * 0.2} height={h * 0.5} fill="#7A4A2A" />
    </G>
  );
}

// Quartier illustré (écran principal, profil).
export function Village({ height = 160 }: { height?: number }) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 360 160" preserveAspectRatio="xMidYMax slice">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8FD0F2" />
          <Stop offset="1" stopColor="#FFF1CC" />
        </LinearGradient>
      </Defs>
      <Rect width={360} height={160} fill="url(#sky)" />
      <Circle cx={300} cy={34} r={16} fill={colors.sun} />
      <Path d="M0 120 Q90 100 180 116 T360 110 L360 160 L0 160 Z" fill="#9CCB5B" />
      <Baobab x={30} y={124} s={1.2} />
      <Baobab x={330} y={120} s={1.1} />
      <House x={70} y={86} w={60} h={40} wall="#E9A15A" roof="#C65A2E" />
      <House x={150} y={80} w={70} h={46} wall="#F2C46B" roof="#B5532A" />
      {/* Étal de marché */}
      <G>
        <Rect x={238} y={98} width={56} height={28} fill="#F6E1B5" />
        <Path d="M232 98 L300 98 L294 84 L238 84 Z" fill={colors.red} />
        <Path d="M245 84 L245 98 M259 84 L259 98 M273 84 L273 98 M287 84 L287 98" stroke={colors.white} strokeWidth={5} />
        <Circle cx={252} cy={110} r={5} fill={colors.orange} />
        <Circle cx={266} cy={112} r={5} fill={colors.green} />
        <Circle cx={280} cy={110} r={5} fill={colors.sun} />
      </G>
      <Path d="M0 140 Q180 128 360 140 L360 160 L0 160 Z" fill="#E7C27D" />
    </Svg>
  );
}

// Plante qui grandit selon la régularité (0 à 5).
export function Plant({ stage, height = 150 }: { stage: number; height?: number }) {
  const s = Math.max(0, Math.min(5, stage));
  const stemTop = 110 - s * 14;
  return (
    <Svg width="100%" height={height} viewBox="0 0 300 150" preserveAspectRatio="xMidYMax meet">
      <Path d="M0 120 Q150 100 300 120 L300 150 L0 150 Z" fill="#8A5A34" />
      <Path d="M0 128 Q150 112 300 128" stroke="#6B4226" strokeWidth={3} fill="none" />
      <Path d="M40 118 q-6 -16 6 -22 q2 12 -6 22 Z M260 118 q6 -16 -6 -22 q-2 12 6 22 Z" fill="#6BB04A" />
      {s > 0 && <Path d={`M150 116 L150 ${stemTop}`} stroke="#3E8E3A" strokeWidth={6} strokeLinecap="round" />}
      {Array.from({ length: s }, (_, i) => {
        const y = 108 - i * 14;
        const left = i % 2 === 0;
        const size = 14 + i * 3;
        return left ? (
          <Path key={i} d={`M150 ${y} C${150 - size} ${y - 4} ${150 - size * 1.4} ${y - size} ${150 - size * 0.2} ${y - size * 0.9} C${150 - 4} ${y - size * 0.6} 150 ${y - 4} 150 ${y} Z`} fill={i === s - 1 ? '#5DBB46' : '#3E9E3A'} />
        ) : (
          <Path key={i} d={`M150 ${y} C${150 + size} ${y - 4} ${150 + size * 1.4} ${y - size} ${150 + size * 0.2} ${y - size * 0.9} C${150 + 4} ${y - size * 0.6} 150 ${y - 4} 150 ${y} Z`} fill={i === s - 1 ? '#5DBB46' : '#3E9E3A'} />
        );
      })}
      {s === 0 && <Circle cx={150} cy={114} r={6} fill="#C89A5C" />}
    </Svg>
  );
}

// Logo « Teranga Santé » avec soleil.
export function Logo({ width = 220 }: { width?: number }) {
  const rays = Array.from({ length: 7 }, (_, i) => -150 + i * 20);
  return (
    <Svg width={width} height={width * 0.62} viewBox="0 0 220 136">
      <G transform="translate(152 34)">
        {rays.map((a) => (
          <Rect key={a} x={-3} y={-30} width={6} height={12} rx={3} fill={colors.sun} transform={`rotate(${a + 90})`} />
        ))}
        <Path d="M-14 0 A14 14 0 0 1 14 0 Z" fill={colors.sun} />
      </G>
      <SvgText x={110} y={74} fontSize={44} fontWeight="800" fill={colors.green} textAnchor="middle" fontFamily="Poppins_800ExtraBold">
        Teranga
      </SvgText>
      <SvgText x={110} y={122} fontSize={44} fontWeight="800" fill={colors.orange} textAnchor="middle" fontFamily="Poppins_800ExtraBold">
        Santé
      </SvgText>
    </Svg>
  );
}

export function Flag({ kind, size = 34 }: { kind: 'fr' | 'wo' | 'ff'; size?: number }) {
  const id = `flag-${kind}`;
  const bands: Record<typeof kind, string[]> = {
    fr: ['#1F4FBF', '#FFFFFF', '#E53935'],
    wo: ['#1E8B3C', '#F7D21B', '#E53935'],
    ff: ['#1F4FBF', '#F7C21B', '#1F4FBF'],
  };
  const [a, b, c] = bands[kind];
  return (
    <Svg width={size} height={size} viewBox="0 0 34 34">
      <Defs>
        <ClipPath id={id}>
          <Circle cx={17} cy={17} r={16} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <Rect x={0} y={0} width={12} height={34} fill={a} />
        <Rect x={11} y={0} width={12} height={34} fill={b} />
        <Rect x={22} y={0} width={12} height={34} fill={c} />
        {kind === 'wo' && <Polygon points="17,11 18.6,15.6 23.4,15.6 19.5,18.4 21,23 17,20.2 13,23 14.5,18.4 10.6,15.6 15.4,15.6" fill="#1E8B3C" />}
      </G>
      <Circle cx={17} cy={17} r={16} fill="none" stroke="#fff" strokeWidth={2} />
    </Svg>
  );
}
