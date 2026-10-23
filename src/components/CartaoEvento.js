import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Icone } from './icones';
import { cores, fontes, corDoTipo } from '../theme';
import { mesCurto, hora } from '../utils/datas';

// Cartão de um compromisso, usado na Agenda e no Histórico.
// No Histórico (historico=true) mostra o ano e o endereço completo.
// hoje=true: compromisso de hoje, com borda e data em destaque.
export default function CartaoEvento({ evento, onPress, historico, hoje }) {
  const c = corDoTipo(evento.tipo);
  const onde = historico
    ? [evento.igreja, evento.local?.endereco].filter(Boolean).join(' · ')
    : evento.igreja || evento.local?.endereco;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      accessibilityLabel={hoje ? `Hoje: ${evento.nome}` : evento.nome}
      style={({ pressed }) => [st.cartao, hoje && st.cartaoHoje, pressed && { opacity: 0.85 }]}
    >
      <View style={[st.caixaData, { backgroundColor: hoje ? cores.vinho : c.fundo }]}>
        <Text style={[st.mes, { color: hoje ? '#fff' : c.texto }]}>{hoje ? 'Hoje' : mesCurto(evento.data)}</Text>
        <Text style={[st.diaGrande, { color: hoje ? '#fff' : c.texto }]}>{String(evento.data.getDate()).padStart(2, '0')}</Text>
        {historico ? <Text style={[st.ano, { color: c.texto }]}>{evento.data.getFullYear()}</Text> : null}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={st.topo}>
          <Text style={[st.tag, { color: c.texto, flexShrink: 1 }]} numberOfLines={1}>
            {evento.tipo}
            {evento.participacao ? ` · ${evento.participacao.toLowerCase()}` : ''}
          </Text>
        </View>
        <Text style={st.nome} numberOfLines={2}>
          {evento.nome}
        </Text>
        <View style={st.linha}>
          {!historico ? (
            <>
              <Icone nome="time-outline" tamanho={14} cor={hoje ? cores.vinho : cores.texto2} />
              <Text style={[st.info, hoje && st.horaHoje]}>{hora(evento.data)}</Text>
            </>
          ) : null}
          {onde ? (
            <>
              <Icone nome="location-outline" tamanho={14} cor={cores.texto2} />
              <Text style={[st.info, { flexShrink: 1 }]} numberOfLines={historico ? 2 : 1}>
                {onde}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  cartao: {
    flexDirection: 'row', gap: 14, backgroundColor: cores.cartao, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: cores.bordaSuave,
  },
  cartaoHoje: { borderWidth: 2, borderColor: cores.vinho, backgroundColor: '#FCF5F7' },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  horaHoje: { fontFamily: fontes.forte, color: cores.vinho },
  caixaData: { width: 56, minHeight: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 6 },
  mes: { fontFamily: fontes.forte, fontSize: 11, textTransform: 'uppercase' },
  diaGrande: { fontFamily: fontes.titulo, fontSize: 24 },
  ano: { fontFamily: fontes.medio, fontSize: 11 },
  tag: { fontFamily: fontes.forte, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  nome: { fontFamily: fontes.forte, fontSize: 16, color: cores.tinta, lineHeight: 20 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  info: { fontFamily: fontes.normal, fontSize: 13, color: cores.texto2, marginRight: 6 },
});
