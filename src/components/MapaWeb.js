import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Mapa feito com MapLibre + OpenFreeMap (dados do OpenStreetMap) dentro de uma WebView.
 * Funciona no Expo Go e no app instalado, em Android e iPhone, sem chave do Google Maps.
 *
 * Props:
 *  - centro: { latitude, longitude, zoom }     posição inicial
 *  - marcadores: [{ id, latitude, longitude, titulo, subtitulo, cor }]
 *  - minhaPosicao: { latitude, longitude }     ponto azul
 *  - ajustarAosMarcadores: enquadra todos os marcadores
 *  - interativo: false deixa o mapa parado (prévia)
 *  - aoTocarMapa(coord), aoTocarMarcador(id)
 * Ref: centralizar(coord, zoom)
 */
const MapaWeb = forwardRef(function MapaWeb(
  { centro, marcadores = [], minhaPosicao, ajustarAosMarcadores, interativo = true, aoTocarMapa, aoTocarMarcador, style },
  ref
) {
  const web = useRef(null);
  const [pronto, setPronto] = useState(false);

  // O HTML é montado uma vez só; depois tudo é atualizado por mensagens
  const html = useMemo(() => montarHtml(centro, interativo), []);

  const rodar = (js) => web.current?.injectJavaScript(`${js}; true;`);

  useImperativeHandle(ref, () => ({
    centralizar: (c, zoom = 16) => rodar(`window.centralizar(${c.latitude}, ${c.longitude}, ${zoom})`),
  }));

  useEffect(() => {
    if (!pronto) return;
    const estado = { marcadores, minhaPosicao: minhaPosicao || null, ajustar: !!ajustarAosMarcadores };
    rodar(`window.atualizar(${JSON.stringify(estado)})`);
  }, [pronto, JSON.stringify(marcadores), minhaPosicao?.latitude, minhaPosicao?.longitude, ajustarAosMarcadores]);

  const aoMensagem = (e) => {
    let m;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.tipo === 'pronto') setPronto(true);
    else if (m.tipo === 'mapa') aoTocarMapa?.({ latitude: m.latitude, longitude: m.longitude });
    else if (m.tipo === 'marcador') aoTocarMarcador?.(m.id);
  };

  return (
    <View style={[{ backgroundColor: '#ECE8DF', overflow: 'hidden' }, style]} pointerEvents={interativo ? 'auto' : 'none'}>
      <WebView
        ref={web}
        source={{ html, baseUrl: 'https://agenda-ministerial.app/' }}
        originWhitelist={['*']}
        onMessage={aoMensagem}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        style={StyleSheet.absoluteFill}
        containerStyle={{ backgroundColor: '#ECE8DF' }}
      />
    </View>
  );
});

export default MapaWeb;

function montarHtml(centro, interativo) {
  const c = centro || { latitude: -14.235, longitude: -51.925, zoom: 4 };
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css">
<style>
html,body,#m{margin:0;padding:0;height:100%;width:100%;background:#ECE8DF;font-family:-apple-system,Roboto,sans-serif}
.maplibregl-popup-content{padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.35;color:#1C1B22}
.maplibregl-popup-content b{font-size:15px}
.abrir{display:block;margin-top:6px;color:#6E1A37;font-weight:700}
.pino{width:30px;height:40px;cursor:pointer}
.eu{width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 7px rgba(37,99,235,.2)}
</style>
</head><body><div id="m"></div>
<script src="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js"></script>
<script>
(function(){
  function enviar(o){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  function esc(t){ return String(t||'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
  // Mapa gratuito do OpenFreeMap (dados OpenStreetMap), sem chave
  var map = new maplibregl.Map({
    container: 'm',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [${c.longitude}, ${c.latitude}],
    zoom: ${c.zoom || 15},
    interactive: ${interativo ? 'true' : 'false'},
    attributionControl: { compact: true }
  });
  map.touchZoomRotate && map.touchZoomRotate.disableRotation();
  map.dragRotate && map.dragRotate.disable();
  var marcadores = [];
  var eu = null;
  function pino(cor){
    var el = document.createElement('div');
    el.className = 'pino';
    el.innerHTML = '<svg width="30" height="40" viewBox="0 0 24 32"><path d="M12 31s10-9.5 10-18A10 10 0 0 0 2 13c0 8.5 10 18 10 18z" fill="'+cor+'" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="13" r="3.6" fill="#fff"/></svg>';
    return el;
  }
  map.on('click', function(e){ enviar({ tipo:'mapa', latitude:e.lngLat.lat, longitude:e.lngLat.lng }); });
  window.atualizar = function(s){
    marcadores.forEach(function(mk){ mk.remove(); });
    marcadores = [];
    var bounds = new maplibregl.LngLatBounds();
    (s.marcadores||[]).forEach(function(m){
      var el = pino(m.cor || '#6E1A37');
      var mk = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([m.longitude, m.latitude]).addTo(map);
      if (m.titulo) {
        var div = document.createElement('div');
        div.innerHTML = '<b>'+esc(m.titulo)+'</b>' + (m.subtitulo ? '<br>'+esc(m.subtitulo) : '') + (m.abrir ? '<span class="abrir">Abrir compromisso ›</span>' : '');
        if (m.abrir) div.addEventListener('click', function(){ enviar({ tipo:'marcador', id:m.id }); });
        mk.setPopup(new maplibregl.Popup({ offset: 38, closeButton: false }).setDOMContent(div));
        el.addEventListener('click', function(ev){ ev.stopPropagation(); });
      }
      marcadores.push(mk);
      bounds.extend([m.longitude, m.latitude]);
    });
    if (eu) { eu.remove(); eu = null; }
    if (s.minhaPosicao) {
      var d = document.createElement('div'); d.className = 'eu';
      eu = new maplibregl.Marker({ element: d }).setLngLat([s.minhaPosicao.longitude, s.minhaPosicao.latitude]).addTo(map);
    }
    var n = (s.marcadores||[]).length;
    if (s.ajustar && n === 1) map.jumpTo({ center: bounds.getCenter(), zoom: 15 });
    else if (s.ajustar && n > 1) map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 0 });
  };
  window.centralizar = function(lat, lng, z){ map.flyTo({ center: [lng, lat], zoom: z || 16, duration: 600 }); };
  enviar({ tipo:'pronto' });
})();
</script>
</body></html>`;
}
