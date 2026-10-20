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

// Retorna { ok, token } ou { ok: false, motivo } (o motivo aparece no teste do Perfil)
export async function registrarAparelhoParaAvisos(uid) {
  if (!notificacoesDisponiveis) return { ok: false, motivo: 'Notificações indisponíveis neste app.' };
  if (!projectId) return { ok: false, motivo: 'App sem o código do projeto do Expo.' };
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return { ok: false, motivo: 'As notificações do app não estão permitidas.' };
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return { ok: false, motivo: 'O aparelho não devolveu o código de avisos.' };
    const aparelhoId = await idDoAparelho();
    await setDoc(
      doc(db, 'users', uid, 'inscricoes', `app-${aparelhoId}`),
      { tipo: 'expo', token, aparelhoId, plataforma: Platform.OS, atualizadoEm: serverTimestamp() },
      { merge: true }
    );
    return { ok: true, token };
  } catch (e) {
    console.log('Avisos do servidor indisponíveis neste aparelho:', e?.message || e);
    return { ok: false, motivo: String(e?.message || e) };
  }
}

// Teste completo: registra este aparelho e pede ao serviço de avisos para mandar um aviso para ele mesmo
export async function testarAvisoDoServidor(uid) {
  const r = await registrarAparelhoParaAvisos(uid);
  if (!r.ok) return r;
  try {
    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: r.token,
        title: 'Agenda Ministerial',
        body: 'Avisos do servidor funcionando neste aparelho!',
        sound: 'default',
        channelId: 'lembretes',
        priority: 'high',
      }),
    });
    const json = await resp.json();
    const t = Array.isArray(json.data) ? json.data[0] : json.data;
    if (t?.status === 'ok') return { ok: true };
    return { ok: false, motivo: t?.details?.error || t?.message || json.errors?.[0]?.message || 'Resposta inesperada.' };
  } catch (e) {
    return { ok: false, motivo: String(e?.message || e) };
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
