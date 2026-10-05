// Página HTML do mapa, usada pela WebView (celular) e pelo iframe (web)
export function montarHtml(centro, interativo) {
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
  function enviar(o){ var t = JSON.stringify(o); if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(t); else if (window.parent !== window) window.parent.postMessage({ agendaMapa: t }, '*'); }
  function esc(t){ return String(t||'').replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
  if (typeof maplibregl === 'undefined') {
    document.getElementById('m').innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;padding:24px;text-align:center;color:#57535E;font-size:15px">Não foi possível carregar o mapa.<br>Verifique a internet e abra a tela de novo.</div>';
    return;
  }
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
