import { CENTRES, type Centre } from '../data/content';
import { supabase, withTimeout } from './supabase';

export async function loadCentres(): Promise<Centre[]> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('centres').select('id, name, district, address, lat, lng, is_free, is_confidential, opening_hours').not('lat', 'is', null),
    );
    if (!error && data?.length) return data as Centre[];
  } catch {}
  return CENTRES;
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const formatKm = (km: number) => (km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km).toString()) + ' km';
