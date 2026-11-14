import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
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

// ---------- Position de l'utilisateur (reste sur le téléphone, jamais envoyée) ----------

export type LatLng = { lat: number; lng: number };
let cached: LatLng | null = null;
let pending: Promise<LatLng | null> | null = null;

export function getMyLocation(): Promise<LatLng | null> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = Location.requestForegroundPermissionsAsync()
      .then(({ status }) => (status === 'granted' ? Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }) : null))
      .then((pos) => (cached = pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null))
      .catch(() => null)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** Position actuelle (null tant qu'elle est inconnue ou refusée). */
export function useMyLocation() {
  const [me, setMe] = useState<LatLng | null>(cached);
  useEffect(() => {
    let alive = true;
    getMyLocation().then((p) => alive && setMe(p));
    return () => {
      alive = false;
    };
  }, []);
  return me;
}

/** Centres triés du plus proche au plus loin (ordre alphabétique si la position est inconnue). */
export function byDistance<T extends { lat: number; lng: number; name: string }>(items: T[], me: LatLng | null) {
  return [...items]
    .map((c) => ({ ...c, km: me ? distanceKm(me, c) : null }))
    .sort((a, b) => (a.km != null && b.km != null ? a.km - b.km : a.name.localeCompare(b.name)));
}
