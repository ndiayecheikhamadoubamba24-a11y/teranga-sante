import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { Image, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

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

// Logo officiel « Teranga Santé » (fichier fourni), version complète empilée. `width` = largeur.
export function Logo({ width = 220 }: { width?: number }) {
  return <Image source={require('../../assets/logo.png')} style={{ width, height: width * 0.979 }} resizeMode="contain" accessibilityLabel="Teranga Santé" />;
}

// Version horizontale (bandeaux) : emblème + nom aux couleurs du logo.
export function LogoInline({ height = 40 }: { height?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: height * 0.18 }} accessible accessibilityLabel="Teranga Santé">
      <Image source={require('../../assets/logo-mark.png')} style={{ height, width: height * 1.586 }} resizeMode="contain" />
      <View>
        <Text style={{ fontFamily: fonts.black, fontSize: height * 0.4, lineHeight: height * 0.44, color: colors.green }}>Teranga</Text>
        <Text style={{ fontFamily: fonts.black, fontSize: height * 0.4, lineHeight: height * 0.44, color: colors.orange }}>Santé</Text>
      </View>
    </View>
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
