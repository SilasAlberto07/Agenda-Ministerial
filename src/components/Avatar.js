import { View, Text, Image, StyleSheet } from 'react-native';
import { cores, fontes } from '../theme';

// Foto de perfil redonda; sem foto, mostra as iniciais do nome
export default function Avatar({ foto, nome, tamanho = 52 }) {
  const iniciais = (nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  const forma = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };
  if (foto) return <Image source={{ uri: foto }} style={[forma, st.foto]} accessibilityLabel="Foto de perfil" />;
  return (
    <View style={[forma, st.vazio]}>
      <Text style={[st.iniciais, { fontSize: tamanho * 0.38 }]}>{iniciais || '•'}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  foto: { backgroundColor: cores.vinhoClaro },
  vazio: { backgroundColor: cores.vinhoClaro, alignItems: 'center', justifyContent: 'center' },
  iniciais: { fontFamily: fontes.titulo, color: cores.vinho },
});
