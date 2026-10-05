import { Platform } from 'react-native';
import { Notifications, notificacoesDisponiveis } from './notificacoes';
import { hora, quantoFalta } from '../utils/datas';

const CANAL = 'lembretes';

// Mostra o aviso mesmo com o app aberto
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pede permissão e cria o canal no Android. Retorna true se puder notificar.
export async function prepararNotificacoes() {
  if (!notificacoesDisponiveis) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Lembretes da agenda',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6E1A37',
    });
  }
  const atual = await Notifications.getPermissionsAsync();
  if (atual.status === 'granted') return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.status === 'granted';
}

// Assinatura muda sempre que algo relevante do evento muda; assim reagendamos só o necessário
const assinatura = (ev, minutos) =>
  [ev.id, ev.data.getTime(), minutos, ev.nome, ev.local?.endereco || ''].join('|');

/**
 * Deixa os lembretes agendados no aparelho iguais aos compromissos salvos.
 * Funciona em qualquer celular onde a pessoa fizer login: os compromissos vêm
 * do Firebase e os avisos são agendados localmente.
 */
export async function sincronizarLembretes(eventos) {
  if (!notificacoesDisponiveis) return;
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== 'granted') return;

  const agora = Date.now();
  const desejados = new Map();
  for (const ev of eventos) {
    for (const minutos of ev.lembretes || []) {
      const quando = ev.data.getTime() - minutos * 60000;
      if (quando > agora + 5000) desejados.set(assinatura(ev, minutos), { ev, minutos, quando });
    }
  }

  const agendados = await Notifications.getAllScheduledNotificationsAsync();
  const existentes = new Set();
  for (const n of agendados) {
    const ass = n.content.data?.assinatura;
    if (!ass) continue;
    if (desejados.has(ass)) existentes.add(ass);
    else await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }

  for (const [ass, { ev, minutos, quando }] of desejados) {
    if (existentes.has(ass)) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${ev.tipo} ${quantoFalta(minutos)}: ${ev.nome}`,
        body: `Às ${hora(ev.data)}${ev.local?.endereco ? ' · ' + ev.local.endereco : ''}. Toque para ver o local e a rota.`,
        data: { eventoId: ev.id, assinatura: ass },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(quando),
        channelId: CANAL,
      },
    });
  }
}

export async function cancelarTodosLembretes() {
  if (!notificacoesDisponiveis) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
