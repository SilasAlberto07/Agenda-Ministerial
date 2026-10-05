import { useState } from 'react';
import { Platform, Pressable, Text, View, Modal, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { cores, fontes } from '../theme';
import { dataNumerica, horaInput } from '../utils/datas';
import { Botao } from './ui';

// Campo de data e horário lado a lado. No Android abre o seletor do sistema;
// no iPhone abre um painel com o seletor em rolagem.
export default function DataHora({ valor, aoMudar }) {
  const [modoIOS, setModoIOS] = useState(null); // 'date' | 'time' | null

  const abrir = (mode) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: valor,
        mode,
        is24Hour: true,
        onChange: (ev, d) => ev.type === 'set' && d && aoMudar(juntar(valor, d, mode)),
      });
    } else {
      setModoIOS(mode);
    }
  };

  return (
    <View style={st.grade}>
      <Caixa rotulo="Data" texto={dataNumerica(valor)} onPress={() => abrir('date')} />
      <Caixa rotulo="Horário" texto={horaInput(valor)} onPress={() => abrir('time')} />

      {Platform.OS === 'ios' && (
        <Modal visible={!!modoIOS} transparent animationType="slide" onRequestClose={() => setModoIOS(null)}>
          <View style={st.fundoModal}>
            <View style={st.painel}>
              {modoIOS && (
                <DateTimePicker
                  value={valor}
                  mode={modoIOS}
                  display="spinner"
                  locale="pt-BR"
                  is24Hour
                  onChange={(_, d) => d && aoMudar(juntar(valor, d, modoIOS))}
                />
              )}
              <Botao titulo="Pronto" onPress={() => setModoIOS(null)} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function juntar(base, escolhido, mode) {
  const r = new Date(base);
  if (mode === 'date') r.setFullYear(escolhido.getFullYear(), escolhido.getMonth(), escolhido.getDate());
  else r.setHours(escolhido.getHours(), escolhido.getMinutes(), 0, 0);
  return r;
}

function Caixa({ rotulo, texto, onPress }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={st.rotulo}>{rotulo}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${rotulo}: ${texto}`} onPress={onPress} style={st.caixa}>
        <Text style={st.texto}>{texto}</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  grade: { flexDirection: 'row', gap: 12 },
  rotulo: { fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
  caixa: {
    height: 50, borderRadius: 14, borderWidth: 1, borderColor: cores.borda, backgroundColor: cores.cartao,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  texto: { fontFamily: fontes.normal, fontSize: 16, color: cores.tinta },
  fundoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  painel: { backgroundColor: cores.cartao, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 12 },
});
