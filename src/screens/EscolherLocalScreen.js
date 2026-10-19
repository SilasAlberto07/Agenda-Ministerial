import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Keyboard, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapaWeb from '../components/MapaWeb';
import * as Location from 'expo-location';
import { Botao } from '../components/ui';
import { Icone } from '../components/icones';
import { cores, fontes } from '../theme';
import { buscarLocais, enderecoDe, distanciaKm, textoKm } from '../utils/enderecos';
import { abrirGoogleMaps, lerDoGoogleMaps } from '../utils/googleMaps';

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
  const [colarAberto, setColarAberto] = useState(false);
  const [colado, setColado] = useState('');
  const [lendo, setLendo] = useState(false);
  const [erroColar, setErroColar] = useState('');

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
      const lista = await buscarLocais(texto.trim(), minhaPosicao);
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
    const { latitude, longitude, endereco, nomeLugar } = selecionado;
    navigation.popTo('NovoEvento', { local: { latitude, longitude, endereco }, nomeLugar: nomeLugar || null }, { merge: true });
  };

  // ---- Google Maps ----------------------------------------------------------
  const irParaGoogleMaps = () =>
    abrirGoogleMaps({ texto, ponto: selecionado || minhaPosicao }).catch(() =>
      setAviso('Não foi possível abrir o Google Maps.')
    );

  const abrirColar = async () => {
    setErroColar('');
    setColarAberto(true);
    // No navegador dá para ler o que foi copiado (o iPhone pergunta antes)
    if (Platform.OS === 'web' && navigator.clipboard?.readText) {
      try {
        const t = await navigator.clipboard.readText();
        if (t) setColado(t);
      } catch {}
    }
  };

  const lerColado = async () => {
    setErroColar('');
    setLendo(true);
    try {
      const r = await lerDoGoogleMaps(colado, {
        geocodificar: (t) => buscarLocais(t, minhaPosicao),
        enderecoDe,
      });
      if (!r) {
        setErroColar(
          Platform.OS === 'web'
            ? 'Não consegui achar o local. No app do Google Maps use Compartilhar → Copiar (que copia nome e endereço), ou cole o endereço.'
            : 'Não consegui achar o local. Confira se colou o link ou o endereço do Google Maps.'
        );
        return;
      }
      const nomeLugar = r.titulo && r.titulo !== r.endereco ? r.titulo : null;
      setSelecionado({ latitude: r.latitude, longitude: r.longitude, titulo: r.titulo, endereco: r.endereco, nomeLugar });
      setResultados([]);
      mapa.current?.centralizar(r, 17);
      setColarAberto(false);
      setColado('');
    } finally {
      setLendo(false);
    }
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

      <View style={[st.atalhos, { top: insets.top + 70 }]}>
        <Pressable accessibilityRole="button" onPress={irParaGoogleMaps} style={st.atalho}>
          <Icone nome="logo-google" cor={cores.tinta} tamanho={16} />
          <Text style={st.atalhoTexto}>Abrir Google Maps</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={abrirColar} style={st.atalho}>
          <Icone nome="clipboard-outline" cor={cores.tinta} tamanho={16} />
          <Text style={st.atalhoTexto}>Colar local</Text>
        </Pressable>
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

      <Modal visible={colarAberto} transparent animationType="slide" onRequestClose={() => setColarAberto(false)}>
        <KeyboardAvoidingView style={st.fundoModal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[st.folha, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={st.folhaTitulo}>Trazer local do Google Maps</Text>
            <Text style={st.passo}>1. Toque em "Abrir Google Maps" e procure a igreja ou o endereço.</Text>
            <Text style={st.passo}>2. No lugar certo, toque em Compartilhar → Copiar.</Text>
            <Text style={st.passo}>3. Volte aqui e cole abaixo (toque e segure → Colar).</Text>
            <TextInput
              value={colado}
              onChangeText={setColado}
              multiline
              autoFocus={!colado}
              placeholder="Cole aqui o link ou o endereço"
              placeholderTextColor={cores.texto3}
              accessibilityLabel="Texto copiado do Google Maps"
              style={st.campoColar}
            />
            {erroColar ? <Text style={st.erroColar}>{erroColar}</Text> : null}
            <Botao titulo="Usar este local" onPress={lerColado} carregando={lendo} desabilitado={!colado.trim()} />
            <Botao titulo="Cancelar" variante="secundario" onPress={() => setColarAberto(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  atalhos: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 8 },
  atalho: {
    flex: 1, height: 42, paddingHorizontal: 10, borderRadius: 21, backgroundColor: '#fff', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6, ...sombra,
  },
  atalhoTexto: { fontFamily: fontes.forte, fontSize: 13, color: cores.tinta },
  fundoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  folha: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  folhaTitulo: { fontFamily: fontes.titulo, fontSize: 22, color: cores.tinta, marginBottom: 4 },
  passo: { fontFamily: fontes.normal, fontSize: 15, lineHeight: 21, color: cores.texto2 },
  campoColar: {
    minHeight: 96, borderRadius: 14, borderWidth: 1, borderColor: cores.borda, padding: 12, marginTop: 4,
    fontFamily: fontes.normal, fontSize: 15, color: cores.tinta, textAlignVertical: 'top',
  },
  erroColar: { fontFamily: fontes.medio, fontSize: 14, lineHeight: 20, color: cores.erro },
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
