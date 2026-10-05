import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Alert } from '../utils/alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao, Campo } from '../components/ui';
import { IconeCalendario } from '../components/icones';
import { cores, fontes } from '../theme';
import { useAuth, mensagemDeErro } from '../auth/AuthContext';
import { firebaseConfigurado } from '../firebase';

export default function LoginScreen() {
  const { entrar, criarConta, recuperarSenha } = useAuth();
  const [modo, setModo] = useState('entrar'); // 'entrar' | 'criar'
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const enviar = async () => {
    setErro('');
    if (!email || !senha) return setErro('Preencha e-mail e senha.');
    if (modo === 'criar' && !nome.trim()) return setErro('Informe seu nome.');
    setCarregando(true);
    try {
      if (modo === 'entrar') await entrar(email, senha);
      else await criarConta(nome, email, senha);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  };

  const esqueci = async () => {
    if (!email) return setErro('Digite seu e-mail acima para receber o link.');
    try {
      await recuperarSenha(email);
      Alert.alert('Pronto', 'Enviamos um link para redefinir sua senha.');
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 18 }}>
            <View style={st.logo}>
              <IconeCalendario cor={cores.fundo} tamanho={28} />
            </View>
            <Text style={st.titulo}>Agenda{'\n'}Ministerial</Text>
            <Text style={st.sub}>
              Seus cultos, congressos e ministrações em um só lugar — com lembrete antes de cada um.
            </Text>
          </View>

          {!firebaseConfigurado && (
            <Text style={st.aviso}>
              Firebase ainda não configurado. Preencha o arquivo .env (veja o LEIA-ME.md) e reinicie o app.
            </Text>
          )}

          <View style={{ gap: 16 }}>
            {modo === 'criar' && (
              <Campo rotulo="Seu nome" placeholder="Ex.: Pr. João" value={nome} onChangeText={setNome} />
            )}
            <Campo
              rotulo="E-mail"
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Campo
              rotulo="Senha"
              placeholder="••••••••"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
            {modo === 'entrar' && (
              <Pressable onPress={esqueci} style={{ alignSelf: 'flex-end', padding: 6 }}>
                <Text style={st.link}>Esqueci minha senha</Text>
              </Pressable>
            )}
            {erro ? <Text style={st.erro}>{erro}</Text> : null}
            <Botao titulo={modo === 'entrar' ? 'Entrar' : 'Criar conta'} onPress={enviar} carregando={carregando} />
          </View>

          <Pressable
            onPress={() => {
              setErro('');
              setModo(modo === 'entrar' ? 'criar' : 'entrar');
            }}
            style={{ padding: 10, marginTop: 'auto' }}
          >
            <Text style={st.rodape}>
              {modo === 'entrar' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
              <Text style={st.link}>{modo === 'entrar' ? 'Criar conta' : 'Entrar'}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  conteudo: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 40, paddingBottom: 24, gap: 32 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: cores.vinho, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fontes.titulo, fontSize: 38, lineHeight: 42, color: cores.tinta },
  sub: { fontFamily: fontes.normal, fontSize: 16, lineHeight: 24, color: cores.texto2 },
  link: { fontFamily: fontes.forte, fontSize: 14, color: cores.vinho },
  erro: { fontFamily: fontes.medio, fontSize: 14, color: cores.erro },
  aviso: { fontFamily: fontes.medio, fontSize: 14, color: cores.dourado, backgroundColor: cores.douradoClaro, padding: 12, borderRadius: 12 },
  rodape: { textAlign: 'center', fontFamily: fontes.normal, fontSize: 15, color: cores.texto2 },
});
