// Configuração inicial do controle de acesso (roda uma vez, pelo GitHub Actions):
// 1. marca a conta ADMIN_EMAIL como administradora (vê o Painel de acessos)
// 2. libera as contas que já existem hoje (para ninguém que já usa ficar bloqueado)
// Pode rodar de novo sem problema: não desfaz liberações nem apaga aparelhos.

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const { FIREBASE_SERVICE_ACCOUNT, ADMIN_EMAIL, LIBERAR_EXISTENTES } = process.env;

function lerContaDeServico(texto) {
  const limpo = String(texto || '').trim().replace(/^﻿/, '');
  for (const t of [limpo, Buffer.from(limpo, 'base64').toString('utf8').trim()]) {
    try {
      const conta = JSON.parse(t);
      if (conta?.private_key && conta?.client_email) return conta;
    } catch {}
  }
  console.error('O secret FIREBASE_SERVICE_ACCOUNT não tem o arquivo .json da conta de serviço (veja o LEIA-ME, seção 6.3).');
  process.exit(1);
}

// O repositório é público: nos registros, os e-mails aparecem escondidos
const esconder = (email) => {
  const [u, d] = String(email || '').split('@');
  return d ? `${u.slice(0, 2)}***@${d}` : '(sem e-mail)';
};

if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes('@')) {
  console.error('Informe o e-mail da conta de administrador (o mesmo que você usa para entrar no app).');
  process.exit(1);
}

initializeApp({ credential: cert(lerContaDeServico(FIREBASE_SERVICE_ACCOUNT)) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  // 1) Administrador
  let admin;
  try {
    admin = await auth.getUserByEmail(ADMIN_EMAIL.trim());
  } catch {
    console.error(`Não existe conta no app com o e-mail ${esconder(ADMIN_EMAIL)}. Crie a conta no app primeiro (ou confira o e-mail).`);
    process.exit(1);
  }
  await auth.setCustomUserClaims(admin.uid, { ...(admin.customClaims || {}), admin: true });
  const refAdmin = db.doc(`acessos/${admin.uid}`);
  const atualAdmin = (await refAdmin.get()).data() || {};
  await refAdmin.set(
    {
      liberado: true,
      bloqueado: false,
      limiteAparelhos: Math.max(atualAdmin.limiteAparelhos || 0, 10),
      aparelhos: atualAdmin.aparelhos || {},
      email: admin.email || '',
      nome: atualAdmin.nome || admin.displayName || '',
      liberadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Administrador: ${esconder(admin.email)} (até 10 aparelhos).`);

  // 2) Contas que já existem
  if (LIBERAR_EXISTENTES === 'false') {
    console.log('Contas existentes: não alteradas (opção desmarcada).');
    return;
  }
  let liberadas = 0;
  let jaEstavam = 0;
  let pagina;
  do {
    const r = await auth.listUsers(1000, pagina);
    for (const u of r.users) {
      if (u.uid === admin.uid) continue;
      const ref = db.doc(`acessos/${u.uid}`);
      const atual = (await ref.get()).data();
      if (atual?.liberado || atual?.bloqueado) {
        jaEstavam++;
        continue;
      }
      await ref.set(
        {
          liberado: true,
          bloqueado: false,
          limiteAparelhos: atual?.limiteAparelhos || 3,
          aparelhos: atual?.aparelhos || {},
          email: u.email || '',
          nome: atual?.nome || u.displayName || '',
          liberadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      liberadas++;
      console.log(`Liberada: ${esconder(u.email)} (até 3 aparelhos)`);
    }
    pagina = r.pageToken;
  } while (pagina);
  console.log(`Pronto. ${liberadas} conta(s) liberada(s), ${jaEstavam} já estavam configuradas.`);
  console.log('Abra o app de novo (ou saia e entre) para ver o "Painel de acessos" no Perfil.');
}

main().catch((e) => {
  console.error('Erro:', e.message || e);
  process.exit(1);
});
