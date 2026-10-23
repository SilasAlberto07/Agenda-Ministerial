import { useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Alert } from '../utils/alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Notifications, notificacoesDisponiveis } from '../services/notificacoes';
import { useAuth } from '../auth/AuthContext';
import { Botao } from '../components/ui';
import { Icone } from '../components/icones';
import { cores, fontes } from '../theme';
import { prepararNotificacoes, cancelarTodosLembretes } from '../services/lembretes';
import { desativarAvisos } from '../services/pushWeb';
import { removerAparelhoDosAvisos, testarAvisoDoServidor } from '../services/pushNativo';
import CartaoAvisos from '../components/CartaoAvisos';
import { limparCacheLocal } from '../services/cacheLocal';
import { useAcesso } from '../services/AcessoContext';
import { usePerfil } from '../services/PerfilContext';
import { useEventos } from '../services/EventosContext';
import { escolherFoto, salvarFoto, removerFoto, salvarNome } from '../services/perfil';
import Avatar from '../components/Avatar';

export default function PerfilScreen({ navigation }) {
  const { usuario, sair } = useAuth();
  const { admin } = useAcesso();
  const { nome, foto, atualizar } = usePerfil();
  const { offline } = useEventos();
  const [editando, setEditando] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  const semInternet = () =>
    Alert.alert('Sem internet', 'Para mudar o nome ou a foto, conecte-se à internet.');

  const trocarFoto = async () => {
    if (offline) return semInternet();
    try {
      const nova = await escolherFoto();
      if (!nova) return;
      setSalvandoFoto(true);
      await salvarFoto(usuario.uid, nova);
      atualizar({ foto: nova });
    } catch (e) {
      if (e?.message === 'apk-antigo')
        Alert.alert('Atualize o app', 'Para colocar foto de perfil, instale a versão mais nova do app (peça o link do instalador).');
      else if (e?.message === 'permissao')
        Alert.alert('Sem acesso às fotos', 'Permita o acesso às fotos nas configurações do celular para escolher uma foto.');
      else Alert.alert('Não foi possível salvar a foto', 'Tente de novo em instantes.');
    } finally {
      setSalvandoFoto(false);
    }
  };

  const tirarFoto = () =>
    Alert.alert('Remover foto?', 'A foto de perfil será removida de todos os aparelhos da conta.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          if (offline) return semInternet();
          await removerFoto(usuario.uid).catch(() => {});
          atualizar({ foto: '' });
        },
      },
    ]);

  const comecarEdicao = () => {
    setNovoNome(nome);
    setEditando(true);
  };

  const confirmarNome = async () => {
    if (!novoNome.trim()) return Alert.alert('Falta o nome', 'Digite o nome que vai aparecer no app.');
    if (offline) return semInternet();
    setSalvandoNome(true);
    try {
      const salvo = await salvarNome(usuario.uid, novoNome);
      atualizar({ nome: salvo });
      setEditando(false);
    } catch {
      Alert.alert('Não foi possível salvar o nome', 'Tente de novo em instantes.');
    } finally {
      setSalvandoNome(false);
    }
  };

  const testarAviso = async () => {
    if (!notificacoesDisponiveis)
      return Alert.alert(
        'Avisos indisponíveis no Expo Go',
        'No Android, o Expo Go não permite notificações. Elas funcionam quando o app é instalado pelo APK. Todo o resto do app funciona normalmente aqui.'
      );
    const ok = await prepararNotificacoes();
    if (!ok) return Alert.alert('Notificações desativadas', 'Ative as notificações do app nas configurações do celular.');
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Agenda Ministerial', body: 'Tudo certo! É assim que seus lembretes vão chegar.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: 'lembretes' },
    });
    // Testa também os avisos do servidor (compromisso novo, cliente aguardando)
    const servidor = await testarAvisoDoServidor(usuario.uid);
    Alert.alert(
      'Aviso de teste',
      'Em 5 segundos chega uma notificação de exemplo.\n\n' +
        (servidor.ok
          ? 'Avisos do servidor: funcionando. Chega também um segundo aviso.'
          : `Avisos do servidor: com problema.\nMotivo: ${servidor.motivo}`)
    );
  };

  const confirmarSair = () =>
    Alert.alert('Sair da conta?', 'Os lembretes deste aparelho serão desligados até você entrar de novo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await cancelarTodosLembretes();
          await desativarAvisos(usuario.uid);
          await removerAparelhoDosAvisos(usuario.uid);
          await limparCacheLocal(usuario.uid);
          await sair();
        },
      },
    ]);

  return (
    <SafeAreaView style={st.tela} edges={['top']}>
      <Text style={st.titulo}>Perfil</Text>
      <View style={st.cartao}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={foto ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
            onPress={trocarFoto}
            disabled={salvandoFoto}
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <Avatar foto={foto} nome={nome} tamanho={76} />
            <View style={st.camera}>
              {salvandoFoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icone nome="camera-outline" cor="#fff" tamanho={15} />
              )}
            </View>
          </Pressable>
          {foto ? (
            <Pressable onPress={tirarFoto} hitSlop={8}>
              <Text style={st.remover}>Remover</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          {editando ? (
            <>
              <TextInput
                value={novoNome}
                onChangeText={setNovoNome}
                autoFocus
                maxLength={60}
                placeholder="Seu nome"
                placeholderTextColor={cores.texto3}
                returnKeyType="done"
                onSubmitEditing={confirmarNome}
                style={st.campoNome}
              />
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                <Pressable onPress={confirmarNome} disabled={salvandoNome} hitSlop={8}>
                  <Text style={st.acao}>{salvandoNome ? 'Salvando…' : 'Salvar'}</Text>
                </Pressable>
                <Pressable onPress={() => setEditando(false)} hitSlop={8}>
                  <Text style={[st.acao, { color: cores.texto2 }]}>Cancelar</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar nome"
                onPress={comecarEdicao}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={[st.nome, { flexShrink: 1 }]} numberOfLines={2}>
                  {nome || 'Adicionar nome'}
                </Text>
                <Icone nome="create-outline" cor={cores.vinho} tamanho={18} />
              </Pressable>
              <Text style={st.email} numberOfLines={1}>
                {usuario?.email}
              </Text>
            </>
          )}
        </View>
      </View>
      <CartaoAvisos />
      <View style={{ gap: 12 }}>
        {admin && (
          <Botao
            titulo="Painel de acessos"
            onPress={() => navigation.navigate('PainelAcessos')}
            icone={<Icone nome="shield-checkmark-outline" cor="#fff" tamanho={18} />}
          />
        )}
        {Platform.OS !== 'web' && (
          <Botao
            titulo="Testar notificação"
            variante="secundario"
            onPress={testarAviso}
            icone={<Icone nome="notifications-outline" tamanho={18} />}
          />
        )}
        <Botao
          titulo="Sair"
          variante="secundario"
          onPress={confirmarSair}
          icone={<Icone nome="log-out-outline" tamanho={18} />}
        />
      </View>
      <Text style={st.assinatura}>Agenda Ministerial · Desenvolvido por Silas Alberto</Text>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  assinatura: {
    fontFamily: fontes.normal, fontSize: 11, color: cores.texto3, textAlign: 'center', marginTop: 'auto', paddingBottom: 16,
    letterSpacing: 0.3,
  },
  tela: { flex: 1, backgroundColor: cores.fundo, paddingHorizontal: 24, gap: 20 },
  titulo: { fontFamily: fontes.titulo, fontSize: 30, color: cores.tinta, marginTop: 12 },
  cartao: {
    flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: cores.cartao, borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: cores.bordaSuave,
  },
  camera: {
    position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: cores.vinho,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: cores.cartao,
  },
  remover: { fontFamily: fontes.medio, fontSize: 12, color: cores.texto2 },
  campoNome: {
    fontFamily: fontes.forte, fontSize: 17, color: cores.tinta, borderBottomWidth: 2, borderColor: cores.vinho,
    paddingVertical: 4, paddingHorizontal: 0, outlineStyle: 'none',
  },
  acao: { fontFamily: fontes.forte, fontSize: 14, color: cores.vinho },
  nome: { fontFamily: fontes.forte, fontSize: 17, color: cores.tinta },
  email: { fontFamily: fontes.normal, fontSize: 14, color: cores.texto2 },
});
