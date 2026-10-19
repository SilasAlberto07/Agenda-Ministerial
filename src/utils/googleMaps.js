import { Linking, Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Abrir o Google Maps
// ---------------------------------------------------------------------------

// Abre o Google Maps (app, se instalado; senão o site) pesquisando um texto,
// ou centralizado num ponto.
export function abrirGoogleMaps({ texto, ponto } = {}) {
  let url;
  if (texto && texto.trim()) {
    url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto.trim())}`;
  } else if (ponto) {
    url = `https://www.google.com/maps/search/?api=1&query=${ponto.latitude},${ponto.longitude}`;
  } else {
    url = 'https://www.google.com/maps';
  }
  return Linking.openURL(url);
}

// ---------------------------------------------------------------------------
// Ler o que foi copiado do Google Maps
// ---------------------------------------------------------------------------

const num = '(-?\\d{1,3}\\.\\d+)';
const PADROES = [
  new RegExp(`!3d${num}!4d${num}`), // ponto exato do lugar
  new RegExp(`[?&](?:q|query|ll|destination|daddr|center)=${num}(?:,|%2C)\\s*${num}`, 'i'),
  new RegExp(`@${num},${num}`), // centro da tela do mapa
  new RegExp(`^\\s*${num}\\s*,\\s*${num}\\s*$`), // "-15.6, -56.1"
];

function valido(lat, lng) {
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

export function coordenadasDoTexto(texto) {
  const original = String(texto || '');
  const versoes = [original];
  try {
    versoes.push(decodeURIComponent(original)); // links "consent.google.com/?continue=..." vêm codificados
  } catch {}
  for (const re of PADROES) {
    for (const t of versoes) {
      const m = t.match(re);
      if (m) {
        const lat = Number(m[1]);
        const lng = Number(m[2]);
        if (valido(lat, lng)) return { latitude: lat, longitude: lng };
      }
    }
  }
  return null;
}

// "/maps/place/Igreja X - Av. Tal, 10 - Bairro, Sinop - MT, 78559-477/..." → texto do lugar
export function lugarDoLink(url) {
  const m = String(url || '').match(/\/maps\/place\/([^/@?]+)/);
  if (!m) return '';
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
  } catch {
    return '';
  }
}

// Separa "Nome do lugar - Endereço, Cidade - UF, CEP" em { nome, endereco }.
// Sem nome (o link era só um endereço), devolve tudo como endereço.
export function separarNomeEndereco(texto) {
  const t = String(texto || '').trim();
  const partes = t.split(' - ');
  for (let i = 1; i < partes.length; i++) {
    const resto = partes.slice(i).join(' - ');
    // O endereço tem vírgula e começa com rua/avenida/rodovia, ou termina com "Cidade - UF"
    if (/,/.test(resto) && (/^(r\.|rua|av\.?|avenida|rod\.?|rodovia|al\.?|alameda|tv\.?|travessa|estr\.?|estrada|pç\.?|praça|br-|mt-)/i.test(resto) || i === 1)) {
      const nome = partes.slice(0, i).join(' - ');
      if (!/\d{5}-?\d{3}/.test(nome) && !/,/.test(nome)) return { nome, endereco: resto };
    }
  }
  return { nome: '', endereco: t };
}

export const nomeDoLink = (url) => separarNomeEndereco(lugarDoLink(url)).nome || lugarDoLink(url);

// Cidade de um endereço brasileiro: "..., Sinop - MT, 78559-477" → "Sinop"
export function cidadeDoEndereco(endereco) {
  const m = String(endereco || '').match(/,\s*([^,]+?)\s*-\s*([A-Z]{2})\b/);
  return m ? m[1].trim() : '';
}

// Tira "Q 10", "Lt 03", "Quadra", "Lote", "Casa", CEP: atrapalham a busca de endereço.
// "Av. X, Q 10 - Lt 03 - Bairro, Sinop - MT, 78559-477" → "Av. X, Bairro, Sinop, MT"
const PARTE_INUTIL = /^(quadra|qda|qd|q|lote|lt|casa|cs|bloco|bl|sala|sl|apartamento|apto|ap)\.?\s*\d+[a-z]?$/i;
export function limparEndereco(endereco) {
  return String(endereco || '')
    .split(/\s*,\s*|\s+-\s+/)
    .map((p) => p.trim())
    .filter((p) => p && !PARTE_INUTIL.test(p) && !/^\d{5}-?\d{3}$/.test(p))
    .join(', ');
}

