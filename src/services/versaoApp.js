import { Platform } from 'react-native';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Aviso de "Nova versão do app" (APK novo) dentro do próprio app.
// config/app: { versaoCodigo, link, publicadoEm }
// Cada APK gerado recebe um número maior (o Expo soma 1 a cada build).
// O administrador instala o APK novo no próprio celular e, no Painel de acessos,
// toca em "Avisar todos": quem estiver com número menor vê o aviso com o botão Baixar.

const refConfig = () => doc(db, 'config', 'app');

// Número deste APK. APKs antigos não têm o módulo que informa isso: contam como 0.
export function versaoDoAparelho() {
  if (Platform.OS === 'web') return null;
  try {
    const n = Number(require('expo-application').nativeBuildVersion);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function ouvirVersaoPublicada(aoMudar) {
  return onSnapshot(
    refConfig(),
    (snap) => aoMudar(snap.exists() ? snap.data() : null),
    () => aoMudar(null)
  );
}

export const publicarVersao = (versaoCodigo, link) =>
  setDoc(refConfig(), { versaoCodigo, link: link.trim(), publicadoEm: serverTimestamp() }, { merge: true });

// Link de instalação do Expo (página do build) ou link direto do .apk
export const linkValido = (t) => /^https:\/\/(expo\.dev|[a-z0-9.-]*expo\.dev|[^\s]+\.apk)/i.test(String(t || '').trim());
