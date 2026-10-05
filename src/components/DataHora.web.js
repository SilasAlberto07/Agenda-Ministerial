import { Text, View, StyleSheet } from 'react-native';
import { cores, fontes } from '../theme';

// Versão web: usa os seletores de data e hora do próprio navegador (no iPhone abre a roda do iOS)
const dois = (n) => String(n).padStart(2, '0');
const paraData = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const paraHora = (d) => `${dois(d.getHours())}:${dois(d.getMinutes())}`;

const estiloInput = {
  height: 50,
  borderRadius: 14,
  border: `1px solid ${cores.borda}`,
  background: cores.cartao,
  padding: '0 14px',
  fontFamily: fontes.normal,
  fontSize: 16,
  color: cores.tinta,
  width: '100%',
  boxSizing: 'border-box',
  WebkitAppearance: 'none',
  appearance: 'none',
};

export default function DataHora({ valor, aoMudar }) {
  const mudarData = (e) => {
    const [a, m, d] = e.target.value.split('-').map(Number);
    if (!a) return;
    const r = new Date(valor);
    r.setFullYear(a, m - 1, d);
    aoMudar(r);
  };
  const mudarHora = (e) => {
    const [h, mi] = e.target.value.split(':').map(Number);
    if (Number.isNaN(h)) return;
    const r = new Date(valor);
    r.setHours(h, mi || 0, 0, 0);
    aoMudar(r);
  };

  return (
    <View style={st.grade}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={st.rotulo}>Data</Text>
        <input type="date" aria-label="Data" value={paraData(valor)} onChange={mudarData} style={estiloInput} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={st.rotulo}>Horário</Text>
        <input type="time" aria-label="Horário" value={paraHora(valor)} onChange={mudarHora} style={estiloInput} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  grade: { flexDirection: 'row', gap: 12 },
  rotulo: { fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
});
