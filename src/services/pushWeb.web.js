import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Avisos da versão web (iPhone pela tela inicial, Android pelo navegador, computador).
// Quem envia os avisos é o robô de lembretes no GitHub Actions.
const VAPID = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

export const ehIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
export const instaladoNaTela = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const suportaPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker:', e));
}

/**
 * 'sem-chave'   app publicado sem a chave VAPID
 * 'instalar'    iPhone/iPad fora da tela inicial (o iOS só permite avisos no app instalado)
 * 'sem-suporte' navegador sem notificações
 * 'negado'      a pessoa bloqueou os avisos
 * 'ativo'       avisos ligados neste aparelho
 * 'desativado'  pode ativar
 */
export async function estadoAvisos() {
  if (!VAPID) return 'sem-chave';
  if (ehIOS() && !instaladoNaTela()) return 'instalar';
  if (!suportaPush()) return 'sem-suporte';
  if (Notification.permission === 'denied') return 'negado';
  if (Notification.permission !== 'granted') return 'desativado';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'ativo' : 'desativado';
}

function chaveParaBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function idDaInscricao(endpoint) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(hash)).slice(0, 20).map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function salvar(uid, sub) {
  const j = sub.toJSON();
  await setDoc(
    doc(db, 'users', uid, 'inscricoes', await idDaInscricao(j.endpoint)),
    { endpoint: j.endpoint, keys: j.keys, aparelho: navigator.userAgent.slice(0, 150), atualizadoEm: serverTimestamp() },
    { merge: true }
  );
}

// Precisa ser chamado a partir de um toque (exigência do iPhone)
export async function ativarAvisos(uid) {
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error('negado');
  await navigator.serviceWorker.register('/sw.js');
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(VAPID) }));
  await salvar(uid, sub);
}

// Mantém a inscrição deste aparelho salva (roda ao abrir o app)
export async function renovarInscricao(uid) {
  try {
    if ((await estadoAvisos()) !== 'ativo') return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await salvar(uid, sub);
  } catch (e) {
    console.warn('Avisos:', e);
  }
}

// Ao sair da conta, este aparelho para de receber os avisos
export async function desativarAvisos(uid) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await deleteDoc(doc(db, 'users', uid, 'inscricoes', await idDaInscricao(sub.endpoint))).catch(() => {});
    await sub.unsubscribe();
  } catch (e) {
    console.warn('Avisos:', e);
  }
}

// Abre o compromisso quando a pessoa toca no aviso
export function ouvirToqueNoAviso(abrir) {
  const id = new URLSearchParams(window.location.search).get('evento');
  if (id) {
    abrir(id);
    window.history.replaceState(null, '', '/');
  }
  if (!('serviceWorker' in navigator)) return () => {};
  const ouvir = (e) => e.data?.abrirEvento && abrir(e.data.abrirEvento);
  navigator.serviceWorker.addEventListener('message', ouvir);
  return () => navigator.serviceWorker.removeEventListener('message', ouvir);
}
