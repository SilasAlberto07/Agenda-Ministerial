import AsyncStorage from '@react-native-async-storage/async-storage';

// Cópia da agenda guardada no aparelho, para abrir e consultar sem internet.
// Cada conta tem a própria cópia. Funciona no app (Android) e na versão web.

const chaveEventos = (uid) => `agenda:cache:eventos:${uid}`;
const chaveAcesso = (uid) => `agenda:cache:acesso:${uid}`;

export async function salvarEventosLocal(uid, eventos) {
  try {
    // Horários do servidor (criadoEm/atualizadoEm) não são guardados: só servem no Firestore
    const lista = eventos.map(({ criadoEm, atualizadoEm, ...e }) => ({ ...e, data: e.data.getTime() }));
    await AsyncStorage.setItem(chaveEventos(uid), JSON.stringify({ salvoEm: Date.now(), lista }));
  } catch {}
}

// Retorna { lista, salvoEm } ou null
export async function lerEventosLocal(uid) {
  try {
    const bruto = await AsyncStorage.getItem(chaveEventos(uid));
    if (!bruto) return null;
    const { salvoEm, lista } = JSON.parse(bruto);
    return {
      salvoEm,
      lista: (lista || [])
        // Campos com horário do servidor viram texto ao salvar; só a data importa aqui
        .map((e) => ({ ...e, data: new Date(e.data) }))
        .filter((e) => !isNaN(e.data)),
    };
  } catch {
    return null;
  }
}

// Lembra que esta conta já foi liberada neste aparelho (para abrir sem internet)
export async function salvarAcessoLocal(uid, liberado) {
  try {
    if (liberado) await AsyncStorage.setItem(chaveAcesso(uid), '1');
    else await AsyncStorage.removeItem(chaveAcesso(uid));
  } catch {}
}

export async function acessoLocalLiberado(uid) {
  try {
    return (await AsyncStorage.getItem(chaveAcesso(uid))) === '1';
  } catch {
    return false;
  }
}

export async function limparCacheLocal(uid) {
  try {
    await AsyncStorage.multiRemove([chaveEventos(uid), chaveAcesso(uid)]);
  } catch {}
}
