import { View, Text, StyleSheet, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { useAcesso } from '../services/AcessoContext';
import { Botao } from '../components/ui';
import { Icone } from '../components/icones';
import { cores, fontes } from '../theme';
import { VENDA } from '../config';

const TEXTOS = {
  pendente: {
    icone: 'time-outline',
    titulo: 'Aguardando liberação',
    texto:
      'Sua conta foi criada. Assim que o pagamento for confirmado, o acesso é liberado e esta tela abre a agenda sozinha.',
  },
  bloqueado: {
    icone: 'lock-closed-outline',
    titulo: 'Acesso bloqueado',
    texto: 'O acesso desta conta foi bloqueado. Fale com quem te vendeu o app.',
  },
  limite: {
    icone: 'phone-portrait-outline',
    titulo: 'Limite de aparelhos',
    texto:
      'Esta conta já está sendo usada no número máximo de aparelhos. Para usar neste aparelho, peça para liberar mais um ou para remover um aparelho antigo.',
  },
  erro: {
    icone: 'cloud-offline-outline',
    titulo: 'Sem conexão',
    texto: 'Não foi possível verificar o seu acesso. Confira a internet e abra o app de novo.',
  },
};

// Tela mostrada no lugar da agenda enquanto a conta não pode usar o app neste aparelho
export default function AcessoScreen() {
  const { usuario, sair } = useAuth();
  const { estado, acesso } = useAcesso();

  if (estado === 'carregando') {
    return (
      <View style={[st.tela, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={cores.vinho} />
      </View>
    );
  }

  const t = TEXTOS[estado] || TEXTOS.erro;
  const email = usuario?.email || '';
  const falar = () => {
    const msg =
      estado === 'limite'
        ? `Olá! Preciso usar o Agenda Ministerial em mais um aparelho. Minha conta: ${email}`
        : `Olá! Quero liberar meu acesso ao Agenda Ministerial. Minha conta: ${email}`;
    Linking.openURL(`https://wa.me/${VENDA.whatsapp}?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  return (
    <SafeAreaView style={st.tela}>
      <ScrollView contentContainerStyle={st.conteudo}>
        <View style={st.icone}>
          <Icone nome={t.icone} cor={cores.vinho} tamanho={30} />
        </View>
        <Text style={st.titulo}>{t.titulo}</Text>
        <Text style={st.texto}>{t.texto}</Text>

        {estado === 'pendente' && VENDA.oferta ? (
          <View style={st.oferta}>
            <Text style={st.ofertaTexto}>{VENDA.oferta}</Text>
          </View>
        ) : null}

        <View style={st.cartao}>
          <Text style={st.rotulo}>Sua conta</Text>
          <Text style={st.email}>{email}</Text>
          {estado === 'limite' ? (
            <Text style={st.detalhe}>
              Aparelhos em uso: {Object.keys(acesso?.aparelhos || {}).length} de {acesso?.limiteAparelhos ?? 2}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 12, marginTop: 8 }}>
          {VENDA.whatsapp && estado !== 'erro' ? (
            <Botao
              titulo="Falar no WhatsApp"
              onPress={falar}
              icone={<Icone nome="logo-whatsapp" cor="#fff" tamanho={18} />}
            />
          ) : null}
          <Botao titulo="Sair desta conta" variante="secundario" onPress={sair} />
        </View>

        {estado === 'pendente' ? (
          <Text style={st.rodape}>Esta tela se atualiza sozinha quando o acesso for liberado.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flexGrow: 1, padding: 28, paddingTop: 48, gap: 14 },
  icone: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: cores.vinhoClaro,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  titulo: { fontFamily: fontes.titulo, fontSize: 30, lineHeight: 36, color: cores.tinta },
  texto: { fontFamily: fontes.normal, fontSize: 16, lineHeight: 24, color: cores.texto2 },
  oferta: { backgroundColor: cores.douradoClaro, borderRadius: 14, padding: 14 },
  ofertaTexto: { fontFamily: fontes.forte, fontSize: 15, color: cores.dourado, lineHeight: 21 },
  cartao: {
    backgroundColor: cores.cartao, borderRadius: 16, borderWidth: 1, borderColor: cores.bordaSuave,
    padding: 14, gap: 4, marginTop: 4,
  },
  rotulo: { fontFamily: fontes.forte, fontSize: 12, color: cores.texto2, textTransform: 'uppercase' },
  email: { fontFamily: fontes.forte, fontSize: 16, color: cores.tinta },
  detalhe: { fontFamily: fontes.normal, fontSize: 14, color: cores.texto2, marginTop: 4 },
  rodape: { fontFamily: fontes.normal, fontSize: 13, color: cores.texto3, textAlign: 'center', marginTop: 'auto', paddingTop: 16 },
});
