// Cores e fontes do app (as mesmas do protótipo aprovado)
export const cores = {
  fundo: '#F6F2EC',
  cartao: '#FFFFFF',
  tinta: '#1C1B22',
  texto2: '#57535E',
  texto3: '#77727E',
  borda: '#D8D0C6',
  bordaSuave: '#ECE5DC',
  vinho: '#6E1A37',
  vinhoClaro: '#F3E4E9',
  dourado: '#7A4F0E',
  douradoClaro: '#F6EBD7',
  ponto: '#B07A1E',
  azul: '#2563EB',
  erro: '#B42318',
};

export const fontes = {
  titulo: 'Fraunces_600SemiBold',
  normal: 'Manrope_400Regular',
  medio: 'Manrope_600SemiBold',
  forte: 'Manrope_700Bold',
};

// Tipos de compromisso e suas cores
export const TIPOS = ['Culto', 'Congresso', 'Festividade', 'Outro'];
export function corDoTipo(tipo) {
  if (tipo === 'Culto') return { fundo: cores.vinhoClaro, texto: cores.vinho };
  if (tipo === 'Congresso') return { fundo: cores.douradoClaro, texto: cores.dourado };
  if (tipo === 'Festividade') return { fundo: '#E1EFE6', texto: '#1F6B3A' };
  return { fundo: '#E7ECEF', texto: '#334155' };
}

// Cor do pino no mapa
export function corDoPino(tipo) {
  if (tipo === 'Congresso') return '#B07A1E';
  if (tipo === 'Festividade') return '#2E7D4F';
  if (tipo === 'Outro') return '#475569';
  return cores.vinho;
}

export const PARTICIPACOES = ['Pregar', 'Cantar', 'Pregar e cantar'];

// Opções de lembrete, em minutos antes do evento
export const LEMBRETES = [
  { minutos: 1440, rotulo: '1 dia antes' },
  { minutos: 180, rotulo: '3h antes' },
  { minutos: 120, rotulo: '2h antes' },
  { minutos: 30, rotulo: '30 min antes' },
];
