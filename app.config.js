// Configuração dinâmica: usa o app.json e, se existir, liga o google-services.json
// (necessário para o APK receber avisos do servidor — veja o LEIA-ME, seção "Avisos no Android").
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const arquivo = path.join(__dirname, 'google-services.json');
  if (fs.existsSync(arquivo)) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  return config;
};
