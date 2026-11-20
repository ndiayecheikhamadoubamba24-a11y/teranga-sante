import { LEAFLET_CSS, LEAFLET_JS } from './leaflet-assets';

// Fond de carte : tuiles raster au format {z}/{x}/{y}. Par défaut OpenStreetMap, dont la politique d'usage
// demande une autorisation pour une application distribuée : définir EXPO_PUBLIC_TILE_URL (et
// EXPO_PUBLIC_TILE_ATTRIBUTION) avec un fournisseur autorisé avant la publication (voir docs/CONFORMITE.md).
const TILE_URL = process.env.EXPO_PUBLIC_TILE_URL?.trim() || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = process.env.EXPO_PUBLIC_TILE_ATTRIBUTION?.trim() || '© les contributeurs d’OpenStreetMap';

export type MapPin = { id: string; lat: number; lng: number; selected?: boolean };
export type MapProps = { pins: MapPin[]; user?: { lat: number; lng: number } | null; onSelect: (id: string) => void };

// Carte Leaflet (embarquée dans l'app, aucun CDN) dans une WebView / iframe.
export const LEAFLET_HTML = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>${LEAFLET_CSS}</style>
<script>${LEAFLET_JS}</script>
<style>html,body,#m{margin:0;height:100%;background:#F4EEDC}.leaflet-control-attribution{font-size:9px}</style>
</head><body><div id="m"></div><script>
var map = L.map('m', { zoomControl: false }).setView([14.7167, -17.4677], 11);
L.tileLayer(${JSON.stringify(TILE_URL)}, { maxZoom: 18, attribution: ${JSON.stringify(TILE_ATTRIBUTION)} }).addTo(map);
var layer = L.layerGroup().addTo(map), me = null, first = true;
function pin(sel){ var c = sel ? '#076236' : '#E53935', s = sel ? 44 : 36;
  return L.divIcon({ className: '', iconSize: [s, s], iconAnchor: [s/2, s],
    html: '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><path fill="'+c+'" stroke="#fff" stroke-width="1.2" d="M12 1.5C7.6 1.5 4 5 4 9.4c0 5.6 8 13.1 8 13.1s8-7.5 8-13.1C20 5 16.4 1.5 12 1.5z"/><circle cx="12" cy="9.5" r="3.2" fill="#fff"/></svg>' }); }
function send(m){ var s = JSON.stringify(m); if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s); else parent.postMessage(s, '*'); }
function update(d){
  layer.clearLayers(); var b = [];
  d.pins.forEach(function(p){ b.push([p.lat, p.lng]);
    L.marker([p.lat, p.lng], { icon: pin(p.selected) }).on('click', function(){ send({ type: 'select', id: p.id }); }).addTo(layer);
    if (p.selected && !first) map.panTo([p.lat, p.lng]); });
  if (d.user) { if (me) map.removeLayer(me);
    me = L.circleMarker([d.user.lat, d.user.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#1F5FBF', fillOpacity: 1 }).addTo(map); b.push([d.user.lat, d.user.lng]); }
  if (first && b.length) { map.fitBounds(b, { padding: [40, 40], maxZoom: 13 }); first = false; }
}
function onMsg(e){ try { var d = JSON.parse(e.data); if (d.type === 'update') update(d); } catch(_){} }
window.addEventListener('message', onMsg); document.addEventListener('message', onMsg);
send({ type: 'ready' });
</script></body></html>`;
