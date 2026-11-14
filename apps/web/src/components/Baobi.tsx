type Mood = 'happy' | 'cheer' | 'wave' | 'thumb';

// Rapport largeur / hauteur de l'emblème du logo (baobab + soleil).
const RATIO = 1.586;

/**
 * Baobi = le baobab du logo officiel Teranga Santé.
 * `size` = largeur en px. Quand Baobi se réjouit (`cheer`), il fait un petit rebond.
 */
export function Baobi({ size = 160, mood = 'happy' }: { size?: number; mood?: Mood }) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      width={size}
      height={Math.round(size / RATIO)}
      className={mood === 'cheer' ? 'baobi-cheer' : undefined}
      style={{ display: 'block' }}
    />
  );
}
