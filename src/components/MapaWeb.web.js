import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { montarHtml } from './mapaHtml';

// Versão web do mapa: a mesma página do celular, dentro de um iframe
const MapaWeb = forwardRef(function MapaWeb(
  { centro, marcadores = [], minhaPosicao, ajustarAosMarcadores, interativo = true, aoTocarMapa, aoTocarMarcador, style },
  ref
) {
  const frame = useRef(null);
  const [pronto, setPronto] = useState(false);
  const html = useMemo(() => montarHtml(centro, interativo), []);
  const janela = () => frame.current?.contentWindow;

  useImperativeHandle(ref, () => ({
    centralizar: (c, zoom = 16) => janela()?.centralizar?.(c.latitude, c.longitude, zoom),
  }));

  // Recebe os toques vindos do mapa (só deste iframe)
  const callbacks = useRef({});
  callbacks.current = { aoTocarMapa, aoTocarMarcador };
  useEffect(() => {
    const ouvir = (e) => {
      if (e.source !== janela() || !e.data?.agendaMapa) return;
      let m;
      try {
        m = JSON.parse(e.data.agendaMapa);
      } catch {
        return;
      }
      if (m.tipo === 'pronto') setPronto(true);
      else if (m.tipo === 'mapa') callbacks.current.aoTocarMapa?.({ latitude: m.latitude, longitude: m.longitude });
      else if (m.tipo === 'marcador') callbacks.current.aoTocarMarcador?.(m.id);
    };
    window.addEventListener('message', ouvir);
    return () => window.removeEventListener('message', ouvir);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    janela()?.atualizar?.({ marcadores, minhaPosicao: minhaPosicao || null, ajustar: !!ajustarAosMarcadores });
  }, [pronto, JSON.stringify(marcadores), minhaPosicao?.latitude, minhaPosicao?.longitude, ajustarAosMarcadores]);

  return (
    <View style={[{ backgroundColor: '#ECE8DF', overflow: 'hidden' }, style]} pointerEvents={interativo ? 'auto' : 'none'}>
      <iframe
        ref={frame}
        title="Mapa"
        srcDoc={html}
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
        allow="geolocation"
      />
    </View>
  );
});

export default MapaWeb;
