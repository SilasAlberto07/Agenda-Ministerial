import { Platform } from 'react-native';
import { doc, setDoc, updateDoc, onSnapshot, serverTimestamp, deleteField } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase';

// Perfil da conta: nome e foto. Fica em users/{uid}/perfil/dados, então aparece
// igual em todos os aparelhos da conta (ex.: a dupla que divide o mesmo login).
// A foto é reduzida para 320x320 e guardada como texto (JPEG), sem precisar de
// um serviço de arquivos pago.

const refPerfil = (uid) => doc(db, 'users', uid, 'perfil', 'dados');
const chaveCache = (uid) => `agenda:cache:perfil:${uid}`;

export function ouvirPerfil(uid, aoMudar) {
  return onSnapshot(
    refPerfil(uid),
    (snap) => {
      if (snap.metadata.fromCache && !snap.exists()) return; // sem internet: mantém a cópia do aparelho
      const dados = snap.exists() ? snap.data() : {};
      const perfil = { nome: dados.nome || '', foto: dados.foto || '' };
      aoMudar(perfil);
      AsyncStorage.setItem(chaveCache(uid), JSON.stringify(perfil)).catch(() => {});
    },
    () => {}
  );
}

export async function perfilSalvo(uid) {
  try {
    return JSON.parse((await AsyncStorage.getItem(chaveCache(uid))) || 'null');
  } catch {
    return null;
  }
}

export async function salvarNome(uid, nome) {
  const limpo = nome.trim().slice(0, 60);
  await setDoc(refPerfil(uid), { nome: limpo, atualizadoEm: serverTimestamp() }, { merge: true });
  if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: limpo }).catch(() => {});
  // Nome que aparece para o administrador no painel de acessos
  await updateDoc(doc(db, 'acessos', uid), { nome: limpo }).catch(() => {});
  return limpo;
}

// Os módulos de foto só existem no APK novo. Carregados só na hora, para quem ainda
// está no APK antigo receber as atualizações sem o app fechar (recebe um aviso).
function modulosDeFoto() {
  try {
    const ImagePicker = require('expo-image-picker');
    const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
    if (!ImagePicker?.launchImageLibraryAsync || !manipulateAsync) throw new Error();
    return { ImagePicker, manipulateAsync, SaveFormat };
  } catch {
    throw new Error('apk-antigo');
  }
}

// Abre a galeria, deixa recortar em quadrado e devolve a foto pronta (ou null se cancelar)
export async function escolherFoto() {
  const { ImagePicker, manipulateAsync, SaveFormat } = modulosDeFoto();
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('permissao');
  }
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  // Recorta o centro em quadrado (a web não tem a tela de recorte) e reduz
  const lado = Math.min(a.width || 0, a.height || 0);
  const acoes = [];
  if (lado && a.width !== a.height) {
    acoes.push({ crop: { originX: (a.width - lado) / 2, originY: (a.height - lado) / 2, width: lado, height: lado } });
  }
  acoes.push({ resize: { width: 320, height: 320 } });
  const pronta = await manipulateAsync(a.uri, acoes, { compress: 0.72, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${pronta.base64}`;
}

export const salvarFoto = (uid, foto) =>
  setDoc(refPerfil(uid), { foto, atualizadoEm: serverTimestamp() }, { merge: true });

export const removerFoto = (uid) =>
  setDoc(refPerfil(uid), { foto: deleteField(), atualizadoEm: serverTimestamp() }, { merge: true });
