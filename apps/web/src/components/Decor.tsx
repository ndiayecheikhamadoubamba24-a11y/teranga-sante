import { colors } from '../lib/colors';

// Bandeau de motifs wax (bas d'écran).
export function WaxBand({ height = 26 }: { height?: number }) {
  const tri = Array.from({ length: 24 }, (_, i) => i);
  return (
    <svg width="100%" height={height} viewBox="0 0 240 26" preserveAspectRatio="none">
      <rect width={240} height={26} fill={colors.green} />
      {tri.map((i) => (
        <g key={i}>
          <polygon points={`${i * 10},26 ${i * 10 + 5},10 ${i * 10 + 10},26`} fill={i % 2 ? colors.orange : colors.sun} />
          <polygon points={`${i * 10},0 ${i * 10 + 5},10 ${i * 10 + 10},0`} fill={i % 3 ? colors.sun : colors.orange} />
        </g>
      ))}
    </svg>
  );
}