const normalizar = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const ehLinkCurto = (u) => /(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|share\.google)/i.test(u);

// Coordenadas confiáveis dentro da página do Google (ponto exato do lugar).
// Não usar outros números da página: podem ser da sua região, e não do lugar.
function coordenadasDaPagina(html) {
  const t = String(html || '');
  for (const re of [new RegExp(`markers=${num}(?:,|%2C)${num}`, 'i'), new RegExp(`!3d${num}!4d${num}`)]) {
    const m = t.match(re);
    if (m && valido(Number(m[1]), Number(m[2]))) return { latitude: Number(m[1]), longitude: Number(m[2]) };
  }
  return null;
}

// Abre o link curto (maps.app.goo.gl/...) e devolve o link completo + coordenadas, se houver.
// Funciona no app do celular; no navegador o Google bloqueia (aí usamos o texto copiado).
export async function abrirLinkCurto(url) {
  if (Platform.OS === 'web') return null;
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controle.signal, headers: { 'Accept-Language': 'pt-BR' } });
    const final = r.url || '';
    let coords = coordenadasDoTexto(final);
    if (!coords) {
      const html = await r.text().catch(() => '');
      coords = coordenadasDaPagina(html.slice(0, 300000));
    }
    return { url: final, coords };
  } catch {
    return null;
  } finally {
    clearTimeout(tempo);
  }
}

/**
 * Recebe o que a pessoa colou do Google Maps (link, nome + endereço, ou coordenadas)
 * e devolve { latitude, longitude, titulo, endereco }, ou null se não deu para entender.
 * `geocodificar(texto)` e `enderecoDe(coord)` vêm de utils/enderecos (celular ou web).
 */
export async function lerDoGoogleMaps(colado, { geocodificar, enderecoDe, resolver = abrirLinkCurto }) {
  const texto = String(colado || '').trim();
  if (!texto) return null;

  const links = texto.match(/https?:\/\/\S+/g) || [];
  // Linhas que não são link: normalmente "Nome do lugar" e "Endereço, Cidade - UF"
  const linhas = texto
    .replace(/https?:\/\/\S+/g, '')
    .split(/\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean);
  let nome = '';
  let endereco = '';
  if (linhas.length >= 2) {
    nome = linhas[0];
    endereco = linhas.slice(1).join(', ');
  } else if (linhas.length === 1 && !coordenadasDoTexto(linhas[0])) {
    ({ nome, endereco } = separarNomeEndereco(linhas[0]));
  }

  // 1) Coordenadas direto no texto ou num link longo
  let achado = coordenadasDoTexto(texto);
  const completar = (u) => {
    const lugar = separarNomeEndereco(lugarDoLink(u));
    nome = nome || lugar.nome;
    endereco = endereco || lugar.endereco;
  };
  links.forEach(completar);

  // 2) Link curto: abre para descobrir o link completo (com nome, endereço e às vezes coordenadas)
  for (const l of links.filter(ehLinkCurto)) {
    if (achado && nome) break;
    const r = await resolver(l);
    if (!r) continue;
    completar(r.url);
    achado = achado || r.coords;
  }

  if (achado) {
    let end = endereco;
    if (!end) {
      const info = await enderecoDe(achado);
      // Se não achou o endereço (sem internet), mostra o nome do lugar em vez de números
      end = info.titulo === 'Local escolhido' ? nome : info.endereco;
    }
    return { ...achado, titulo: nome || end || 'Local do Google Maps', endereco: end || nome };
  }

  // 3) Sem coordenadas: procura pelo endereço; só aceita resultado na cidade certa
  const cidade = cidadeDoEndereco(endereco);
  const naCidade = (r) => !cidade || normalizar(`${r.titulo} ${r.endereco}`).includes(normalizar(cidade));
  const tentativas = [
    endereco,
    limparEndereco(endereco),
    nome && cidade ? `${nome}, ${cidade}` : '',
    nome && !cidade ? nome : '',
  ].filter((t, i, a) => t && a.indexOf(t) === i);

  for (const tentativa of tentativas) {
    const lista = await geocodificar(tentativa).catch(() => []);
    const r = lista.find(naCidade);
    if (r) {
      return {
        latitude: r.latitude,
        longitude: r.longitude,
        titulo: nome || r.titulo,
        endereco: endereco || r.endereco,
      };
    }
  }
  return null;
}
