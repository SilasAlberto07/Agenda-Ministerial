// Robô de lembretes da Agenda Ministerial
// Roda a cada 5 minutos no GitHub Actions. Para cada compromisso, vê se chegou a hora
// de algum lembrete (1 dia antes, 2h antes...) e envia o aviso para os aparelhos da
// versão web (iPhone pela tela inicial). O app Android (APK) agenda os próprios avisos.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import webpush from 'web-push';

// ---- Configuração (vem dos "secrets" do GitHub) -----------------------------
const { FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SIMULAR } = process.env;
for (const [nome, valor] of Object.entries({ FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY })) {
  if (!valor) {
    // Sem as chaves o robô só avisa e encerra sem erro (para não gerar e-mails de falha)
    console.warn(`Robô ainda não configurado: falta o secret ${nome}. Veja o LEIA-ME, seção 6.3.`);
    process.exit(0);
  }
}

// Lê a chave do Firebase: o conteúdo do arquivo .json (ou o mesmo conteúdo em base64).
// Nunca mostra o valor no log, só diz o que está errado.
function lerContaDeServico(texto) {
  const limpo = texto.trim().replace(/^﻿/, '');
  const tentativas = [limpo, Buffer.from(limpo, 'base64').toString('utf8').trim()];
  for (const t of tentativas) {
    try {
      const conta = JSON.parse(t);
      if (conta && typeof conta === 'object' && conta.private_key && conta.client_email) return conta;
    } catch {}
  }
  console.error(
    'O secret FIREBASE_SERVICE_ACCOUNT não tem o arquivo .json da conta de serviço.\n' +
      'Ele precisa ser o conteúdo INTEIRO do arquivo baixado em Firebase → Configurações do projeto →\n' +
      'Contas de serviço → Gerar nova chave privada (começa com { e termina com }). Veja o LEIA-ME, seção 6.3.\n' +
      `(o valor cadastrado tem ${limpo.length} caracteres e começa com "${limpo.slice(0, 1)}")`
  );
  process.exit(1);
}

initializeApp({ credential: cert(lerContaDeServico(FIREBASE_SERVICE_ACCOUNT)) });
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
// Cada aparelho inscrito é de um tipo:
//  'web'  → navegador / iPhone pela tela inicial (Web Push, chaves VAPID)
//  'expo' → app instalado (APK) com avisos do servidor (serviço de avisos do Expo)
const ehExpo = (d) => d.tipo === 'expo' && d.token;
const ehWeb = (d) => !!d.endpoint;

async function enviarExpo(lista) {
  // lista: [{ insc, mensagem }]
  for (let i = 0; i < lista.length; i += 100) {
    const lote = lista.slice(i, i + 100);
    const corpo = lote.map(({ insc, mensagem }) => ({
      to: insc.data().token,
      title: mensagem.title,
      body: mensagem.body,
      data: { eventoId: mensagem.eventoId || '', tela: mensagem.tela || '' },
      sound: 'default',
      channelId: 'lembretes',
      priority: 'high',
    }));
    try {
      const r = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const json = await r.json();
      const tickets = json.data || [];
      for (let j = 0; j < tickets.length; j++) {
        const t = tickets[j];
        if (t.status === 'error') {
          if (t.details?.error === 'DeviceNotRegistered') {
            await lote[j].insc.ref.delete();
            console.log('  aparelho (app) desinstalado: inscrição removida');
          } else {
            console.warn('  falha ao enviar (app):', t.details?.error || t.message);
          }
        }
      }
    } catch (e) {
      console.warn('  falha ao falar com o serviço de avisos do Expo:', e.message || e);
    }
  }
}

/**
 * Envia a mensagem para os aparelhos inscritos.
 * somenteWeb: lembretes de horário (o app instalado já agenda os próprios lembretes)
 * excetoAparelho: não manda para o aparelho que cadastrou o compromisso
 */
