import { Alert as AlertNativo, Platform } from 'react-native';

// No navegador o Alert do React Native não aparece. Este substituto usa os
// diálogos do próprio navegador na web e o Alert normal no celular.
export const Alert = {
  alert(titulo, mensagem, botoes) {
    if (Platform.OS !== 'web') return AlertNativo.alert(titulo, mensagem, botoes);
    const texto = [titulo, mensagem].filter(Boolean).join('\n\n');
    const acoes = (botoes || []).filter((b) => b.style !== 'cancel');
    if (!botoes || botoes.length <= 1) {
      window.alert(texto);
      botoes?.[0]?.onPress?.();
      return;
    }
    if (window.confirm(texto)) acoes[0]?.onPress?.();
    else botoes.find((b) => b.style === 'cancel')?.onPress?.();
  },
};
