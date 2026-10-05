// No app instalado (APK / iPhone nativo) os avisos são agendados no próprio celular
// (veja lembretes.js). Estas funções só fazem algo na versão web.
export const ehIOS = () => false;
export const instaladoNaTela = () => true;
export const registrarServiceWorker = () => {};
export const estadoAvisos = async () => 'nativo';
export const ativarAvisos = async () => {};
export const renovarInscricao = async () => {};
export const desativarAvisos = async () => {};
export const ouvirToqueNoAviso = () => () => {};
