import { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { useEventos } from '../services/EventosContext';
import { cores, fontes } from '../theme';
import { dataLonga, hora } from '../utils/datas';

// Aba "Mapa": mostra onde ficam os próximos compromissos
export default function MapaScreen({ navigation }) {
  const { eventos } = useEventos();
  const mapa = useRef(null);

  const comLocal = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return eventos.filter((e) => e.local?.latitude && e.data >= hoje);
  }, [eventos]);

  useEffect(() => {
    if (comLocal.length && mapa.current) {
      setTimeout(() => {
        mapa.current?.fitToCoordinates(
          comLocal.map((e) => ({ latitude: e.local.latitude, longitude: e.local.longitude })),
          { edgePadding: { top: 120, right: 60, bottom: 80, left: 60 }, animated: true }
        );
      }, 400);
    }
  }, [comLocal]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        initialRegion={{ latitude: -14.235, longitude: -51.925, latitudeDelta: 30, longitudeDelta: 30 }}
      >
        {comLocal.map((e) => (
          <Marker
            key={e.id}
            coordinate={{ latitude: e.local.latitude, longitude: e.local.longitude }}
            pinColor={e.tipo === 'Congresso' ? '#B07A1E' : cores.vinho}
            title={e.nome}
            description={`${dataLonga(e.data)} às ${hora(e.data)} — toque para abrir`}
            onCalloutPress={() => navigation.navigate('Detalhe', { id: e.id })}
          />
        ))}
      </MapView>
      <SafeAreaView edges={['top']} pointerEvents="none">
        <View style={st.cartao}>
          <Text style={st.titulo}>Mapa da agenda</Text>
          <Text style={st.sub}>
            {comLocal.length
              ? `${comLocal.length} compromisso${comLocal.length > 1 ? 's' : ''} com local marcado`
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
