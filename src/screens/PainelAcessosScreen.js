import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, SectionList, TextInput, ActivityIndicator } from 'react-native';
import { Alert } from '../utils/alerta';
import { useAuth } from '../auth/AuthContext';
import { Icone } from '../components/icones';
import { cores, fontes } from '../theme';
import {
  ouvirTodosAcessos,
  liberarAcesso,
  bloquearAcesso,
  mudarLimite,
  removerAparelho,
  excluirConta,
  LIMITE_PADRAO,
} from '../services/acesso';

const normalizar = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const quando = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return '';
  const dois = (n) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// Painel do administrador: liberar quem pagou, bloquear e controlar aparelhos
export default function PainelAcessosScreen({ route }) {
  const { usuario } = useAuth() || {};
  const [lista, setLista] = useState(route?.params?.listaTeste || null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    if (route?.params?.listaTeste) return;
    return ouvirTodosAcessos(setLista, () =>
      setErro('Não foi possível carregar. Saia e entre de novo na conta de administrador.')
    );
  }, []);

  const secoes = useMemo(() => {
    if (!lista) return [];
    const termo = normalizar(busca.trim());
    const filtrados = lista
      .filter((a) => !a.excluido && (!a.excluir || a.uid === aberto))
      .filter((a) => !termo || normalizar(`${a.nome} ${a.email}`).includes(termo))
      .sort((a, b) => (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0));
    const grupos = [
      { title: 'Aguardando liberação', data: filtrados.filter((a) => !a.liberado && !a.bloqueado) },
      { title: 'Liberados', data: filtrados.filter((a) => a.liberado) },
      { title: 'Bloqueados', data: filtrados.filter((a) => !a.liberado && a.bloqueado) },
    ];
    return grupos.filter((g) => g.data.length);
  }, [lista, busca]);

  const acao = async (fn, ...args) => {
    try {
      await fn(...args);
    } catch {
      Alert.alert('Não foi possível salvar', 'Verifique a internet e tente de novo.');
    }
  };

  const confirmarExclusao = (a) =>
    Alert.alert(
      'Excluir conta?',
      `${a.email} perde o acesso na hora. O login e toda a agenda dessa conta são apagados em alguns minutos. Não dá para desfazer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await acao(excluirConta, a.uid);
            setAberto(null);
          },
        },
      ]
    );

  const confirmarBloqueio = (a) =>
    Alert.alert('Bloquear acesso?', `${a.email} não vai mais conseguir usar o app.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: () => acao(bloquearAcesso, a.uid) },
    ]);

  const confirmarRemocao = (a, id, ap) =>
    Alert.alert('Remover aparelho?', `"${ap.nome}" sai da conta ${a.email}. Libera uma vaga para outro aparelho.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => acao(removerAparelho, a.uid, id) },
    ]);

  if (!lista && !erro) return <ActivityIndicator style={{ marginTop: 40 }} color={cores.vinho} />;

  const pendentes = lista ? lista.filter((a) => !a.liberado && !a.bloqueado && !a.excluido).length : 0;
  const liberados = lista ? lista.filter((a) => a.liberado).length : 0;

  return (
    <View style={st.tela}>
      <View style={st.resumo}>
        <Numero valor={pendentes} rotulo="aguardando" destaque={pendentes > 0} />
        <Numero valor={liberados} rotulo="liberados" />
      </View>
      <View style={st.busca}>
        <Icone nome="search" cor={cores.texto2} tamanho={18} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome ou e-mail"
          placeholderTextColor={cores.texto3}
          accessibilityLabel="Buscar conta"
          autoCapitalize="none"
          style={st.buscaInput}
        />
      </View>
      {erro ? <Text style={st.erro}>{erro}</Text> : null}

      <SectionList
        style={{ flex: 1 }}
        sections={secoes}
        keyExtractor={(a) => a.uid}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 48 }}
        renderSectionHeader={({ section }) => (
          <Text style={st.secao}>
            {section.title} · {section.data.length}
          </Text>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={st.vazio}>Nenhuma conta encontrada.</Text>}
        renderItem={({ item: a }) => {
          const aparelhos = Object.entries(a.aparelhos || {});
          const limite = a.limiteAparelhos ?? LIMITE_PADRAO;
          const expandido = aberto === a.uid;
          return (
            <View style={st.cartao}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAberto(expandido ? null : a.uid)}
                style={st.cabecalho}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={st.nome} numberOfLines={1}>
                    {a.nome || 'Sem nome'}
                  </Text>
                  <Text style={st.email} numberOfLines={1}>
                    {a.email}
                  </Text>
                  <Text style={st.info}>
                    {a.criadoEm ? `Pediu em ${quando(a.criadoEm)} · ` : ''}
                    {aparelhos.length}/{limite} aparelhos
                  </Text>
                </View>
                <Icone nome={expandido ? 'chevron-up' : 'chevron-down'} cor={cores.texto2} tamanho={18} />
              </Pressable>

              {!a.liberado ? (
                <Pressable accessibilityRole="button" onPress={() => acao(liberarAcesso, a.uid)} style={st.liberar}>
                  <Icone nome="checkmark" cor="#fff" tamanho={18} />
                  <Text style={st.liberarTexto}>{a.bloqueado ? 'Desbloquear' : 'Liberar acesso'}</Text>
                </Pressable>
              ) : null}

              {expandido ? (
                <View style={st.detalhes}>
                  <View style={st.linha}>
                    <Text style={[st.rotulo, { flex: 1 }]}>Limite de aparelhos</Text>
                    <Pressable
                      accessibilityLabel="Diminuir limite"
                      onPress={() => acao(mudarLimite, a.uid, limite - 1)}
                      style={st.botaoMini}
                    >
                      <Icone nome="remove" tamanho={18} />
                    </Pressable>
                    <Text style={st.limite}>{limite}</Text>
                    <Pressable
                      accessibilityLabel="Aumentar limite"
                      onPress={() => acao(mudarLimite, a.uid, limite + 1)}
                      style={st.botaoMini}
                    >
                      <Icone nome="add" tamanho={18} />
                    </Pressable>
                  </View>

                  <Text style={st.rotulo}>Aparelhos</Text>
                  {aparelhos.length ? (
                    aparelhos.map(([id, ap]) => (
                      <View key={id} style={st.aparelho}>
                        <Icone nome="phone-portrait-outline" cor={cores.texto2} tamanho={18} />
                        <View style={{ flex: 1 }}>
                          <Text style={st.aparelhoNome}>{ap.nome || 'Aparelho'}</Text>
                          <Text style={st.info}>
                            {ap.desde ? `Desde ${quando(ap.desde)}` : ''}
                            {ap.ultimoUso ? ` · último uso ${quando(ap.ultimoUso)}` : ''}
                          </Text>
                        </View>
                        <Pressable onPress={() => confirmarRemocao(a, id, ap)} style={st.remover}>
                          <Text style={st.removerTexto}>Remover</Text>
                        </Pressable>
                      </View>
                    ))
                  ) : (
                    <Text style={st.info}>Nenhum aparelho ainda.</Text>
                  )}

                  {a.liberado ? (
                    <Pressable onPress={() => confirmarBloqueio(a)} style={st.bloquear}>
                      <Icone nome="ban-outline" cor={cores.erro} tamanho={16} />
                      <Text style={st.bloquearTexto}>Bloquear acesso</Text>
                    </Pressable>
                  ) : null}
                  {a.uid !== usuario?.uid ? (
                    <Pressable onPress={() => confirmarExclusao(a)} style={st.bloquear}>
                      <Icone nome="trash-outline" cor={cores.erro} tamanho={16} />
                      <Text style={st.bloquearTexto}>Excluir conta</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

function Numero({ valor, rotulo, destaque }) {
  return (
    <View style={[st.numero, destaque && { borderColor: cores.vinho }]}>
      <Text style={[st.numeroValor, destaque && { color: cores.vinho }]}>{valor}</Text>
      <Text style={st.numeroRotulo}>{rotulo}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  resumo: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  numero: {
    flex: 1, backgroundColor: cores.cartao, borderRadius: 16, borderWidth: 1, borderColor: cores.bordaSuave,
    paddingVertical: 12, alignItems: 'center', gap: 2,
  },
  numeroValor: { fontFamily: fontes.titulo, fontSize: 26, color: cores.tinta },
  numeroRotulo: { fontFamily: fontes.medio, fontSize: 13, color: cores.texto2 },
  busca: {
    marginHorizontal: 20, marginTop: 12, height: 48, borderRadius: 14, borderWidth: 1, borderColor: cores.borda,
    backgroundColor: cores.cartao, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
  },
  buscaInput: { flex: 1, height: '100%', fontFamily: fontes.normal, fontSize: 16, color: cores.tinta },
  erro: { fontFamily: fontes.medio, fontSize: 14, color: cores.erro, marginHorizontal: 20, marginTop: 10 },
  secao: {
    fontFamily: fontes.forte, fontSize: 13, color: cores.texto2, textTransform: 'uppercase',
    letterSpacing: 0.6, marginTop: 16, marginBottom: 10,
  },
  vazio: { fontFamily: fontes.normal, fontSize: 15, color: cores.texto2, textAlign: 'center', marginTop: 32 },
  cartao: { backgroundColor: cores.cartao, borderRadius: 16, borderWidth: 1, borderColor: cores.bordaSuave, overflow: 'hidden' },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  nome: { fontFamily: fontes.forte, fontSize: 16, color: cores.tinta },
  email: { fontFamily: fontes.normal, fontSize: 14, color: cores.texto2 },
  info: { fontFamily: fontes.normal, fontSize: 13, color: cores.texto3 },
  liberar: {
    marginHorizontal: 14, marginBottom: 14, height: 46, borderRadius: 12, backgroundColor: '#1F6B3A',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  liberarTexto: { fontFamily: fontes.forte, fontSize: 15, color: '#fff' },
  detalhes: { borderTopWidth: 1, borderTopColor: cores.bordaSuave, padding: 14, gap: 10 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rotulo: { fontFamily: fontes.forte, fontSize: 13, color: cores.texto2, textTransform: 'uppercase' },
  botaoMini: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: cores.borda,
    alignItems: 'center', justifyContent: 'center',
  },
  limite: { fontFamily: fontes.titulo, fontSize: 20, color: cores.tinta, minWidth: 24, textAlign: 'center' },
  aparelho: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aparelhoNome: { fontFamily: fontes.forte, fontSize: 14, color: cores.tinta },
  remover: { paddingHorizontal: 12, height: 36, borderRadius: 10, borderWidth: 1, borderColor: cores.borda, justifyContent: 'center' },
  removerTexto: { fontFamily: fontes.forte, fontSize: 13, color: cores.tinta },
  bloquear: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6 },
  bloquearTexto: { fontFamily: fontes.forte, fontSize: 14, color: cores.erro },
});
