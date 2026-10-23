import { View, Text, StyleSheet, Platform } from 'react-native';
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

export default function PerfilScreen({ navigation }) {
  const { usuario, sair } = useAuth();
  const { admin } = useAcesso();

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
        <View style={st.avatar}>
          <Icone nome="person-outline" cor={cores.vinho} tamanho={26} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.nome}>{usuario?.displayName || 'Sem nome'}</Text>
          <Text style={st.email}>{usuario?.email}</Text>
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
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, paddingHorizontal: 24, gap: 20 },
  titulo: { fontFamily: fontes.titulo, fontSize: 30, color: cores.tinta, marginTop: 12 },
  cartao: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: cores.cartao, borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: cores.bordaSuave,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: cores.vinhoClaro, alignItems: 'center', justifyContent: 'center' },
  nome: { fontFamily: fontes.forte, fontSize: 17, color: cores.tinta },
  email: { fontFamily: fontes.normal, fontSize: 14, color: cores.texto2 },
});
