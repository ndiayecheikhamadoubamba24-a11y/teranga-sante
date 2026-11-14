import { createElement, useEffect, useRef, useState } from 'react';
import { LEAFLET_HTML, type MapProps } from './html';

export function LeafletMap({ pins, user, onSelect }: MapProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'ready') setReady(true);
        if (d.type === 'select') select.current(d.id);
      } catch {}
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    if (ready) ref.current?.contentWindow?.postMessage(JSON.stringify({ type: 'update', pins, user }), '*');
  }, [ready, pins, user]);

  return createElement('iframe', { ref, srcDoc: LEAFLET_HTML, style: { border: 0, width: '100%', height: '100%', background: '#F4EEDC' } });
}
