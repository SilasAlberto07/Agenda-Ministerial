import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useAcesso } from './AcessoContext';
import { ouvirEventos } from './eventos';
import { prepararNotificacoes, sincronizarLembretes } from './lembretes';
import { realizado } from '../utils/datas';
import { lerEventosLocal, salvarEventosLocal } from './cacheLocal';

export const EventosContext = createContext({
  eventos: [], proximos: [], historico: [], carregando: true, erro: null, agora: new Date(), offline: false, salvoEm: null,
});

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
  const { estado } = useAcesso();
  const liberado = estado === 'ok';
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [offline, setOffline] = useState(false);
  const [salvoEm, setSalvoEm] = useState(null);
  const agora = useAgora();

  useEffect(() => {
    prepararNotificacoes().catch(() => {});
  }, []);

  useEffect(() => {
    // A agenda só é lida depois que a conta está liberada neste aparelho
    if (!usuario || !liberado) {
      setEventos([]);
      setOffline(false);
      return;
    }
    const uid = usuario.uid;
    let ativo = true;
    let sincronizado = false; // já recebeu a agenda do servidor nesta abertura
    setCarregando(true);

    // 1) Mostra na hora a cópia salva no aparelho (funciona sem internet)
    lerEventosLocal(uid).then((copia) => {
      if (!ativo || sincronizado || !copia) return;
      setEventos(copia.lista);
      setSalvoEm(copia.salvoEm);
      setCarregando(false);
    });

    // Sem resposta do servidor em alguns segundos: considera sem internet
    const semResposta = setTimeout(() => {
      if (!ativo || sincronizado) return;
      setOffline(true);
      setCarregando(false);
    }, 6000);

    // 2) Agenda do servidor em tempo real; cada atualização vira a nova cópia do aparelho
    const parar = ouvirEventos(
      uid,
      (lista, { doServidor }) => {
        if (!ativo) return;
        if (!doServidor) {
          // Ainda sem confirmação do servidor: só aceita depois da primeira sincronização
          // (ex.: compromisso recém-adicionado aparecendo na hora)
          setOffline(true);
          if (!sincronizado) return;
        } else {
          sincronizado = true;
          setOffline(false);
          setSalvoEm(Date.now());
          salvarEventosLocal(uid, lista);
        }
        setEventos(lista);
        setCarregando(false);
        setErro(null);
        sincronizarLembretes(lista).catch((e) => console.warn('Lembretes:', e));
      },
      (e) => {
        if (!ativo) return;
        setErro(e);
        setOffline(true);
        setCarregando(false);
      }
    );
    return () => {
      ativo = false;
      clearTimeout(semResposta);
      parar();
    };
  }, [usuario?.uid, liberado]);

  // proximos: ainda vão acontecer (ordem por data) · historico: já realizados (mais recente primeiro)
  const { proximos, historico } = useMemo(() => {
    const p = [];
    const h = [];
    for (const e of eventos) (realizado(e, agora) ? h : p).push(e);
    h.sort((a, b) => b.data - a.data);
    return { proximos: p, historico: h };
  }, [eventos, agora]);

  return (
    <EventosContext.Provider value={{ eventos, proximos, historico, carregando, erro, agora, offline, salvoEm }}>
      {children}
    </EventosContext.Provider>
  );
}

export const useEventos = () => useContext(EventosContext);
