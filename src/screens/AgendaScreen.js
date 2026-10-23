import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { useEventos } from '../services/EventosContext';
import { Icone } from '../components/icones';
import CartaoAvisos from '../components/CartaoAvisos';
import AvisoVersao from '../components/AvisoVersao';
import CartaoEvento from '../components/CartaoEvento';
import Avatar from '../components/Avatar';
import { usePerfil } from '../services/PerfilContext';
import { cores, fontes } from '../theme';
import { semanaAtual, mesmoDia, diaSemanaCurto, hora, dataNumerica } from '../utils/datas';

const FILTROS = ['Todos', 'Cultos', 'Congressos', 'Festividades'];

export default function AgendaScreen({ navigation }) {
  const { usuario } = useAuth();
  const { nome, foto } = usePerfil();
  const { proximos, historico, carregando, erro, agora, offline, salvoEm } = useEventos();
  const [diaSel, setDiaSel] = useState(null);
  const [filtro, setFiltro] = useState('Todos');
  const semana = useMemo(() => semanaAtual(), []);
  const hoje = agora;

  // Só os que ainda vão acontecer; os realizados ficam na aba Histórico
  const lista = useMemo(() => {
    return proximos.filter((e) => {
      if (diaSel && !mesmoDia(e.data, diaSel)) return false;
      if (filtro === 'Cultos') return e.tipo === 'Culto';
      if (filtro === 'Congressos') return e.tipo === 'Congresso';
      if (filtro === 'Festividades') return e.tipo === 'Festividade';
      return true;
    });
  }, [proximos, diaSel, filtro]);

  // Compromissos de hoje que ainda não passaram
  const deHoje = useMemo(() => proximos.filter((e) => mesmoDia(e.data, hoje)), [proximos, hoje]);
  // Em "Todos" (sem dia escolhido), os de hoje sobem para a seção "Agenda de hoje"
  const separarHoje = filtro === 'Todos' && !diaSel && deHoje.length > 0;
  const listaMostrada = separarHoje ? lista.filter((e) => !mesmoDia(e.data, hoje)) : lista;

  const salvoTexto = salvoEm
    ? mesmoDia(new Date(salvoEm), hoje)
      ? `hoje às ${hora(new Date(salvoEm))}`
      : dataNumerica(new Date(salvoEm))
    : null;

  const primeiroNome = (nome || '').trim();

  return (
    <SafeAreaView style={st.tela} edges={['top']}>
      <View style={st.cabecalho}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text style={st.saudacao} numberOfLines={1}>Paz do Senhor{primeiroNome ? `, ${primeiroNome}` : ''}</Text>
          <Text style={st.titulo}>Minha agenda</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => navigation.navigate('Perfil')}>
          <Avatar foto={foto} nome={nome} tamanho={46} />
        </Pressable>
      </View>

      <AvisoVersao />

      {offline ? (
        <View style={st.offline} accessibilityRole="alert">
          <Icone nome="cloud-offline-outline" tamanho={18} cor={cores.dourado} />
          <Text style={st.offlineTexto}>
            Sem internet. Mostrando a agenda salva neste aparelho
            {salvoTexto ? ` (atualizada ${salvoTexto})` : ''}.
          </Text>
        </View>
      ) : (
        <CartaoAvisos compacto />
      )}

      <View style={st.semana}>
        {semana.map((d) => {
          const ativo = diaSel && mesmoDia(d, diaSel);
          const temEvento = proximos.some((e) => mesmoDia(e.data, d));
          const ehHoje = mesmoDia(d, hoje);
          return (
            <Pressable
              key={d.toISOString()}
              accessibilityRole="button"
              accessibilityLabel={`${diaSemanaCurto(d)} ${d.getDate()}`}
              onPress={() => setDiaSel(ativo ? null : d)}
              style={[st.dia, ativo && st.diaAtivo, !ativo && ehHoje && st.diaHoje]}
            >
              <Text style={[st.diaSemana, ativo && { color: '#fff' }]}>{diaSemanaCurto(d)}</Text>
              <Text style={[st.diaNum, ativo && { color: '#fff' }]}>{d.getDate()}</Text>
              <View style={[st.ponto, { backgroundColor: temEvento ? (ativo ? '#fff' : cores.ponto) : 'transparent' }]} />
            </Pressable>
          );
        })}
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

      {carregando ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.vinho} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={listaMostrada}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 12 }}
          ListHeaderComponent={
            <>
              {separarHoje ? (
                <View style={st.blocoHoje}>
                  <View style={st.tituloHojeLinha}>
                    <View style={st.pontoHoje} />
                    <Text style={st.secaoHoje}>Agenda de hoje</Text>
                  </View>
                  <View style={{ gap: 12 }}>
                    {deHoje.map((item) => (
                      <CartaoEvento
                        key={item.id}
                        evento={item}
                        hoje
                        onPress={() => navigation.navigate('Detalhe', { id: item.id })}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
              {separarHoje ? <View style={st.divisor} /> : null}
              <Text style={st.secao}>{diaSel ? `Dia ${diaSel.getDate()}` : 'Próximos compromissos'}</Text>
            </>
          }
          ListEmptyComponent={
            <Text style={st.vazio}>
              {separarHoje
                ? 'Nenhum outro compromisso marcado.'
                : offline && !salvoEm
                ? 'Sem internet. A agenda fica salva neste aparelho depois que você abrir o app uma vez com internet.'
                : erro
                ? 'Não foi possível carregar sua agenda. Verifique a internet e a configuração do Firebase.'
                : diaSel && historico.some((e) => mesmoDia(e.data, diaSel))
                  ? 'Os compromissos deste dia já foram realizados. Veja na aba Histórico.'
                  : 'Nenhum compromisso aqui ainda. Toque no + para adicionar.'}
            </Text>
          }
          renderItem={({ item }) => <CartaoEvento evento={item} hoje={mesmoDia(item.data, hoje)} onPress={() => navigation.navigate('Detalhe', { id: item.id })} />}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Novo compromisso"
        onPress={() => navigation.navigate('NovoEvento')}
        style={({ pressed }) => [st.fab, pressed && { opacity: 0.85 }]}
      >
        <Icone nome="add" cor="#fff" tamanho={30} />
      </Pressable>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  saudacao: { fontFamily: fontes.normal, fontSize: 14, color: cores.texto2 },
  titulo: { fontFamily: fontes.titulo, fontSize: 30, color: cores.tinta },
  semana: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingTop: 8, flexShrink: 0 },
  dia: {
    flex: 1, height: 72, borderRadius: 16, borderWidth: 1, borderColor: '#E3DBD1', backgroundColor: cores.cartao,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  diaHoje: { borderColor: cores.vinho, borderWidth: 2, backgroundColor: '#FCF5F7' },
  diaAtivo: { backgroundColor: cores.vinho, borderColor: cores.vinho },
  diaSemana: { fontFamily: fontes.medio, fontSize: 11, textTransform: 'uppercase', color: cores.texto2 },
  diaNum: { fontFamily: fontes.forte, fontSize: 18, color: cores.tinta },
  ponto: { width: 5, height: 5, borderRadius: 3 },
  // flexShrink: 0 impede a lista de crescer por cima dos filtros
  filtrosLinha: { flexGrow: 0, flexShrink: 0 },
  filtros: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 10 },
  filtro: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, borderColor: cores.borda, justifyContent: 'center' },
  filtroAtivo: { backgroundColor: cores.tinta, borderColor: cores.tinta },
  filtroTexto: { fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
  offline: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 24, marginBottom: 4, padding: 12,
    borderRadius: 14, backgroundColor: cores.douradoClaro, flexShrink: 0,
  },
  offlineTexto: { flex: 1, fontFamily: fontes.medio, fontSize: 13, color: cores.dourado, lineHeight: 18 },
  blocoHoje: {
    backgroundColor: cores.vinhoClaro, borderRadius: 22, padding: 12, paddingTop: 14, marginTop: 8, gap: 10,
    marginHorizontal: -8,
  },
  tituloHojeLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 },
  pontoHoje: { width: 8, height: 8, borderRadius: 4, backgroundColor: cores.vinho },
  secaoHoje: { fontFamily: fontes.forte, fontSize: 13, color: cores.vinho, textTransform: 'uppercase', letterSpacing: 0.6 },
  divisor: { height: 1, backgroundColor: cores.borda, marginTop: 20, marginBottom: 4, marginHorizontal: 8 },
  secao: {
    fontFamily: fontes.forte, fontSize: 13, color: cores.texto2, textTransform: 'uppercase',
    letterSpacing: 0.6, marginTop: 10, marginBottom: 2,
  },
  vazio: { fontFamily: fontes.normal, fontSize: 15, color: cores.texto2, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  fab: {
    position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30,
    backgroundColor: cores.vinho, alignItems: 'center', justifyContent: 'center',
    shadowColor: cores.vinho, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
