import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { montarHtml } from './mapaHtml';

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
