import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Écran temporaire : vérifie la connexion à Supabase. Remplacé par A1 (Connexion) dès réception des maquettes.
export default function Home() {
  const [status, setStatus] = useState('Connexion à Supabase…');

  useEffect(() => {
    supabase
      .from('centres')
      .select('id', { count: 'exact', head: true })
      .then(({ count, error }) =>
        setStatus(error ? `Erreur : ${error.message}` : `Supabase OK — ${count ?? 0} centre(s)`),
      );
  }, []);

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center' }}>
      <div>
        <h1 style={{ color: 'var(--green)', fontWeight: 800, fontSize: 40, margin: 0 }}>Teranga Santé</h1>
        <p style={{ fontWeight: 700 }}>Administration · Accès sécurisé et traçable 🔒</p>
        <p style={{ color: 'var(--muted)' }}>{status}</p>
      </div>
    </main>
  );
}
