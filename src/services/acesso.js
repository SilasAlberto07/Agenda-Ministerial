import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from '../firebase';

// Cada pessoa tem um documento acessos/{uid}:
// { liberado, bloqueado, limiteAparelhos, aparelhos: { id: { nome, plataforma, desde, ultimoUso } }, email, nome, criadoEm }
// Só o administrador libera, bloqueia, muda o limite ou remove aparelhos (as regras do Firebase garantem isso).

export const LIMITE_PADRAO = 2;
const CHAVE_APARELHO = 'agenda:aparelhoId';

// Identificador deste aparelho (deste app instalado). Fica salvo no próprio aparelho.
export async function idDoAparelho() {
  let id = await AsyncStorage.getItem(CHAVE_APARELHO).catch(() => null);
  if (!id) {
    id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(CHAVE_APARELHO, id).catch(() => {});
  }
  return id;
}

export function nomeDoAparelho() {
  if (Platform.OS === 'web') {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const sistema = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Computador Windows' : 'Navegador';
    return `${sistema} (navegador)`;
  }
  return Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android');
}

const refAcesso = (uid) => doc(db, 'acessos', uid);

// Pedido de acesso, feito ao criar a conta (ou ao entrar com uma conta sem pedido)
export function pedirAcesso(usuario, nome) {
  return setDoc(refAcesso(usuario.uid), {
    liberado: false,
    limiteAparelhos: LIMITE_PADRAO,
    aparelhos: {},
    email: usuario.email || '',
    nome: (nome || usuario.displayName || '').trim(),
    criadoEm: serverTimestamp(),
  });
}

export function ouvirAcesso(uid, aoMudar, aoErrar) {
  return onSnapshot(
    refAcesso(uid),
    // doCache: veio da memória do aparelho (sem confirmação do servidor, ex.: sem internet)
    { includeMetadataChanges: true },
    (snap) => aoMudar(snap.exists() ? snap.data() : null, { doCache: snap.metadata.fromCache }),
    aoErrar
  );
}

// Registra este aparelho na conta (se couber no limite) e atualiza o "último uso" uma vez por dia
export async function registrarAparelho(uid, acesso, aparelhoId) {
  const aparelhos = acesso.aparelhos || {};
  const atual = aparelhos[aparelhoId];
  if (atual) {
    // Enquanto o horário do servidor não chega, ultimoUso vem vazio: conta como agora
    const ultimo = atual.ultimoUso?.toMillis ? atual.ultimoUso.toMillis() : Date.now();
    if (Date.now() - ultimo > 24 * 3600000) {
      await updateDoc(refAcesso(uid), { [`aparelhos.${aparelhoId}.ultimoUso`]: serverTimestamp() }).catch(() => {});
    }
    return true;
  }
  if (Object.keys(aparelhos).length >= (acesso.limiteAparelhos ?? LIMITE_PADRAO)) return false;
  await updateDoc(refAcesso(uid), {
    [`aparelhos.${aparelhoId}`]: {
      nome: nomeDoAparelho(),
      plataforma: Platform.OS,
      desde: serverTimestamp(),
      ultimoUso: serverTimestamp(),
    },
  });
  return true;
}

// ---- Administrador -------------------------------------------------------------

export function ouvirTodosAcessos(aoMudar, aoErrar) {
  return onSnapshot(
    collection(db, 'acessos'),
    (snap) => aoMudar(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
    aoErrar
  );
}

export const liberarAcesso = (uid) =>
  updateDoc(refAcesso(uid), { liberado: true, bloqueado: false, liberadoEm: serverTimestamp() });

export const bloquearAcesso = (uid) => updateDoc(refAcesso(uid), { liberado: false, bloqueado: true });

export const mudarLimite = (uid, limite) =>
  updateDoc(refAcesso(uid), { limiteAparelhos: Math.max(1, Math.min(20, limite)) });

// Excluir conta: bloqueia na hora e marca para o robô (GitHub Actions) apagar
// o login e todos os dados em alguns minutos (só o servidor pode apagar o login de outra pessoa).
export const excluirConta = (uid) =>
  updateDoc(refAcesso(uid), { liberado: false, bloqueado: true, excluir: true, excluirPedidoEm: serverTimestamp() });

export const removerAparelho = (uid, aparelhoId) =>
  updateDoc(refAcesso(uid), { [`aparelhos.${aparelhoId}`]: deleteField() });
