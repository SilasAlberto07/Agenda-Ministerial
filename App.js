import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Notifications } from './src/services/notificacoes';
import { registrarServiceWorker, renovarInscricao, ouvirToqueNoAviso } from './src/services/pushWeb';
import { registrarAparelhoParaAvisos } from './src/services/pushNativo';
import { prepararNotificacoes } from './src/services/lembretes';
import { useFonts, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { EventosProvider } from './src/services/EventosContext';
import { AcessoProvider, useAcesso } from './src/services/AcessoContext';
import { Icone } from './src/components/icones';
import { cores, fontes } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import AgendaScreen from './src/screens/AgendaScreen';
import NovoEventoScreen from './src/screens/NovoEventoScreen';
import EscolherLocalScreen from './src/screens/EscolherLocalScreen';
import MapaScreen from './src/screens/MapaScreen';
import DetalheScreen from './src/screens/DetalheScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import AcessoScreen from './src/screens/AcessoScreen';
import PainelAcessosScreen from './src/screens/PainelAcessosScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const navRef = createNavigationContainerRef();

registrarServiceWorker();

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
            nome={{ Agenda: 'calendar-outline', Mapa: 'map-outline', 'Histórico': 'time-outline', Perfil: 'person-outline' }[route.name]}
          />
        ),
      })}
    >
      <Tabs.Screen name="Agenda" component={AgendaScreen} />
      <Tabs.Screen name="Mapa" component={MapaScreen} />
      <Tabs.Screen name="Histórico" component={HistoricoScreen} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} />
    </Tabs.Navigator>
  );
}

function Rotas() {
  const { usuario, carregando } = useAuth();
  const { estado, admin } = useAcesso();
  const pendente = useRef(null);

  // Destino de um aviso tocado: o compromisso ou uma tela (ex.: painel de acessos)
  const irPara = (destino) => {
    try {
      if (destino.tela) navRef.navigate(destino.tela);
      else navRef.navigate('Detalhe', { id: destino.id });
    } catch {}
  };
  // Abre o destino agora, ou assim que a navegação estiver pronta
  const abrirAviso = (destino) => {
    if (!destino?.id && !destino?.tela) return;
    if (navRef.isReady() && usuario) irPara(destino);
    else pendente.current = destino;
  };
  const abrirDetalhe = (id) => abrirAviso({ id });

  // Ao tocar no aviso (lembrete, compromisso novo, cliente aguardando), abre o destino
  useEffect(() => {
    if (!Notifications || !usuario) return;
    const abrir = (resp) => {
      const d = resp?.notification?.request?.content?.data || {};
      abrirAviso({ id: d.eventoId, tela: d.tela });
    };
    abrir(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(abrir);
    return () => sub.remove();
  }, [usuario]);

  // Versão web: toque no aviso e manutenção da inscrição deste aparelho
  useEffect(() => {
    if (!usuario || estado !== 'ok') return;
    renovarInscricao(usuario.uid);
    // App instalado: registra este aparelho para receber os avisos do servidor
    prepararNotificacoes()
      .catch(() => {})
      .then(() => registrarAparelhoParaAvisos(usuario.uid));
    return ouvirToqueNoAviso(abrirAviso);
  }, [usuario, estado]);

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.vinho} />
      </View>
    );
  }

  // Conta ainda não liberada, bloqueada ou no limite de aparelhos: mostra a tela de acesso
  if (usuario && estado !== 'ok') return <AcessoScreen />;

  return (
    <NavigationContainer
      ref={navRef}
      theme={tema}
      documentTitle={{ formatter: () => 'Agenda Ministerial' }}
      onReady={() => {
        if (pendente.current && usuario) {
          irPara(pendente.current);
          pendente.current = null;
        }
      }}
    >
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
            {admin && (
              <Stack.Screen name="PainelAcessos" component={PainelAcessosScreen} options={{ title: 'Acessos' }} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontesProntas, erroFontes] = useFonts({ Fraunces_600SemiBold, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold });

  // Se alguma fonte falhar, o app abre mesmo assim (com a fonte padrão do aparelho)
  if (!fontesProntas && !erroFontes) return <View style={{ flex: 1, backgroundColor: cores.fundo }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <AcessoProvider>
          <EventosProvider>
            <Rotas />
          </EventosProvider>
        </AcessoProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
