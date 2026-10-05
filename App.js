import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Notifications } from './src/services/notificacoes';
import { useFonts, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { EventosProvider } from './src/services/EventosContext';
import { Icone } from './src/components/icones';
import { cores, fontes } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import AgendaScreen from './src/screens/AgendaScreen';
import NovoEventoScreen from './src/screens/NovoEventoScreen';
import EscolherLocalScreen from './src/screens/EscolherLocalScreen';
import MapaScreen from './src/screens/MapaScreen';
import DetalheScreen from './src/screens/DetalheScreen';
import PerfilScreen from './src/screens/PerfilScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const navRef = createNavigationContainerRef();

const tema = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: cores.fundo, primary: cores.vinho } };

function Abas() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: cores.vinho,
        tabBarInactiveTintColor: cores.texto2,
        tabBarLabelStyle: { fontFamily: fontes.forte, fontSize: 12 },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: cores.bordaSuave },
        tabBarIcon: ({ color }) => (
          <Icone
            cor={color}
            nome={{ Agenda: 'calendar-outline', Mapa: 'map-outline', Perfil: 'person-outline' }[route.name]}
          />
        ),
      })}
    >
      <Tabs.Screen name="Agenda" component={AgendaScreen} />
      <Tabs.Screen name="Mapa" component={MapaScreen} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} />
    </Tabs.Navigator>
  );
}

function Rotas() {
  const { usuario, carregando } = useAuth();
  // Ao tocar no lembrete, abre o compromisso
  useEffect(() => {
    if (!Notifications || !usuario) return;
    const abrir = (resp) => {
      const id = resp?.notification?.request?.content?.data?.eventoId;
      if (id && navRef.isReady()) navRef.navigate('Detalhe', { id });
    };
    abrir(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => sub.remove();
  }, [usuario]);

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.vinho} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef} theme={tema}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: cores.fundo },
          headerShadowVisible: false,
          headerTintColor: cores.tinta,
          headerTitleStyle: { fontFamily: fontes.titulo, fontSize: 20 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        {!usuario ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Inicio" component={Abas} options={{ headerShown: false }} />
            <Stack.Screen name="NovoEvento" component={NovoEventoScreen} options={{ title: 'Novo compromisso' }} />
            <Stack.Screen name="EscolherLocal" component={EscolherLocalScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Detalhe" component={DetalheScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontesProntas] = useFonts({ Fraunces_600SemiBold, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold });

  if (!fontesProntas) return <View style={{ flex: 1, backgroundColor: cores.fundo }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <EventosProvider>
          <Rotas />
        </EventosProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
