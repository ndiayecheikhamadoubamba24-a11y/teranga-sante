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

function Baobab({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-5 0 L-7 -34 L-16 -46 M-7 -34 L0 -50 M-6 -34 L8 -46" stroke="#7A4A2A" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M-8 0 Q-6 -20 -5 -34 L5 -34 Q6 -20 8 0 Z" fill="#7A4A2A" />
      <circle cx={-18} cy={-50} r={12} fill="#2F8F3A" />
      <circle cx={0} cy={-56} r={14} fill="#3C9E3F" />
      <circle cx={16} cy={-50} r={12} fill="#2F8F3A" />
    </g>
  );
}

function House({ x, y, w, h, wall, roof }: { x: number; y: number; w: number; h: number; wall: string; roof: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={wall} />
      <polygon points={`${x - 4},${y} ${x + w / 2},${y - h * 0.45} ${x + w + 4},${y}`} fill={roof} />
      <rect x={x + w * 0.15} y={y + h * 0.25} width={w * 0.2} height={h * 0.25} fill={colors.blue} />
      <rect x={x + w * 0.65} y={y + h * 0.25} width={w * 0.2} height={h * 0.25} fill={colors.blue} />
      <rect x={x + w * 0.4} y={y + h * 0.5} width={w * 0.2} height={h * 0.5} fill="#7A4A2A" />
    </g>
  );
}

// Quartier illustré (écran principal, profil).
export function Village({ height = 160 }: { height?: number }) {
  return (
    <svg width="100%" height={height} viewBox="0 0 360 160" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD0F2" />
          <stop offset="1" stopColor="#FFF1CC" />
        </linearGradient>
      </defs>
      <rect width={360} height={160} fill="url(#sky)" />
      <circle cx={300} cy={34} r={16} fill={colors.sun} />
      <path d="M0 120 Q90 100 180 116 T360 110 L360 160 L0 160 Z" fill="#9CCB5B" />
      <Baobab x={30} y={124} s={1.2} />
      <Baobab x={330} y={120} s={1.1} />
      <House x={70} y={86} w={60} h={40} wall="#E9A15A" roof="#C65A2E" />
      <House x={150} y={80} w={70} h={46} wall="#F2C46B" roof="#B5532A" />
      {/* Étal de marché */}
      <g>
        <rect x={238} y={98} width={56} height={28} fill="#F6E1B5" />
        <path d="M232 98 L300 98 L294 84 L238 84 Z" fill={colors.red} />
        <path d="M245 84 L245 98 M259 84 L259 98 M273 84 L273 98 M287 84 L287 98" stroke={colors.white} strokeWidth={5} />
        <circle cx={252} cy={110} r={5} fill={colors.orange} />
        <circle cx={266} cy={112} r={5} fill={colors.green} />
        <circle cx={280} cy={110} r={5} fill={colors.sun} />
      </g>
      <path d="M0 140 Q180 128 360 140 L360 160 L0 160 Z" fill="#E7C27D" />
    </svg>
  );
}


/** Bandeau de quartier : le village est répété horizontalement au lieu d'être recadré. */
export function VillageStrip({ height = 110 }: { height?: number }) {
  return (
    <div style={{ display: 'flex', height, overflow: 'hidden', background: '#FFF1CC' }} aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{ flex: 'none', width: height * 2.25 }}><Village height={height} /></div>
      ))}
    </div>
  );
}
