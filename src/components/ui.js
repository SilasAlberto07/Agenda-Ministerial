import { Pressable, Text, TextInput, View, StyleSheet, ActivityIndicator } from 'react-native';
import { cores, fontes } from '../theme';

export function Botao({ titulo, onPress, variante = 'primario', carregando, desabilitado, style, icone }) {
  const primario = variante === 'primario';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={desabilitado || carregando}
      style={({ pressed }) => [
        s.botao,
        primario ? s.botaoPrimario : s.botaoSecundario,
        (pressed || desabilitado) && { opacity: 0.75 },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={primario ? '#fff' : cores.tinta} />
      ) : (
        <View style={s.linha}>
          {icone}
          <Text style={[s.botaoTexto, { color: primario ? '#fff' : cores.tinta }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Campo({ rotulo, style, multiline, ...props }) {
  return (
    <View style={{ gap: 6 }}>
      {rotulo ? <Text style={s.rotulo}>{rotulo}</Text> : null}
      <TextInput
        placeholderTextColor={cores.texto3}
        style={[s.input, multiline && { height: 96, paddingTop: 12, textAlignVertical: 'top' }, style]}
        multiline={multiline}
        accessibilityLabel={rotulo}
        {...props}
      />
    </View>
  );
}

export function Pilula({ rotulo, ativo, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={[s.pilula, ativo ? { backgroundColor: cores.vinho, borderColor: cores.vinho } : null]}
    >
      <Text style={[s.pilulaTexto, ativo && { color: '#fff' }]}>{rotulo}</Text>
    </Pressable>
  );
}

export function Rotulo({ children }) {
  return <Text style={s.rotulo}>{children}</Text>;
}

export const s = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botao: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  botaoPrimario: { backgroundColor: cores.vinho },
  botaoSecundario: { backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.borda },
  botaoTexto: { fontFamily: fontes.forte, fontSize: 16 },
  rotulo: { fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
    paddingHorizontal: 14,
    fontFamily: fontes.normal,
    fontSize: 16,
    color: cores.tinta,
  },
  pilula: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
    justifyContent: 'center',
  },
  pilulaTexto: { fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
});
