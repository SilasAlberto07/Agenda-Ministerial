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
| Perfil | Seus dados, **Testar notificação** e sair |

**Lembretes:** você escolhe avisar 1 dia, 3h, 2h ou 30 min antes. Os avisos são agendados no próprio celular e chegam mesmo com o app fechado. Se você entrar na conta em outro celular, os lembretes são agendados nele também automaticamente. Tocar no aviso abre o compromisso.

## 5. Publicar nas lojas (quando quiser)

Para gerar o app instalável (APK/AAB para Android, ou para a App Store) use o EAS:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android
```

Antes de publicar, crie uma **chave da API do Google Maps** (Google Cloud Console → APIs → Maps SDK for Android/iOS) e coloque no `app.json`, dentro de `plugins`:

```json
["react-native-maps", { "androidGoogleMapsApiKey": "SUA_CHAVE", "iosGoogleMapsApiKey": "SUA_CHAVE" }]
```

No Expo Go o mapa funciona sem chave.

## 6. Estrutura de pastas

```
App.js                      navegação, fontes e abertura pelo aviso
src/firebase.js             conexão com o Firebase (lê o .env)
src/auth/AuthContext.js     login, criar conta, sair
src/services/eventos.js     salvar/editar/excluir compromissos no Firestore
src/services/lembretes.js   agendamento das notificações
src/screens/                as telas
src/theme.js                cores, fontes, tipos e opções de lembrete
firestore.rules             regras de segurança do banco
```

## Próximos passos possíveis

- Entrar com conta Google (precisa de uma "development build" do Expo, não funciona no Expo Go).
- Compartilhar a agenda com a esposa, banda ou secretário da igreja.
- Contato do pastor responsável com botão de WhatsApp.
