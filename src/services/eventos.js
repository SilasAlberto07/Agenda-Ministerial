import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// Cada usuário tem a própria coleção: users/{uid}/eventos
const colecao = (uid) => collection(db, 'users', uid, 'eventos');

function deFirestore(snap) {
  const d = snap.data();
  return { ...d, id: snap.id, data: d.data?.toDate ? d.data.toDate() : new Date(d.data) };
}

function paraFirestore(evento) {
  const { id, ...resto } = evento;
  return { ...resto, data: Timestamp.fromDate(evento.data) };
}

// Escuta os compromissos do usuário em tempo real (ordenados por data)
export function ouvirEventos(uid, aoMudar, aoErrar) {
  const q = query(colecao(uid), orderBy('data', 'asc'));
  return onSnapshot(q, (snap) => aoMudar(snap.docs.map(deFirestore)), aoErrar);
}

export function criarEvento(uid, evento) {
  return addDoc(colecao(uid), { ...paraFirestore(evento), criadoEm: serverTimestamp() });
}

export function atualizarEvento(uid, evento) {
  return updateDoc(doc(db, 'users', uid, 'eventos', evento.id), {
    ...paraFirestore(evento),
    atualizadoEm: serverTimestamp(),
  });
}

export function excluirEvento(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'eventos', id));
}
