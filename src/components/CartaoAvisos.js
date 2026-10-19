import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { estadoAvisos, ativarAvisos } from '../services/pushWeb';
import { Botao } from './ui';
import { Icone } from './icones';
import { cores, fontes } from '../theme';
import { Alert } from '../utils/alerta';

const TEXTOS = {
  instalar: {
    titulo: 'Instale o app para receber avisos',
    texto:
      'No Safari, toque em Compartilhar (o quadrado com a seta para cima) e depois em "Adicionar à Tela de Início". Abra a Agenda pelo ícone novo e ative os avisos.',
  },
  desativado: {
    titulo: 'Ative os avisos',
    texto: 'Receba os lembretes dos compromissos neste aparelho, mesmo com o app fechado.',
  },
  negado: {
    titulo: 'Avisos bloqueados',
    texto: 'Para liberar no iPhone: Ajustes → Notificações → Agenda → Permitir Notificações.',
  },
  ativo: { titulo: 'Avisos ativos neste aparelho', texto: 'Os lembretes chegam mesmo com o app fechado.' },
  'sem-suporte': {
    titulo: 'Avisos indisponíveis',
    texto: 'Este navegador não aceita notificações. No iPhone, use o Safari (iOS 16.4 ou mais novo) e instale na tela inicial.',
  },
  'sem-chave': {
    titulo: 'Avisos não configurados',
    texto: 'Falta a chave EXPO_PUBLIC_VAPID_PUBLIC_KEY no .env desta versão (veja o LEIA-ME).',
  },
};

// Cartão de avisos da versão web. No app instalado (APK) não aparece.
export default function CartaoAvisos({ compacto }) {
  const { usuario } = useAuth() || {};
  const [estado, setEstado] = useState(null);
  const [ativando, setAtivando] = useState(false);

  const atualizar = () => estadoAvisos().then(setEstado).catch(() => setEstado('sem-suporte'));
  useEffect(() => {
    if (Platform.OS === 'web') atualizar();
  }, []);

  if (Platform.OS !== 'web' || !estado || !TEXTOS[estado]) return null;
  if (compacto && !['instalar', 'desativado', 'negado'].includes(estado)) return null;

  const ativar = async () => {
    setAtivando(true);
    try {
      await ativarAvisos(usuario.uid);
      Alert.alert('Avisos ativados', 'Pronto! Você vai receber os lembretes neste aparelho.');
    } catch (e) {
      if (e?.message !== 'negado') Alert.alert('Não foi possível ativar', 'Tente de novo em instantes.');
    } finally {
      setAtivando(false);
      atualizar();
    }
  };

  const { titulo, texto } = TEXTOS[estado];
  const ok = estado === 'ativo';
  return (
    <View style={[st.cartao, compacto && { marginHorizontal: 24, marginTop: 12 }, ok && { borderColor: '#B7D7C2' }]}>
      <View style={st.linha}>
        <View style={[st.icone, ok && { backgroundColor: '#E3F1E7' }]}>
          <Icone nome="notifications-outline" cor={ok ? '#1F6B3A' : cores.vinho} tamanho={18} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.titulo}>{titulo}</Text>
          <Text style={st.texto}>{texto}</Text>
        </View>
      </View>
      {estado === 'desativado' && <Botao titulo="Ativar avisos" onPress={ativar} carregando={ativando} style={{ height: 46 }} />}
    </View>
  );
}

const st = StyleSheet.create({
  cartao: { backgroundColor: cores.cartao, borderRadius: 18, borderWidth: 1, borderColor: cores.bordaSuave, padding: 14, gap: 12, flexShrink: 0 },
  linha: { flexDirection: 'row', gap: 12 },
  icone: { width: 36, height: 36, borderRadius: 10, backgroundColor: cores.vinhoClaro, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fontes.forte, fontSize: 15, color: cores.tinta },
  texto: { fontFamily: fontes.normal, fontSize: 14, lineHeight: 20, color: cores.texto2 },
});
