import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { ouvirEventos } from './eventos';
import { prepararNotificacoes, sincronizarLembretes } from './lembretes';
import { realizado } from '../utils/datas';

export const EventosContext = createContext({ eventos: [], proximos: [], historico: [], carregando: true, erro: null, agora: new Date() });

// Relógio que avança a cada minuto (e ao voltar para o app), para os
// compromissos irem para o Histórico sozinhos às 23h, sem precisar recarregar.
function useAgora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setAgora(new Date()));
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, []);
  return agora;
}

export function EventosProvider({ children }) {
  const { usuario } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const agora = useAgora();

  useEffect(() => {
    prepararNotificacoes().catch(() => {});
  }, []);

  useEffect(() => {
    if (!usuario) {
      setEventos([]);
      return;
    }
    setCarregando(true);
    return ouvirEventos(
      usuario.uid,
      (lista) => {
        setEventos(lista);
        setCarregando(false);
        setErro(null);
        sincronizarLembretes(lista).catch((e) => console.warn('Lembretes:', e));
      },
      (e) => {
        setErro(e);
        setCarregando(false);
      }
    );
  }, [usuario?.uid]);

  // proximos: ainda vão acontecer (ordem por data) · historico: já realizados (mais recente primeiro)
  const { proximos, historico } = useMemo(() => {
    const p = [];
    const h = [];
    for (const e of eventos) (realizado(e, agora) ? h : p).push(e);
    h.sort((a, b) => b.data - a.data);
    return { proximos: p, historico: h };
  }, [eventos, agora]);

  return (
    <EventosContext.Provider value={{ eventos, proximos, historico, carregando, erro, agora }}>
      {children}
    </EventosContext.Provider>
  );
}

export const useEventos = () => useContext(EventosContext);
