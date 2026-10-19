# Agenda Ministerial

App de agenda para pregadores e cantores: cultos, congressos e ministrações, com local no mapa, login e lembretes no celular.

Feito com **React Native + Expo (SDK 57)** e **Firebase** (login e banco de dados).

---

## 1. O que você precisa instalar no computador

1. **Node.js** (versão LTS): https://nodejs.org
2. No celular, o app **Expo Go** (Play Store ou App Store).

## 2. Criar o projeto no Firebase (uma vez só, ~10 min)

1. Entre em https://console.firebase.google.com e clique em **Adicionar projeto** (pode chamar de "agenda-ministerial"). O Google Analytics pode ficar desligado.
2. No menu **Authentication → Começar → Método de login**, ative **E-mail/senha**.
3. No menu **Firestore Database → Criar banco de dados**, escolha a região `southamerica-east1 (São Paulo)` e o modo **produção**.
4. Ainda no Firestore, abra a aba **Regras**, apague o que estiver lá, cole o conteúdo do arquivo `firestore.rules` deste projeto e clique em **Publicar**. Assim cada pessoa só vê a própria agenda.
5. Vá em **Configurações do projeto (engrenagem) → Seus apps → ícone `</>` (Web)**, dê um nome e registre. Vai aparecer um bloco `firebaseConfig` com `apiKey`, `projectId` etc.

## 3. Configurar e rodar o app

Na pasta do projeto, pelo terminal:

```bash
npm install
cp .env.example .env      # no Windows: copy .env.example .env
```

Abra o arquivo `.env` e cole os valores do `firebaseConfig` (passo 2.5), um em cada linha. Depois:

```bash
npx expo start
```

Vai aparecer um QR Code. Abra o **Expo Go** no celular e leia o código (no iPhone, leia com a câmera). O celular e o computador precisam estar na mesma rede Wi-Fi.

Na primeira vez, crie sua conta pela própria tela do app em **Criar conta**.

## 4. Como o app funciona

| Tela | O que faz |
|---|---|
| Login | Entrar, criar conta e recuperar senha por e-mail |
| Agenda | Semana atual (ponto nos dias com compromisso), filtros Cultos/Congressos, lista dos próximos |
| Novo compromisso | Tipo, nome, igreja, data, horário, local no mapa, se vai pregar/cantar, lembretes e observações |
| Escolher local | Busca por endereço/igreja/bairro ou toque no mapa para marcar o ponto |
| Mapa | Todos os próximos compromissos com local marcado |
| Detalhe | Informações, mapinha, botão **Rota** (abre Google Maps / Apple Maps), editar e excluir |
| Histórico | Compromissos já realizados, por mês, com busca por igreja/cidade e filtros |
| Perfil | Seus dados, avisos e sair |

**Local pelo Google Maps:** na escolha do local, toque em **Abrir Google Maps**, ache a igreja, toque em **Compartilhar → Copiar**, volte e toque em **Colar local**. O app marca o ponto e preenche o nome da igreja. No detalhe de cada compromisso há o botão **Ver no Google Maps**. A busca do próprio app também procura igrejas e lugares pelo nome (Photon/OpenStreetMap, gratuito).

**Agenda e Histórico:** às 23h do dia de cada compromisso (ou 2 horas depois do início, se começar tarde), ele sai da agenda e vai para a aba **Histórico**. Nada é apagado: dá para abrir, ver o local e apagar pelo próprio histórico.

**Lembretes:** você escolhe avisar 1 dia, 3h, 2h ou 30 min antes. Os avisos são agendados no próprio celular e chegam mesmo com o app fechado. Se você entrar na conta em outro celular, os lembretes são agendados nele também automaticamente. Tocar no aviso abre o compromisso.

## 5. Publicar nas lojas (quando quiser)

