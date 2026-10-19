import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, SectionList, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEventos } from '../services/EventosContext';
import CartaoEvento from '../components/CartaoEvento';
import { Icone } from '../components/icones';
import { cores, fontes } from '../theme';
import { mesAno } from '../utils/datas';

const FILTROS = ['Todos', 'Cultos', 'Congressos', 'Festividades'];
const TIPO_DO_FILTRO = { Cultos: 'Culto', Congressos: 'Congresso', Festividades: 'Festividade' };

// Tira acentos e deixa minúsculo, para a busca achar "São José" digitando "sao jose"
const normalizar = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Aba "Histórico": os compromissos já realizados, por onde vocês já passaram
export default function HistoricoScreen({ navigation }) {
  const { historico, carregando, agora } = useEventos();
  const [filtro, setFiltro] = useState('Todos');
  const [busca, setBusca] = useState('');

  const resumo = useMemo(() => {
    const lugares = new Set(
      historico.map((e) => normalizar(e.igreja || e.local?.endereco || e.nome)).filter(Boolean)
    );
    const esteAno = historico.filter((e) => e.data.getFullYear() === agora.getFullYear()).length;
    return { total: historico.length, lugares: lugares.size, esteAno };
  }, [historico, agora]);

  const secoes = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtrados = historico.filter((e) => {
      if (TIPO_DO_FILTRO[filtro] && e.tipo !== TIPO_DO_FILTRO[filtro]) return false;
      if (!termo) return true;
      return normalizar([e.nome, e.igreja, e.local?.endereco, e.observacoes, e.tipo].join(' ')).includes(termo);
    });
    // Agrupa por mês ("outubro de 2026"), do mais recente para o mais antigo
    const grupos = [];
    for (const e of filtrados) {
      const titulo = mesAno(e.data);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.title === titulo) ultimo.data.push(e);
      else grupos.push({ title: titulo, data: [e] });
    }
    return grupos;
  }, [historico, filtro, busca]);

  const vazio = !historico.length;

  return (
    <SafeAreaView style={st.tela} edges={['top']}>
      <View style={st.cabecalho}>
        <Text style={st.titulo}>Histórico</Text>
        <Text style={st.sub}>Por onde vocês já passaram</Text>
      </View>

      {!vazio && (
        <>
          <View style={st.resumo}>
            <Numero valor={resumo.total} rotulo={resumo.total === 1 ? 'compromisso' : 'compromissos'} />
            <Numero valor={resumo.lugares} rotulo={resumo.lugares === 1 ? 'lugar' : 'lugares'} />
            <Numero valor={resumo.esteAno} rotulo={`em ${agora.getFullYear()}`} />
          </View>

          <View style={st.busca}>
            <Icone nome="search" cor={cores.texto2} tamanho={18} />
            <TextInput
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar igreja, cidade ou evento"
              placeholderTextColor={cores.texto3}
              accessibilityLabel="Buscar no histórico"
              style={st.buscaInput}
              returnKeyType="search"
            />
            {busca ? (
              <Pressable accessibilityLabel="Limpar busca" onPress={() => setBusca('')} style={st.limpar}>
                <Icone nome="close" cor={cores.texto2} tamanho={18} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filtrosLinha} contentContainerStyle={st.filtros}>
            {FILTROS.map((f) => {
              const ativo = filtro === f;
              return (
                <Pressable key={f} onPress={() => setFiltro(f)} style={[st.filtro, ativo && st.filtroAtivo]}>
                  <Text style={[st.filtroTexto, ativo && { color: '#fff' }]}>{f}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {carregando ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.vinho} />
      ) : (
        <SectionList
          style={{ flex: 1 }}
          sections={secoes}
          keyExtractor={(e) => e.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          renderSectionHeader={({ section }) => (
            <Text style={st.secao}>
              {section.title} · {section.data.length}
            </Text>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <CartaoEvento historico evento={item} onPress={() => navigation.navigate('Detalhe', { id: item.id })} />
          )}
          ListEmptyComponent={
            <View style={st.vazio}>
              <Icone nome="time-outline" cor={cores.texto3} tamanho={36} />
              <Text style={st.vazioTexto}>
                {vazio
                  ? 'Ainda não há compromissos realizados.\nDepois das 23h do dia de cada compromisso, ele sai da agenda e aparece aqui.'
                  : 'Nada encontrado com essa busca.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Numero({ valor, rotulo }) {
  return (
    <View style={st.numero}>
      <Text style={st.numeroValor}>{valor}</Text>
      <Text style={st.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, gap: 2, flexShrink: 0 },
  titulo: { fontFamily: fontes.titulo, fontSize: 30, color: cores.tinta },
  sub: { fontFamily: fontes.normal, fontSize: 14, color: cores.texto2 },
  resumo: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, flexShrink: 0 },
  numero: {
    flex: 1, backgroundColor: cores.cartao, borderRadius: 16, borderWidth: 1, borderColor: cores.bordaSuave,
    paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 2,
  },
  numeroValor: { fontFamily: fontes.titulo, fontSize: 24, color: cores.vinho },
  numeroRotulo: { fontFamily: fontes.medio, fontSize: 12, color: cores.texto2, textAlign: 'center' },
  busca: {
    marginHorizontal: 24, marginTop: 14, height: 48, borderRadius: 14, borderWidth: 1, borderColor: cores.borda,
    backgroundColor: cores.cartao, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, flexShrink: 0,
  },
  buscaInput: { flex: 1, height: '100%', fontFamily: fontes.normal, fontSize: 16, color: cores.tinta },
  limpar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filtrosLinha: { flexGrow: 0, flexShrink: 0 },
  filtros: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 10 },
  filtro: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, borderColor: cores.borda, justifyContent: 'center' },
  filtroAtivo: { backgroundColor: cores.tinta, borderColor: cores.tinta },
  filtroTexto: { fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
  secao: {
    fontFamily: fontes.forte, fontSize: 13, color: cores.texto2, textTransform: 'uppercase',
    letterSpacing: 0.6, marginTop: 18, marginBottom: 10,
  },
  vazio: { alignItems: 'center', gap: 12, marginTop: 48, paddingHorizontal: 16 },
  vazioTexto: { fontFamily: fontes.normal, fontSize: 15, color: cores.texto2, textAlign: 'center', lineHeight: 22 },
});
