import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { idDoAparelho, ouvirAcesso, pedirAcesso, registrarAparelho } from './acesso';
import { acessoLocalLiberado, salvarAcessoLocal } from './cacheLocal';

/**
 * estado:
 *  'carregando' — ainda verificando
 *  'pendente'   — conta criada, aguardando o administrador liberar (pagamento)
 *  'bloqueado'  — o administrador bloqueou a conta
 *  'limite'     — conta liberada, mas já está no limite de aparelhos
 *  'ok'         — pode usar o app
 *  'erro'       — sem internet ou falha ao verificar (e nunca liberado neste aparelho)
 *
 * Sem internet: se a conta já foi liberada neste aparelho antes, abre direto ('ok')
 * com a agenda salva no aparelho.
 */
export const AcessoContext = createContext({ estado: 'carregando', admin: false, acesso: null });

export function AcessoProvider({ children }) {
  const { usuario } = useAuth();
  const [acesso, setAcesso] = useState(null);
  const [estado, setEstado] = useState('carregando');
  const [admin, setAdmin] = useState(false);

  // Administrador: marcado no login (atualiza a marcação a cada abertura do app)
  useEffect(() => {
    setAdmin(false);
    if (!usuario?.getIdTokenResult) return;
    usuario
      .getIdTokenResult(true)
      .then((t) => setAdmin(t.claims?.admin === true))
      .catch(() => {});
  }, [usuario?.uid]);

  useEffect(() => {
    if (!usuario) {
      setAcesso(null);
      setEstado('carregando');
      return;
    }
    setEstado('carregando');
    let ativo = true;
    let espera = null;
    let liberadoAntes = false;
    let confirmado = false; // já chegou resposta do servidor
    const definir = (e) => {
      if (!ativo) return;
      setEstado(e);
      if (e === 'ok') salvarAcessoLocal(usuario.uid, true);
      if (e === 'pendente' || e === 'bloqueado') salvarAcessoLocal(usuario.uid, false);
    };

    // Já liberada neste aparelho antes: abre na hora (inclusive sem internet)
    acessoLocalLiberado(usuario.uid).then((sim) => {
      liberadoAntes = sim;
      if (sim && ativo && !confirmado) setEstado('ok');
    });

    const parar = ouvirAcesso(
      usuario.uid,
      async (dados, { doCache } = {}) => {
        if (!ativo) return;
        // Sem resposta do servidor (sem internet): mantém o que já se sabia
        if (doCache) return;
        confirmado = true;
        setAcesso(dados);
        clearTimeout(espera);
        if (!dados) {
          // Conta sem pedido de acesso (ex.: criada numa versão antiga do app).
          // Espera um pouco, porque ao criar a conta o pedido é gravado logo em seguida.
          setEstado('carregando');
          espera = setTimeout(() => ativo && pedirAcesso(usuario).catch(() => ativo && setEstado('erro')), 4000);
          return;
        }
        if (!dados.liberado) {
          definir(dados.bloqueado ? 'bloqueado' : 'pendente');
          return;
        }
        try {
          const id = await idDoAparelho();
          const cabe = await registrarAparelho(usuario.uid, dados, id);
          definir(cabe ? 'ok' : 'limite');
        } catch {
          if (ativo) setEstado(liberadoAntes ? 'ok' : 'erro');
        }
      },
      () => ativo && setEstado(liberadoAntes ? 'ok' : 'erro')
    );
    return () => {
      ativo = false;
      clearTimeout(espera);
      parar();
    };
  }, [usuario?.uid]);

  return <AcessoContext.Provider value={{ estado, admin, acesso }}>{children}</AcessoContext.Provider>;
}

export const useAcesso = () => useContext(AcessoContext);
