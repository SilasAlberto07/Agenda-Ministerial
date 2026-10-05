import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ouvirEventos } from './eventos';
import { prepararNotificacoes, sincronizarLembretes } from './lembretes';

const EventosContext = createContext({ eventos: [], carregando: true, erro: null });

export function EventosProvider({ children }) {
  const { usuario } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

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

  return <EventosContext.Provider value={{ eventos, carregando, erro }}>{children}</EventosContext.Provider>;
}

export const useEventos = () => useContext(EventosContext);
