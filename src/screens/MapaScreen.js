import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapaWeb from '../components/MapaWeb';
import { useEventos } from '../services/EventosContext';
import { cores, fontes } from '../theme';
import { dataLonga, hora } from '../utils/datas';

// Aba "Mapa": mostra onde ficam os próximos compromissos
export default function MapaScreen({ navigation }) {
  const { eventos } = useEventos();

  const marcadores = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return eventos
      .filter((e) => e.local?.latitude && e.data >= hoje)
      .map((e) => ({
        id: e.id,
        latitude: e.local.latitude,
        longitude: e.local.longitude,
        cor: e.tipo === 'Congresso' ? '#B07A1E' : cores.vinho,
        titulo: e.nome,
        subtitulo: `${dataLonga(e.data)} às ${hora(e.data)}`,
        abrir: true,
      }));
  }, [eventos]);

  return (
    <View style={{ flex: 1 }}>
      <MapaWeb
        style={StyleSheet.absoluteFill}
        marcadores={marcadores}
        ajustarAosMarcadores
        aoTocarMarcador={(id) => navigation.navigate('Detalhe', { id })}
      />
      <SafeAreaView edges={['top']} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
        <View style={st.cartao}>
          <Text style={st.titulo}>Mapa da agenda</Text>
          <Text style={st.sub}>
            {marcadores.length
              ? `${marcadores.length} compromisso${marcadores.length > 1 ? 's' : ''} com local marcado. Toque no pino para abrir.`
              : 'Seus compromissos com local aparecem aqui'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  cartao: {
    margin: 16, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.96)', gap: 2,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  titulo: { fontFamily: fontes.titulo, fontSize: 22, color: cores.tinta },
  sub: { fontFamily: fontes.normal, fontSize: 14, color: cores.texto2 },
});
