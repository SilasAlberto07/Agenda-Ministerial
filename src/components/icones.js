import Ionicons from '@expo/vector-icons/Ionicons';
import { cores } from '../theme';

export const Icone = ({ nome, cor = cores.tinta, tamanho = 22 }) => (
  <Ionicons name={nome} size={tamanho} color={cor} />
);

export const IconeCalendario = ({ cor, tamanho }) => <Icone nome="calendar-outline" cor={cor} tamanho={tamanho} />;
