import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Notifications, notificacoesDisponiveis } from './notificacoes';
import { idDoAparelho } from './acesso';

// Avisos enviados pelo servidor (robô) para o app instalado no Android/iPhone:
// "compromisso novo adicionado por outro aparelho" e "cliente aguardando liberação".
// Os lembretes de horário continuam sendo agendados no próprio aparelho (lembretes.js).
// Só funciona no APK gerado com o google-services.json (veja o LEIA-ME); nos APKs
// antigos o pedido do código falha em silêncio e nada muda.

const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

export async function registrarAparelhoParaAvisos(uid) {
  if (!notificacoesDisponiveis || !projectId) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;
    const aparelhoId = await idDoAparelho();
    await setDoc(
      doc(db, 'users', uid, 'inscricoes', `app-${aparelhoId}`),
      { tipo: 'expo', token, aparelhoId, plataforma: Platform.OS, atualizadoEm: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.log('Avisos do servidor indisponíveis neste aparelho:', e?.message || e);
  }
}

// Ao sair da conta, este aparelho para de receber os avisos do servidor
export async function removerAparelhoDosAvisos(uid) {
  if (!notificacoesDisponiveis) return;
  try {
    const aparelhoId = await idDoAparelho();
    await deleteDoc(doc(db, 'users', uid, 'inscricoes', `app-${aparelhoId}`));
  } catch {}
}
