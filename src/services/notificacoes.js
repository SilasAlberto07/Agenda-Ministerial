import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

// No Expo Go para Android, só carregar a biblioteca de notificações já derruba o app.
// Por isso ela só é carregada quando o app está instalado de verdade (APK / development build)
// ou no iPhone.
export const notificacoesDisponiveis =
  Platform.OS !== 'web' && !(Platform.OS === 'android' && isRunningInExpoGo());

export const Notifications = notificacoesDisponiveis ? require('expo-notifications') : null;
