import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Platform } from 'react-native';
import { Alert } from '../utils/alerta';
import { Icone } from './icones';
import { cores, fontes } from '../theme';
import { linkValido, ouvirVersaoPublicada, publicarVersao, versaoDoAparelho } from '../services/versaoApp';

// Painel de acessos: avisar todos os clientes de Android que existe um APK novo
export default function CartaoVersaoAdmin() {
  const [publicada, setPublicada] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);
  const minha = versaoDoAparelho();

  useEffect(() => ouvirVersaoPublicada(setPublicada), []);

  const avisar = async () => {
    if (!linkValido(link))
      return Alert.alert('Link inválido', 'Cole o link do build que aparece no terminal ou no expo.dev (começa com https://expo.dev/).');
    setSalvando(true);
    try {
      await publicarVersao(minha, link);
      setAberto(false);
      setLink('');
      Alert.alert('Pronto', 'Os clientes de Android com versão mais antiga vão ver o aviso "Nova versão do app" com o botão Baixar.');
    } catch {
      Alert.alert('Não foi possível avisar', 'Tente de novo em instantes.');
    } finally {
      setSalvando(false);
    }
  };

  const numPublicada = Number(publicada?.versaoCodigo) || 0;
  const podeAvisar = Platform.OS === 'android' && minha > numPublicada;

  return (
    <View style={st.cartao}>
      <Pressable onPress={() => setAberto(!aberto)} style={st.linha} accessibilityRole="button">
        <Icone nome="phone-portrait-outline" cor={cores.vinho} tamanho={20} />
        <View style={{ flex: 1 }}>
          <Text style={st.titulo}>Versão do app (Android)</Text>
          <Text style={st.sub}>
            {Platform.OS === 'android' ? `Este celular: versão ${minha || 'antiga'}` : 'Abra no celular Android para avisar'}
            {numPublicada ? ` · avisada: versão ${numPublicada}` : ''}
          </Text>
        </View>
        {podeAvisar ? <View style={st.ponto} /> : null}
        <Icone nome={aberto ? 'chevron-up' : 'chevron-down'} cor={cores.texto2} tamanho={18} />
      </Pressable>

      {aberto ? (
        <View style={{ gap: 10, marginTop: 10 }}>
          {podeAvisar ? (
            <>
              <Text style={st.texto}>
                Este celular já está com um APK mais novo. Cole o link do build e avise todos: quem estiver com versão
                antiga vê o aviso com o botão Baixar.
              </Text>
              <TextInput
                value={link}
                onChangeText={setLink}
                placeholder="https://expo.dev/accounts/.../builds/..."
                placeholderTextColor={cores.texto3}
                autoCapitalize="none"
                autoCorrect={false}
                style={st.campo}
              />
              <Pressable onPress={avisar} disabled={salvando} style={[st.botao, salvando && { opacity: 0.7 }]}>
                <Text style={st.botaoTexto}>{salvando ? 'Avisando…' : `Avisar todos da versão ${minha}`}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={st.texto}>
              Quando gerar um APK novo: instale primeiro neste celular, volte aqui, cole o link do build e toque em
              "Avisar todos". Não precisa mais mandar o APK pelo WhatsApp.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  cartao: { backgroundColor: cores.cartao, borderRadius: 16, borderWidth: 1, borderColor: cores.bordaSuave, padding: 14, marginHorizontal: 20, marginTop: 12 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titulo: { fontFamily: fontes.forte, fontSize: 15, color: cores.tinta },
  sub: { fontFamily: fontes.normal, fontSize: 13, color: cores.texto2 },
  ponto: { width: 9, height: 9, borderRadius: 5, backgroundColor: cores.vinho },
  texto: { fontFamily: fontes.normal, fontSize: 13, color: cores.texto2, lineHeight: 19 },
  campo: {
    borderWidth: 1, borderColor: cores.borda, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: fontes.normal, fontSize: 14, color: cores.tinta, backgroundColor: cores.fundo,
  },
  botao: { backgroundColor: cores.vinho, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  botaoTexto: { fontFamily: fontes.forte, fontSize: 15, color: '#fff' },
});