async function enviarPara(inscricoes, mensagem, { somenteWeb = false, excetoAparelho = '' } = {}) {
  let enviados = 0;
  const paraExpo = [];
  for (const insc of inscricoes) {
    const d = insc.data();
    if (excetoAparelho && d.aparelhoId === excetoAparelho) continue;
    if (SIMULAR) {
      console.log(`  [simulação] enviaria para um aparelho ${ehExpo(d) ? 'app' : 'web'}`);
      enviados++;
      continue;
    }
    if (ehExpo(d)) {
      if (!somenteWeb) {
        paraExpo.push({ insc, mensagem });
        enviados++;
      }
      continue;
    }
    if (!ehWeb(d)) continue;
    try {
      await webpush.sendNotification({ endpoint: d.endpoint, keys: d.keys }, JSON.stringify(mensagem), {
        TTL: 3600,
        urgency: 'high',
      });
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
  if (paraExpo.length) await enviarExpo(paraExpo);
  return enviados;
}

// Contas marcadas para exclusão no Painel de acessos: apaga o login e todos os dados
async function excluirContasMarcadas() {
  const marcadas = await db.collection('acessos').where('excluir', '==', true).get();
  for (const doc of marcadas.docs) {
    const uid = doc.id;
    try {
      await db.recursiveDelete(db.doc(`users/${uid}`));
      await getAuth()
        .deleteUser(uid)
        .catch((e) => {
          if (e.code !== 'auth/user-not-found') throw e;
        });
      // Fica só uma marca de "excluída" (sem nome nem e-mail), para o app não pedir acesso de novo
      await doc.ref.set({ excluido: true, liberado: false, bloqueado: true, limiteAparelhos: 0, aparelhos: {}, excluidoEm: FieldValue.serverTimestamp() });
      console.log(`Conta excluída (${uid.slice(0, 6)}…)`);
    } catch (e) {
      console.warn(`Não foi possível excluir a conta ${uid.slice(0, 6)}…:`, e.message || e);
    }
  }
}

// Contas sem pedido de acesso (ex.: criadas por uma versão antiga do app):
// cria o pedido "aguardando liberação" para aparecerem no Painel de acessos.
async function criarPedidosFaltando() {
  const admins = [];
  const existentes = new Set((await db.collection('acessos').select().get()).docs.map((d) => d.id));
  let pagina;
  let criados = 0;
  do {
    const r = await getAuth().listUsers(1000, pagina);
    for (const u of r.users) {
      if (u.customClaims?.admin) admins.push(u.uid);
      if (existentes.has(u.uid)) continue;
      const ref = db.doc(`acessos/${u.uid}`);
      const criado = await ref
        .create({
          liberado: false,
          limiteAparelhos: 2,
          aparelhos: {},
          email: u.email || '',
          nome: u.displayName || '',
          criadoEm: FieldValue.serverTimestamp(),
        })
        .then(() => true)
        .catch(() => false); // já existe: não mexe
      if (criado) criados++;
    }
    pagina = r.pageToken;
  } while (pagina);
  if (criados) console.log(`${criados} pedido(s) de acesso criado(s) para contas novas.`);
  return admins;
}

// Avisa o administrador quando um cliente novo fica aguardando liberação (uma vez por cliente)
async function avisarAdminPedidosNovos(admins) {
  if (!admins.length) return;
  const pendentes = (await db.collection('acessos').where('liberado', '==', false).get()).docs.filter((d) => {
    const a = d.data();
    return !a.bloqueado && !a.excluido && !a.excluir && !a.avisadoAdmin;
  });
  if (!pendentes.length) return;
  const inscricoesAdmin = [];
  for (const uid of admins) inscricoesAdmin.push(...(await db.collection(`users/${uid}/inscricoes`).get()).docs);
  for (const p of pendentes) {
    const a = p.data();
    const quem = [a.nome, a.email].filter(Boolean).join(' · ') || 'Conta nova';
    const n = inscricoesAdmin.length
      ? await enviarPara(inscricoesAdmin, {
          title: 'Novo cliente aguardando liberação',
          body: quem,
          tela: 'PainelAcessos',
          tag: `pedido-${p.id}`,
        })
      : 0;
    if (!SIMULAR) await p.ref.update({ avisadoAdmin: true });
    console.log(`Pedido novo avisado ao administrador (${n} aparelho(s)).`);
  }
}

// Compromisso novo: avisa os outros aparelhos da mesma conta (uma vez por compromisso)
async function avisarCompromissosNovos(usuario, inscricoes) {
  const novos = await usuario.collection('eventos').where('novo', '==', true).get();
  let total = 0;
  for (const ev of novos.docs) {
    const e = ev.data();
    // Cadastrado há mais de 6 horas (ex.: conta que ainda não tinha aparelho inscrito): só desmarca
    const criado = e.criadoEm?.toMillis ? e.criadoEm.toMillis() : Date.now();
    if (Date.now() - criado > 6 * 3600000) {
      if (!SIMULAR) await ev.ref.update({ novo: false });
      continue;
    }
    const data = e.data?.toDate ? e.data.toDate() : null;
    const quando = data ? ` · ${diaLocal(data)} às ${horaLocal(data)}` : '';
    total += await enviarPara(
      inscricoes,
      {
        title: 'Novo compromisso na agenda',
        body: `${e.tipo || 'Compromisso'}: ${e.nome || ''}${quando}`,
        eventoId: ev.id,
        tag: `novo-${ev.id}`,
      },
      { excetoAparelho: e.criadoPorAparelho || '' }
    );
    if (!SIMULAR) await ev.ref.update({ novo: false });
  }
  if (novos.size) console.log(`Compromisso(s) novo(s): ${novos.size}, avisos enviados: ${total}.`);
  return total;
}

async function main() {
  await excluirContasMarcadas().catch((e) => console.warn('Exclusão de contas:', e.message || e));
  const admins = await criarPedidosFaltando().catch((e) => {
    console.warn('Pedidos de acesso:', e.message || e);
    return [];
  });
  await avisarAdminPedidosNovos(admins).catch((e) => console.warn('Aviso ao administrador:', e.message || e));
  const agora = Date.now();
  const ate = Timestamp.fromMillis(agora + (MAIOR_LEMBRETE_MIN + 5) * 60000);
  const desde = Timestamp.fromMillis(agora);
  let totalAvisos = 0;

  const usuarios = await db.collection('users').listDocuments();
  for (const usuario of usuarios) {
    const inscricoes = (await usuario.collection('inscricoes').get()).docs;
    if (!inscricoes.length) continue; // nenhum aparelho inscrito para avisos nesta conta
    // Conta sem acesso liberado (não pagou ou foi bloqueada) não recebe avisos.
    // Contas de antes do controle de acesso (sem documento) continuam recebendo.
    const acesso = await db.doc(`acessos/${usuario.id}`).get();
    if (acesso.exists && acesso.data().liberado !== true) continue;

    totalAvisos += await avisarCompromissosNovos(usuario, inscricoes).catch((e) => {
      console.warn('Compromissos novos:', e.message || e);
      return 0;
    });

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
        // Lembretes de horário só vão para a versão web; o app instalado agenda os próprios
        const n = await enviarPara(inscricoes, mensagem, { somenteWeb: true });
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
