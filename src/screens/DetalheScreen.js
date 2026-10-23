import { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Platform } from 'react-native';
import { Alert } from '../utils/alerta';
import MapaWeb from '../components/MapaWeb';
import { abrirGoogleMaps } from '../utils/googleMaps';
import { useAuth } from '../auth/AuthContext';
import { useEventos } from '../services/EventosContext';
import { excluirEvento } from '../services/eventos';
import { Botao } from '../components/ui';
import { Icone } from '../components/icones';
import { cores, fontes, corDoTipo, LEMBRETES } from '../theme';
import { dataLonga, dataCompleta, hora, realizado } from '../utils/datas';

export default function DetalheScreen({ navigation, route }) {
  const { usuario } = useAuth();
  const { eventos, agora, offline } = useEventos();
  const ev = eventos.find((e) => e.id === route.params?.id);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: () =>
        ev ? (
          <Pressable onPress={() => navigation.navigate('NovoEvento', { id: ev.id })} style={st.editar}>
            <Text style={st.editarTexto}>Editar</Text>
          </Pressable>
        ) : null,
    });
  }, [ev, navigation]);

  if (!ev) {
    return (
      <View style={[st.tela, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={st.texto}>Compromisso não encontrado.</Text>
      </View>
    );
  }

  const c = corDoTipo(ev.tipo);
  const jaFoi = realizado(ev, agora);

  const abrirRota = () => {
    const { latitude, longitude } = ev.local;
    const destino = `${latitude},${longitude}`;
    const iphoneWeb = Platform.OS === 'web' && /iPhone|iPad/.test(navigator.userAgent);
    const url =
      Platform.OS === 'ios'
        ? `maps://?daddr=${destino}`
        : iphoneWeb
          ? `https://maps.apple.com/?daddr=${destino}`
          : `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destino}`)
    );
  };

  const excluir = () =>
    offline
      ? Alert.alert('Sem internet', 'Para adicionar, editar ou excluir compromissos, conecte-se à internet. Sem internet você pode consultar a agenda normalmente.')
      : Alert.alert(
      jaFoi ? 'Apagar do histórico?' : 'Excluir compromisso?',
      jaFoi ? `"${ev.nome}" será apagado do histórico.` : `"${ev.nome}" e os lembretes dele serão apagados.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await excluirEvento(usuario.uid, ev.id);
          navigation.goBack();
        },
      },
    ]);

  return (
    <ScrollView style={st.tela} contentContainerStyle={{ padding: 24, paddingTop: 8, gap: 16, paddingBottom: 48 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Text style={[st.tag, { color: c.texto, backgroundColor: c.fundo }]}>
            {ev.tipo}
            {ev.participacao ? ` · ${jaFoi ? '' : 'vou '}${ev.participacao.toLowerCase()}` : ''}
          </Text>
          {jaFoi ? <Text style={[st.tag, st.tagRealizado]}>Realizado</Text> : null}
        </View>
        <Text style={st.titulo}>{ev.nome}</Text>
        {ev.igreja ? <Text style={st.sub}>{ev.igreja}</Text> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Info rotulo="Data" valor={jaFoi ? dataCompleta(ev.data) : dataLonga(ev.data)} />
        <Info rotulo="Horário" valor={hora(ev.data)} />
      </View>

      {ev.local?.latitude ? (
        <View style={st.cartao}>
          <MapaWeb
            style={{ height: 140 }}
            interativo={false}
            centro={{ latitude: ev.local.latitude, longitude: ev.local.longitude, zoom: 16 }}
            marcadores={[{ id: ev.id, latitude: ev.local.latitude, longitude: ev.local.longitude, cor: cores.vinho }]}
          />
          <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[st.texto, { flex: 1, fontFamily: fontes.forte }]}>{ev.local.endereco}</Text>
            <Botao
              titulo="Rota"
              onPress={abrirRota}
              style={{ height: 44, paddingHorizontal: 16 }}
              icone={<Icone nome="navigate" cor="#fff" tamanho={16} />}
            />
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={() => abrirGoogleMaps({ ponto: ev.local })}
            style={st.verGoogle}
          >
            <Icone nome="logo-google" cor={cores.tinta} tamanho={16} />
            <Text style={st.verGoogleTexto}>Ver no Google Maps</Text>
            <Icone nome="open-outline" cor={cores.texto2} tamanho={16} />
          </Pressable>
        </View>
      ) : null}

      {!jaFoi && (
      <View style={[st.cartao, { padding: 14, gap: 10 }]}>
        <Text style={st.rotulo}>Lembretes</Text>
        {ev.lembretes?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LEMBRETES.filter((l) => ev.lembretes.includes(l.minutos)).map((l) => (
              <Text key={l.minutos} style={st.chip}>{l.rotulo}</Text>
            ))}
          </View>
        ) : (
          <Text style={st.texto}>Sem lembretes.</Text>
        )}
      </View>
      )}

      {ev.observacoes ? (
        <View style={[st.cartao, { padding: 14, gap: 6 }]}>
          <Text style={st.rotulo}>Observações</Text>
          <Text style={[st.texto, { lineHeight: 22 }]}>{ev.observacoes}</Text>
        </View>
      ) : null}

      <Pressable onPress={excluir} style={st.excluir}>
        <Icone nome="trash-outline" cor={cores.erro} tamanho={18} />
        <Text style={st.excluirTexto}>{jaFoi ? 'Apagar do histórico' : 'Excluir compromisso'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Info({ rotulo, valor }) {
  return (
    <View style={[st.cartao, { flex: 1, padding: 14, gap: 4 }]}>
      <Text style={st.rotulo}>{rotulo}</Text>
      <Text style={[st.texto, { fontFamily: fontes.forte }]}>{valor}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  tag: {
    alignSelf: 'flex-start', fontFamily: fontes.forte, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden',
  },
  tagRealizado: { color: '#1F6B3A', backgroundColor: '#E1EFE6' },
  verGoogle: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 48,
    borderTopWidth: 1, borderTopColor: cores.bordaSuave,
  },
  verGoogleTexto: { flex: 1, fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
  titulo: { fontFamily: fontes.titulo, fontSize: 30, lineHeight: 34, color: cores.tinta },
  sub: { fontFamily: fontes.normal, fontSize: 15, color: cores.texto2 },
  cartao: { backgroundColor: cores.cartao, borderRadius: 18, borderWidth: 1, borderColor: cores.bordaSuave, overflow: 'hidden' },
  rotulo: { fontFamily: fontes.forte, fontSize: 12, color: cores.texto2, textTransform: 'uppercase' },
  texto: { fontFamily: fontes.normal, fontSize: 16, color: cores.tinta },
  chip: {
    fontFamily: fontes.forte, fontSize: 13, color: cores.vinho, backgroundColor: cores.vinhoClaro,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 17, overflow: 'hidden',
  },
  editar: { height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: cores.borda, justifyContent: 'center' },
  editarTexto: { fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
  excluir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  excluirTexto: { fontFamily: fontes.forte, fontSize: 15, color: cores.erro },
});
