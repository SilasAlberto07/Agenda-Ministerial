import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAcesso } from './AcessoContext';
import { ouvirPerfil, perfilSalvo } from './perfil';

// Nome e foto da conta, iguais em todos os aparelhos. Sem internet usa a cópia do aparelho.
export const PerfilContext = createContext({ nome: '', foto: '', atualizar: () => {} });

export function PerfilProvider({ children }) {
  const { usuario } = useAuth();
  const { estado } = useAcesso();
  const [perfil, setPerfil] = useState({ nome: '', foto: '' });

  useEffect(() => {
    setPerfil({ nome: '', foto: '' });
    if (!usuario || estado !== 'ok') return;
    let ativo = true;
    perfilSalvo(usuario.uid).then((p) => ativo && p && setPerfil((atual) => (atual.nome || atual.foto ? atual : p)));
    const parar = ouvirPerfil(usuario.uid, (p) => ativo && setPerfil(p));
    return () => {
      ativo = false;
      parar();
    };
  }, [usuario?.uid, estado]);

  // Nome: o do perfil; se ainda não tiver, o do cadastro
  const nome = perfil.nome || usuario?.displayName || '';
  const atualizar = (mudancas) => setPerfil((p) => ({ ...p, ...mudancas }));

  return <PerfilContext.Provider value={{ nome, foto: perfil.foto, atualizar }}>{children}</PerfilContext.Provider>;
}

export const usePerfil = () => useContext(PerfilContext);
