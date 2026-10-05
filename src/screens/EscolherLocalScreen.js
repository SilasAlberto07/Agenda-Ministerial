import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapaWeb from '../components/MapaWeb';
import * as Location from 'expo-location';
import { Botao } from '../components/ui';
import { Icone } from '../components/icones';
import { cores, fontes } from '../theme';
import { buscarLocais, enderecoDe, distanciaKm, textoKm } from '../utils/enderecos';

// Centro inicial (Brasil) até descobrir a localização da pessoa
const CENTRO_BRASIL = { latitude: -14.235, longitude: -51.925, zoom: 4 };

export default function EscolherLocalScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const mapa = useRef(null);
  const inicial = route.params?.local;
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [selecionado, setSelecionado] = useState(inicial || null);
  const [minhaPosicao, setMinhaPosicao] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAviso('Sem permissão de localização: a busca pode ficar menos precisa.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setMinhaPosicao(pos.coords);
      if (!inicial) mapa.current?.centralizar(pos.coords, 15);
    })().catch(() => {});
  }, []);

  const buscar = async () => {
    if (!texto.trim()) return;
    Keyboard.dismiss();
    setBuscando(true);
    setAviso('');
    try {
      const lista = await buscarLocais(texto.trim());
      setResultados(lista);
      if (lista.length) escolher(lista[0]);
      else setAviso('Nada encontrado. Tente incluir o bairro e a cidade.');
    } catch {
      setAviso('Não foi possível buscar agora. Verifique a internet.');
    } finally {
      setBuscando(false);
    }
  };

  const escolher = (r) => {
    setSelecionado({ latitude: r.latitude, longitude: r.longitude, endereco: r.endereco || r.titulo, titulo: r.titulo });
    mapa.current?.centralizar(r, 16);
  };

  // Tocar no mapa coloca o pino ali
  const tocarNoMapa = async (c) => {
    setSelecionado({ ...c, endereco: 'Buscando endereço…' });
    const info = await enderecoDe(c);
    setSelecionado({ ...c, endereco: info.endereco, titulo: info.titulo });
  };

  const usar = () => {
    if (!selecionado) return;
    const { latitude, longitude, endereco } = selecionado;
    navigation.popTo('NovoEvento', { local: { latitude, longitude, endereco } }, { merge: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ECE8DF' }}>
      <MapaWeb
        ref={mapa}
        style={StyleSheet.absoluteFill}
        centro={inicial ? { ...inicial, zoom: 16 } : CENTRO_BRASIL}
        minhaPosicao={minhaPosicao}
        marcadores={selecionado ? [{ id: 'sel', latitude: selecionado.latitude, longitude: selecionado.longitude, cor: cores.vinho }] : []}
        aoTocarMapa={tocarNoMapa}
      />

      <View style={[st.topo, { top: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={st.botaoRedondo}>
          <Icone nome="chevron-back" />
        </Pressable>
        <View style={st.busca}>
          <Icone nome="search" cor={cores.texto2} tamanho={18} />
          <TextInput
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={buscar}
            returnKeyType="search"
            placeholder="Endereço, igreja ou bairro"
            placeholderTextColor={cores.texto3}
            accessibilityLabel="Buscar local"
            style={st.buscaInput}
          />
          {buscando && <ActivityIndicator color={cores.vinho} />}
        </View>
      </View>

      {minhaPosicao && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Minha localização"
          onPress={() => mapa.current?.centralizar(minhaPosicao, 16)}
          style={[st.botaoRedondo, st.botaoLocalizar]}
        >
          <Icone nome="locate" cor={cores.azul} />
        </Pressable>
      )}

      <View style={[st.painel, { paddingBottom: insets.bottom + 16 }]}>
        <View style={st.alca} />
        {aviso ? <Text style={st.aviso}>{aviso}</Text> : null}
        {resultados.length > 0 && <Text style={st.secao}>Resultados</Text>}
        {resultados.map((r) => {
          const ativo = selecionado && selecionado.latitude === r.latitude && selecionado.longitude === r.longitude;
          return (
            <Pressable key={r.id} onPress={() => escolher(r)} style={[st.resultado, ativo && st.resultadoAtivo]}>
              <View style={[st.resultadoIcone, ativo && { backgroundColor: cores.vinho }]}>
                <Icone nome="location-outline" tamanho={16} cor={ativo ? '#fff' : cores.texto2} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.resultadoTitulo} numberOfLines={1}>{r.titulo}</Text>
                <Text style={st.resultadoSub} numberOfLines={1}>{r.endereco}</Text>
              </View>
              <Text style={st.resultadoSub}>{textoKm(distanciaKm(minhaPosicao, r))}</Text>
            </Pressable>
          );
        })}
        {!resultados.length && (
          <Text style={st.dica}>
            {selecionado?.endereco ? selecionado.endereco : 'Pesquise acima ou toque no mapa para marcar o local.'}
          </Text>
        )}
        <Botao titulo="Usar este local" onPress={usar} desabilitado={!selecionado} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

const sombra = { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 };

const st = StyleSheet.create({
  topo: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10 },
  botaoRedondo: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...sombra },
  busca: { flex: 1, height: 52, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, ...sombra },
  buscaInput: { flex: 1, fontFamily: fontes.normal, fontSize: 16, color: cores.tinta },
  botaoLocalizar: { position: 'absolute', right: 16, bottom: 300, borderRadius: 26 },
  painel: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 28,
    borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, gap: 10, ...sombra,
  },
  alca: { width: 40, height: 5, borderRadius: 3, backgroundColor: cores.borda, alignSelf: 'center' },
  secao: { fontFamily: fontes.forte, fontSize: 13, color: cores.texto2, textTransform: 'uppercase', letterSpacing: 0.6 },
  aviso: { fontFamily: fontes.medio, fontSize: 14, color: cores.dourado },
  dica: { fontFamily: fontes.medio, fontSize: 15, color: cores.tinta, lineHeight: 21, paddingVertical: 6 },
  resultado: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: cores.bordaSuave },
  resultadoAtivo: { borderColor: cores.vinho, backgroundColor: '#FBF3F5' },
  resultadoIcone: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1ECE5', alignItems: 'center', justifyContent: 'center' },
  resultadoTitulo: { fontFamily: fontes.forte, fontSize: 15, color: cores.tinta },
  resultadoSub: { fontFamily: fontes.normal, fontSize: 13, color: cores.texto2 },
});
