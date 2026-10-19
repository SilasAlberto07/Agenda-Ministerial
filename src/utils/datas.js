// Formatação de datas em português, sem depender do Intl do aparelho
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIAS_LONGOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const dois = (n) => String(n).padStart(2, '0');

export const mesCurto = (d) => MESES[d.getMonth()];
export const diaSemanaCurto = (d) => DIAS[d.getDay()];
export const dataLonga = (d) => `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
export const dataNumerica = (d) => `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
export const hora = (d) => `${dois(d.getHours())}h${dois(d.getMinutes())}`;
export const horaInput = (d) => `${dois(d.getHours())}:${dois(d.getMinutes())}`;

export const mesmoDia = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Os 7 dias da semana atual, começando na segunda-feira
export function semanaAtual(referencia = new Date()) {
  const d = new Date(referencia);
  d.setHours(0, 0, 0, 0);
  const desloc = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - desloc);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    return x;
  });
}

// Texto amigável de "quanto falta"
export function quantoFalta(minutos) {
  if (minutos >= 1440) {
    const dias = Math.round(minutos / 1440);
    return dias === 1 ? 'amanhã' : `em ${dias} dias`;
  }
  if (minutos >= 60) {
    const h = Math.round(minutos / 60);
    return `em ${h} hora${h > 1 ? 's' : ''}`;
  }
  return `em ${minutos} minutos`;
}

// Um compromisso sai da agenda e vai para o Histórico às 23h do dia dele.
// Se começar tarde (ex.: vigília às 22h), sai 2 horas depois do início.
export function fimDoCompromisso(data) {
  const fim = new Date(data);
  fim.setHours(23, 0, 0, 0);
  return new Date(Math.max(fim.getTime(), data.getTime() + 2 * 3600000));
}
export const realizado = (evento, agora = new Date()) => agora >= fimDoCompromisso(evento.data);

const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const mesAno = (d) => `${MESES_LONGOS[d.getMonth()]} de ${d.getFullYear()}`;
export const dataCompleta = (d) => `${d.getDate()} de ${MESES_LONGOS[d.getMonth()]} de ${d.getFullYear()}`;
