import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { idDoAparelho, ouvirAcesso, pedirAcesso, registrarAparelho } from './acesso';

/**
 * estado:
 *  'carregando' — ainda verificando
 *  'pendente'   — conta criada, aguardando o administrador liberar (pagamento)
 *  'bloqueado'  — o administrador bloqueou a conta
 *  'limite'     — conta liberada, mas já está no limite de aparelhos
 *  'ok'         — pode usar o app
 *  'erro'       — sem internet ou falha ao verificar
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
    const parar = ouvirAcesso(
      usuario.uid,
      async (dados) => {
        if (!ativo) return;
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
          setEstado(dados.bloqueado ? 'bloqueado' : 'pendente');
          return;
        }
        try {
          const id = await idDoAparelho();
          const cabe = await registrarAparelho(usuario.uid, dados, id);
          if (ativo) setEstado(cabe ? 'ok' : 'limite');
        } catch {
          if (ativo) setEstado('erro');
        }
      },
      () => ativo && setEstado('erro')
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
