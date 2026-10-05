// Robô de lembretes da Agenda Ministerial
// Roda a cada 5 minutos no GitHub Actions. Para cada compromisso, vê se chegou a hora
// de algum lembrete (1 dia antes, 2h antes...) e envia o aviso para os aparelhos da
// versão web (iPhone pela tela inicial). O app Android (APK) agenda os próprios avisos.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import webpush from 'web-push';

// ---- Configuração (vem dos "secrets" do GitHub) -----------------------------
const { FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SIMULAR } = process.env;
for (const [nome, valor] of Object.entries({ FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY })) {
  if (!valor) {
    console.error(`Falta o secret ${nome}. Veja o LEIA-ME, seção "Avisos no iPhone".`);
    process.exit(1);
  }
}

initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:agenda@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// O GitHub Actions pode atrasar. Um lembrete atrasado até este limite ainda é enviado;
// depois disso é descartado (não adianta avisar "2h antes" quando o culto já começou).
const TOLERANCIA_MIN = 90;
const MAIOR_LEMBRETE_MIN = 1440; // "1 dia antes"

// ---- Textos ------------------------------------------------------------------
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const FUSO = process.env.FUSO_HORARIO || 'America/Cuiaba';

function horaLocal(data) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' })
    .format(data)
    .replace(':', 'h');
}
function diaLocal(data) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: 'numeric', month: 'numeric' })
      .formatToParts(data)
      .map((x) => [x.type, x.value])
  );
  return `${p.day} ${MESES[Number(p.month) - 1]}`;
}
function quantoFalta(min) {
  if (min >= 1440) return min === 1440 ? 'amanhã' : `em ${Math.round(min / 1440)} dias`;
  if (min >= 60) {
    const h = Math.round(min / 60);
    return `em ${h} hora${h > 1 ? 's' : ''}`;
  }
  return `em ${min} minutos`;
}

// ---- Envio ---------------------------------------------------------------------
async function enviarPara(inscricoes, mensagem) {
  let enviados = 0;
  for (const insc of inscricoes) {
    const { endpoint, keys } = insc.data();
    if (SIMULAR) {
      console.log(`  [simulação] enviaria para ${endpoint.slice(0, 40)}…`);
      enviados++;
      continue;
    }
    try {
      await webpush.sendNotification({ endpoint, keys }, JSON.stringify(mensagem), { TTL: 3600, urgency: 'high' });
      enviados++;
    } catch (e) {
      // 404/410: o aparelho cancelou ou desinstalou; apaga a inscrição
      if (e.statusCode === 404 || e.statusCode === 410) {
        await insc.ref.delete();
        console.log('  inscrição expirada removida');
      } else {
        console.warn('  falha ao enviar:', e.statusCode || '', e.body || e.message);
      }
    }
  }
  return enviados;
}

async function main() {
  const agora = Date.now();
  const ate = Timestamp.fromMillis(agora + (MAIOR_LEMBRETE_MIN + 5) * 60000);
  const desde = Timestamp.fromMillis(agora);
  let totalAvisos = 0;

  const usuarios = await db.collection('users').listDocuments();
  for (const usuario of usuarios) {
    const inscricoes = (await usuario.collection('inscricoes').get()).docs;
    if (!inscricoes.length) continue; // ninguém da versão web nesta conta

    const eventos = await usuario.collection('eventos').where('data', '>=', desde).where('data', '<=', ate).get();
    for (const ev of eventos.docs) {
      const e = ev.data();
      const data = e.data.toDate();
      const jaEnviados = new Set(e.lembretesEnviados || []);

      for (const minutos of e.lembretes || []) {
        const quando = data.getTime() - minutos * 60000;
        // A chave inclui o horário: se o compromisso mudar de hora, o aviso volta a valer
        const chave = `${minutos}@${data.getTime()}`;
        if (jaEnviados.has(chave)) continue;
        if (quando > agora) continue; // ainda não é hora
        if (agora - quando > TOLERANCIA_MIN * 60000) continue; // passou do ponto

        const mensagem = {
          title: `${e.tipo || 'Compromisso'} ${quantoFalta(minutos)}: ${e.nome}`,
          body: `${diaLocal(data)} às ${horaLocal(data)}${e.local?.endereco ? ' · ' + e.local.endereco : ''}`,
          eventoId: ev.id,
          tag: `${ev.id}-${minutos}`,
        };
        console.log(`Lembrete: "${mensagem.title}" (conta ${usuario.id.slice(0, 6)}…)`);
        const n = await enviarPara(inscricoes, mensagem);
        totalAvisos += n;
        if (!SIMULAR) await ev.ref.update({ lembretesEnviados: FieldValue.arrayUnion(chave) });
      }
    }
  }
  console.log(`Pronto. ${totalAvisos} aviso(s) enviado(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
