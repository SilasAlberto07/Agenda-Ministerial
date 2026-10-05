import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { useEventos } from '../services/EventosContext';
import { Icone } from '../components/icones';
import { cores, fontes, corDoTipo } from '../theme';
import { semanaAtual, mesmoDia, diaSemanaCurto, mesCurto, hora } from '../utils/datas';

const FILTROS = ['Todos', 'Cultos', 'Congressos'];

export default function AgendaScreen({ navigation }) {
  const { usuario } = useAuth();
  const { eventos, carregando, erro } = useEventos();
  const [diaSel, setDiaSel] = useState(null);
  const [filtro, setFiltro] = useState('Todos');
  const semana = useMemo(() => semanaAtual(), []);
  const hoje = new Date();

  const lista = useMemo(() => {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    return eventos.filter((e) => {
      if (diaSel) {
        if (!mesmoDia(e.data, diaSel)) return false;
      } else if (e.data < inicioHoje) return false;
      if (filtro === 'Cultos') return e.tipo === 'Culto';
      if (filtro === 'Congressos') return e.tipo === 'Congresso';
      return true;
    });
  }, [eventos, diaSel, filtro]);

  const primeiroNome = (usuario?.displayName || '').split(' ').slice(0, 2).join(' ');

  return (
    <SafeAreaView style={st.tela} edges={['top']}>
      <View style={st.cabecalho}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text style={st.saudacao}>Paz do Senhor{primeiroNome ? `, ${primeiroNome}` : ''}</Text>
          <Text style={st.titulo}>Minha agenda</Text>
        </View>
      </View>

      <View style={st.semana}>
        {semana.map((d) => {
          const ativo = diaSel && mesmoDia(d, diaSel);
          const temEvento = eventos.some((e) => mesmoDia(e.data, d));
          const ehHoje = mesmoDia(d, hoje);
          return (
            <Pressable
              key={d.toISOString()}
              accessibilityRole="button"
              accessibilityLabel={`${diaSemanaCurto(d)} ${d.getDate()}`}
              onPress={() => setDiaSel(ativo ? null : d)}
              style={[st.dia, ativo && st.diaAtivo, !ativo && ehHoje && { borderColor: cores.vinho }]}
            >
              <Text style={[st.diaSemana, ativo && { color: '#fff' }]}>{diaSemanaCurto(d)}</Text>
              <Text style={[st.diaNum, ativo && { color: '#fff' }]}>{d.getDate()}</Text>
              <View style={[st.ponto, { backgroundColor: temEvento ? (ativo ? '#fff' : cores.ponto) : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>

      <View style={st.filtros}>
        {FILTROS.map((f) => {
          const ativo = filtro === f;
          return (
            <Pressable key={f} onPress={() => setFiltro(f)} style={[st.filtro, ativo && st.filtroAtivo]}>
              <Text style={[st.filtroTexto, ativo && { color: '#fff' }]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>

      {carregando ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={cores.vinho} />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 12 }}
          ListHeaderComponent={
            <Text style={st.secao}>{diaSel ? `Dia ${diaSel.getDate()}` : 'Próximos compromissos'}</Text>
          }
          ListEmptyComponent={
            <Text style={st.vazio}>
              {erro
                ? 'Não foi possível carregar sua agenda. Verifique a internet e a configuração do Firebase.'
                : 'Nenhum compromisso aqui ainda. Toque no + para adicionar.'}
            </Text>
          }
          renderItem={({ item }) => <CartaoEvento evento={item} onPress={() => navigation.navigate('Detalhe', { id: item.id })} />}
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

function CartaoEvento({ evento, onPress }) {
  const c = corDoTipo(evento.tipo);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.cartao, pressed && { opacity: 0.85 }]}>
      <View style={[st.caixaData, { backgroundColor: c.fundo }]}>
        <Text style={[st.mes, { color: c.texto }]}>{mesCurto(evento.data)}</Text>
        <Text style={[st.diaGrande, { color: c.texto }]}>{String(evento.data.getDate()).padStart(2, '0')}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[st.tag, { color: c.texto }]}>
          {evento.tipo}
          {evento.participacao ? ` · ${evento.participacao.toLowerCase()}` : ''}
        </Text>
        <Text style={st.nome} numberOfLines={2}>{evento.nome}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <Icone nome="time-outline" tamanho={14} cor={cores.texto2} />
          <Text style={st.info}>{hora(evento.data)}</Text>
          {evento.local?.endereco ? (
            <>
              <Icone nome="location-outline" tamanho={14} cor={cores.texto2} />
              <Text style={[st.info, { flexShrink: 1 }]} numberOfLines={1}>
                {evento.igreja || evento.local.endereco}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  saudacao: { fontFamily: fontes.normal, fontSize: 14, color: cores.texto2 },
  titulo: { fontFamily: fontes.titulo, fontSize: 30, color: cores.tinta },
  semana: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingTop: 8 },
  dia: {
    flex: 1, height: 72, borderRadius: 16, borderWidth: 1, borderColor: '#E3DBD1', backgroundColor: cores.cartao,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  diaAtivo: { backgroundColor: cores.vinho, borderColor: cores.vinho },
  diaSemana: { fontFamily: fontes.medio, fontSize: 11, textTransform: 'uppercase', color: cores.texto2 },
  diaNum: { fontFamily: fontes.forte, fontSize: 18, color: cores.tinta },
  ponto: { width: 5, height: 5, borderRadius: 3 },
  filtros: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6 },
  filtro: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, borderColor: cores.borda, justifyContent: 'center' },
  filtroAtivo: { backgroundColor: cores.tinta, borderColor: cores.tinta },
  filtroTexto: { fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
  secao: {
    fontFamily: fontes.forte, fontSize: 13, color: cores.texto2, textTransform: 'uppercase',
    letterSpacing: 0.6, marginTop: 10, marginBottom: 2,
  },
  vazio: { fontFamily: fontes.normal, fontSize: 15, color: cores.texto2, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  cartao: {
    flexDirection: 'row', gap: 14, backgroundColor: cores.cartao, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: cores.bordaSuave,
  },
  caixaData: { width: 56, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  mes: { fontFamily: fontes.forte, fontSize: 11, textTransform: 'uppercase' },
  diaGrande: { fontFamily: fontes.titulo, fontSize: 24 },
  tag: { fontFamily: fontes.forte, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  nome: { fontFamily: fontes.forte, fontSize: 16, color: cores.tinta, lineHeight: 20 },
  info: { fontFamily: fontes.normal, fontSize: 13, color: cores.texto2, marginRight: 6 },
  fab: {
    position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30,
    backgroundColor: cores.vinho, alignItems: 'center', justifyContent: 'center',
    shadowColor: cores.vinho, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
