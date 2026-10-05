import { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Alert } from '../utils/alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao, Campo, Pilula, Rotulo } from '../components/ui';
import DataHora from '../components/DataHora';
import { Icone } from '../components/icones';
import { cores, fontes, TIPOS, PARTICIPACOES, LEMBRETES } from '../theme';
import { useAuth } from '../auth/AuthContext';
import { useEventos } from '../services/EventosContext';
import { criarEvento, atualizarEvento } from '../services/eventos';
import { prepararNotificacoes } from '../services/lembretes';
import { notificacoesDisponiveis } from '../services/notificacoes';

function dataPadrao() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  return d;
}

export default function NovoEventoScreen({ navigation, route }) {
  const { usuario } = useAuth();
  const { eventos } = useEventos();
  const editando = route.params?.id ? eventos.find((e) => e.id === route.params.id) : null;

  const [tipo, setTipo] = useState(editando?.tipo || 'Culto');
  const [nome, setNome] = useState(editando?.nome || '');
  const [igreja, setIgreja] = useState(editando?.igreja || '');
  const [data, setData] = useState(editando?.data || dataPadrao());
  const [local, setLocal] = useState(editando?.local || null);
  const [participacao, setParticipacao] = useState(editando?.participacao || 'Pregar');
  const [lembretes, setLembretes] = useState(editando?.lembretes || [1440, 120]);
  const [observacoes, setObservacoes] = useState(editando?.observacoes || '');
  const [salvando, setSalvando] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editando ? 'Editar compromisso' : 'Novo compromisso' });
  }, [editando, navigation]);

  // Recebe o local escolhido na tela do mapa
  useEffect(() => {
    if (route.params?.local) setLocal(route.params.local);
  }, [route.params?.local]);

  const alternarLembrete = (m) =>
    setLembretes((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m].sort((a, b) => b - a)));

  const salvar = async () => {
    if (!nome.trim()) return Alert.alert('Falta o nome', 'Dê um nome para o compromisso.');
    setSalvando(true);
    try {
      if (lembretes.length && notificacoesDisponiveis) {
        const ok = await prepararNotificacoes();
        if (!ok)
          Alert.alert(
            'Notificações desativadas',
            'O compromisso será salvo, mas para receber os avisos ative as notificações do app nas configurações do celular.'
          );
      }
      const evento = {
        tipo,
        nome: nome.trim(),
        igreja: igreja.trim(),
        data,
        local,
        participacao,
        lembretes,
        observacoes: observacoes.trim(),
      };
      if (editando) await atualizarEvento(usuario.uid, { ...evento, id: editando.id });
      else await criarEvento(usuario.uid, evento);
      navigation.goBack();
    } catch (e) {
      console.warn(e);
      Alert.alert('Não foi possível salvar', 'Verifique sua conexão e tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.form} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8 }}>
            <Rotulo>Tipo</Rotulo>
            <View style={st.segmentado}>
              {TIPOS.map((t) => (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tipo === t }}
                  onPress={() => setTipo(t)}
                  style={[st.segmento, tipo === t && st.segmentoAtivo]}
                >
                  <Text style={st.segmentoTexto}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Campo rotulo="Nome do evento" placeholder="Ex.: Congresso de Jovens" value={nome} onChangeText={setNome} />
          <Campo rotulo="Igreja / organizador" placeholder="Nome da igreja" value={igreja} onChangeText={setIgreja} />
          <DataHora valor={data} aoMudar={setData} />

          <View style={{ gap: 6 }}>
            <Rotulo>Local</Rotulo>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('EscolherLocal', { local })}
              style={[st.local, local && { borderStyle: 'solid', borderColor: cores.borda }]}
            >
              <View style={st.localIcone}>
                <Icone nome="location-outline" cor={cores.vinho} tamanho={18} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.localTitulo} numberOfLines={2}>
                  {local?.endereco || 'Buscar no mapa'}
                </Text>
                <Text style={st.localSub}>{local ? 'Toque para mudar' : 'Endereço, igreja ou ponto de referência'}</Text>
              </View>
              <Icone nome="chevron-forward" cor={cores.texto2} tamanho={18} />
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Rotulo>Minha participação</Rotulo>
            <View style={st.pilulas}>
              {PARTICIPACOES.map((p) => (
                <Pilula key={p} rotulo={p} ativo={participacao === p} onPress={() => setParticipacao(p)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Rotulo>Me avisar</Rotulo>
            <View style={st.pilulas}>
              {LEMBRETES.map((l) => (
                <Pilula key={l.minutos} rotulo={l.rotulo} ativo={lembretes.includes(l.minutos)} onPress={() => alternarLembrete(l.minutos)} />
              ))}
            </View>
          </View>

          <Campo
            rotulo="Observações"
            placeholder="Tema da pregação, repertório, contato do pastor…"
            multiline
            value={observacoes}
            onChangeText={setObservacoes}
          />
        </ScrollView>
        <View style={st.rodape}>
          <Botao titulo={editando ? 'Salvar alterações' : 'Salvar compromisso'} onPress={salvar} carregando={salvando} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  form: { padding: 24, paddingTop: 12, gap: 18 },
  segmentado: { flexDirection: 'row', gap: 6, backgroundColor: cores.bordaSuave, padding: 4, borderRadius: 14 },
  segmento: { flex: 1, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentoAtivo: {
    backgroundColor: cores.cartao, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  segmentoTexto: { fontFamily: fontes.forte, fontSize: 15, color: cores.tinta },
  local: {
    minHeight: 60, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B9AEA1',
    backgroundColor: cores.cartao, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  localIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: cores.vinhoClaro, alignItems: 'center', justifyContent: 'center' },
  localTitulo: { fontFamily: fontes.forte, fontSize: 15, color: cores.tinta },
  localSub: { fontFamily: fontes.normal, fontSize: 13, color: cores.texto2 },
  pilulas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rodape: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: cores.bordaSuave, backgroundColor: cores.fundo },
});
