import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      setCarregando(false);
    });
  }, []);

  const valor = {
    usuario,
    carregando,
    entrar: (email, senha) => signInWithEmailAndPassword(auth, email.trim(), senha),
    criarConta: async (nome, email, senha) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      if (nome) {
        await updateProfile(cred.user, { displayName: nome.trim() });
        setUsuario({ ...cred.user, displayName: nome.trim() });
      }
      return cred;
    },
    recuperarSenha: (email) => sendPasswordResetEmail(auth, email.trim()),
    sair: () => signOut(auth),
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// Traduz os erros do Firebase para mensagens em português
export function mensagemDeErro(e) {
  const c = e?.code || '';
  if (c.includes('invalid-email')) return 'E-mail inválido.';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found'))
    return 'E-mail ou senha incorretos.';
  if (c.includes('email-already-in-use')) return 'Já existe uma conta com este e-mail.';
  if (c.includes('weak-password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (c.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  if (c.includes('network')) return 'Sem conexão com a internet.';
  return 'Algo deu errado. Tente novamente.';
}
