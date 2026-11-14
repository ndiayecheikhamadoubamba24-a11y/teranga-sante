import { type ComponentType, useEffect, useRef, useState } from 'react';
import { WebView as RNWebView } from 'react-native-webview';
import { LEAFLET_HTML, type MapProps } from './html';

// Les types de react-native-webview 14 ne sont pas encore alignés sur React Native 0.88.
type WebViewHandle = { injectJavaScript: (js: string) => void };
const WebView = RNWebView as unknown as ComponentType<Record<string, unknown> & { ref?: React.Ref<WebViewHandle> }>;

export function LeafletMap({ pins, user, onSelect }: MapProps) {
  const ref = useRef<WebViewHandle>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const msg = JSON.stringify({ type: 'update', pins, user });
    ref.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(msg)} })); true;`);
  }, [ready, pins, user]);
  return (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={{ html: LEAFLET_HTML }}
      style={{ flex: 1, backgroundColor: '#F4EEDC' }}
      onMessage={(e: { nativeEvent: { data: string } }) => {
        const d = JSON.parse(e.nativeEvent.data);
        if (d.type === 'ready') setReady(true);
        if (d.type === 'select') onSelect(d.id);
      }}
    />
  );
}
