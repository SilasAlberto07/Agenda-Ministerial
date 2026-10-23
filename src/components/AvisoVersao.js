import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { Icone } from './icones';
import { cores, fontes } from '../theme';
import { ouvirVersaoPublicada, versaoDoAparelho } from '../services/versaoApp';

// Faixa "Nova versão do app" no topo da Agenda (só no Android instalado pelo APK)
export default function AvisoVersao() {
  const [publicada, setPublicada] = useState(null);
  const [depois, setDepois] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    return ouvirVersaoPublicada(setPublicada);
  }, []);

  if (Platform.OS !== 'android' || depois || !publicada?.link) return null;
  const minha = versaoDoAparelho();
  if (!(Number(publicada.versaoCodigo) > minha)) return null;

  return (
    <View style={st.caixa} accessibilityRole="alert">
      <View style={st.icone}>
        <Icone nome="arrow-down-circle-outline" cor={cores.vinho} tamanho={22} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={st.titulo}>Nova versão do app</Text>
        <Text style={st.texto}>Baixe e instale por cima. Sua agenda continua igual.</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Pressable accessibilityRole="button" onPress={() => Linking.openURL(publicada.link)} style={st.botao}>
          <Text style={st.botaoTexto}>Baixar</Text>
        </Pressable>
        <Pressable onPress={() => setDepois(true)} hitSlop={8}>
          <Text style={st.depois}>Depois</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  caixa: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 24, marginBottom: 6, padding: 12,
    borderRadius: 16, backgroundColor: cores.vinhoClaro, borderWidth: 1, borderColor: '#E7C9D3', flexShrink: 0,
  },
  icone: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fontes.forte, fontSize: 15, color: cores.vinho },
  texto: { fontFamily: fontes.normal, fontSize: 13, color: cores.texto2, lineHeight: 17 },
  botao: { backgroundColor: cores.vinho, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  botaoTexto: { fontFamily: fontes.forte, fontSize: 14, color: '#fff' },
  depois: { fontFamily: fontes.medio, fontSize: 12, color: cores.texto2 },
});