Para gerar o app instalável (APK/AAB para Android, ou para a App Store) use o EAS:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android
```

O mapa usa o OpenFreeMap (dados do OpenStreetMap): gratuito, sem chave e sem limite de uso, também para uso comercial.

**Notificações no Android:** o Expo Go para Android não permite notificações. Elas funcionam no app instalado pelo APK.

## Como atualizar o app depois de uma mudança

```bash
git pull
npm run web:publicar          # iPhone / versão web: basta fechar e abrir o app
npm run android:atualizar     # Android: o APK baixa a novidade sozinho ao abrir
```

No Android, a atualização é baixada quando o app abre e aparece na **próxima** vez que ele for aberto.

Só é preciso gerar um APK novo (`npm run android:apk`) quando a mudança mexer na parte nativa do app (permissão nova, biblioteca nativa nova). Nesses casos a versão em `app.json` (`"version"`) é aumentada, por exemplo de `1.0.0` para `1.1.0`, para o APK antigo não receber uma atualização que ele não aguenta.

## 6. Versão para iPhone (web) com avisos

O iPhone instala o app pelo Safari, sem App Store e sem conta da Apple. A agenda é a mesma do Android, e os avisos são enviados por um robô que roda de graça no GitHub Actions.

### 6.1 Chaves dos avisos (uma vez só)

No terminal, na pasta do projeto:

```bash
npm run chaves:avisos
```

Aparecem duas chaves: **Public Key** e **Private Key**.

- Copie a **Public Key** para o `.env`, na linha `EXPO_PUBLIC_VAPID_PUBLIC_KEY=`.
- A **Private Key** é secreta: ela vai só para o GitHub (passo 6.3). Não coloque no `.env` nem mande para ninguém.

### 6.2 Publicar a versão web (Firebase Hosting, gratuito)

```bash
npx firebase-tools@latest login
npm run web:publicar
```

O endereço do app fica `https://agenda-ministerial-83611.web.app`. Esse comando também publica as regras do arquivo `firestore.rules`. Sempre que o app mudar, rode `npm run web:publicar` de novo.

### 6.3 Ligar o robô de lembretes (GitHub Actions)

1. **Chave do Firebase para o robô:** Firebase Console → engrenagem → **Configurações do projeto** → **Contas de serviço** → **Gerar nova chave privada**. Baixa um arquivo `.json`. Ele é secreto: não coloque no projeto.
2. No GitHub, abra o repositório → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** e crie:

| Nome | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | o conteúdo inteiro do arquivo `.json` do passo 1 (abra no Bloco de Notas e copie tudo) |
| `VAPID_PUBLIC_KEY` | a Public Key do passo 6.1 |
| `VAPID_PRIVATE_KEY` | a Private Key do passo 6.1 |
| `VAPID_SUBJECT` | `mailto:` seguido do seu e-mail, por exemplo `mailto:voce@gmail.com` |

3. Na aba **Actions** do repositório, se aparecer um aviso, clique em **I understand my workflows, go ahead and enable them**.
4. Para testar na hora: **Actions** → **Lembretes** → **Run workflow**. Se terminar com o sinal verde, está tudo certo.

O robô roda a cada 5 minutos. O GitHub pode atrasar algumas execuções, então um aviso pode chegar alguns minutos depois do horário.

### 6.4 Instalar no iPhone

1. No iPhone (iOS 16.4 ou mais novo), abra o endereço do app no **Safari**.
2. Toque em **Compartilhar** (o quadrado com a seta para cima) → **Adicionar à Tela de Início**.
3. Abra a **Agenda** pelo ícone novo, entre com o login e toque em **Ativar avisos** → **Permitir**.

O mesmo endereço também funciona no navegador do computador e em celulares Android sem o APK.

## 7. Estrutura de pastas

```
App.js                        navegação, fontes e abertura pelo aviso
src/firebase.js               conexão com o Firebase (lê o .env); firebase.web.js é a versão web
src/auth/AuthContext.js       login, criar conta, sair
src/services/eventos.js       salvar/editar/excluir compromissos no Firestore
src/services/lembretes.js     avisos agendados no próprio celular (APK)
src/services/pushWeb.web.js   avisos da versão web (inscrição do aparelho)
src/components/mapaHtml.js    o mapa (MapLibre + OpenFreeMap)
src/screens/                  as telas
src/theme.js                  cores, fontes, tipos e opções de lembrete
public/                       ícones, manifest e service worker da versão web
robo-lembretes/               robô que envia os avisos (roda no GitHub Actions)
.github/workflows/            agendamento do robô (a cada 5 minutos)
firestore.rules               regras de segurança do banco
firebase.json                 configuração da hospedagem da versão web
```

## Próximos passos possíveis

- Entrar com conta Google (precisa de uma "development build" do Expo, não funciona no Expo Go).
- Compartilhar a agenda com a esposa, banda ou secretário da igreja.
- Contato do pastor responsável com botão de WhatsApp.
