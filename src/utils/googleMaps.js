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

export function nomeDoLink(url) {
  const m = String(url || '').match(/\/maps\/place\/([^/@?]+)/);
  if (!m) return '';
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
  } catch {
    return '';
  }
}

const ehLinkCurto = (u) => /(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|share\.google)/i.test(u);

// Abre o link curto (maps.app.goo.gl/...) para descobrir o endereço completo do lugar.
// Funciona no app do celular; no navegador o Google bloqueia (aí usamos o texto copiado).
async function abrirLinkCurto(url) {
  if (Platform.OS === 'web') return null;
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), 10000);
  try {
    const r = await fetch(url, { signal: controle.signal, headers: { 'Accept-Language': 'pt-BR' } });
    const final = r.url || '';
    let coords = coordenadasDoTexto(final);
    let nome = nomeDoLink(final);
    if (!coords) {
      const html = await r.text();
      coords = coordenadasDoTexto(html.slice(0, 200000));
      if (!nome) {
        const t = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
        if (t) nome = t[1].split('·')[0].trim();
      }
    }
    return coords ? { ...coords, nome } : null;
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
export async function lerDoGoogleMaps(colado, { geocodificar, enderecoDe }) {
  const texto = String(colado || '').trim();
  if (!texto) return null;

  const links = texto.match(/https?:\/\/\S+/g) || [];
  // Linhas que não são link: normalmente "Nome do lugar" e "Endereço, Cidade - UF"
  const linhas = texto
    .replace(/https?:\/\/\S+/g, '')
    .split(/\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean);
  const nomeTexto = linhas[0] || '';
  const enderecoTexto = linhas.slice(1).join(', ');

  // 1) Coordenadas direto no texto ou num link longo
  let achado = coordenadasDoTexto(texto);
  let nome = links.map(nomeDoLink).find(Boolean) || '';

  // 2) Link curto: abre para descobrir as coordenadas
  if (!achado) {
    for (const l of links.filter(ehLinkCurto)) {
      const r = await abrirLinkCurto(l);
      if (r) {
        achado = { latitude: r.latitude, longitude: r.longitude };
        nome = nome || r.nome;
        break;
      }
    }
  }

  if (achado) {
    const titulo = nomeTexto || nome;
    let endereco = enderecoTexto;
    if (!endereco) {
      const info = await enderecoDe(achado);
      // Se não achou o endereço (sem internet), mostra o nome do lugar em vez de números
      endereco = info.titulo === 'Local escolhido' ? titulo : info.endereco;
    }
    return { ...achado, titulo: titulo || endereco || 'Local do Google Maps', endereco: endereco || titulo };
  }

  // 3) Sem coordenadas: procura pelo endereço (ou pelo nome) que veio no texto
  for (const tentativa of [enderecoTexto, [nomeTexto, enderecoTexto].filter(Boolean).join(', '), nomeTexto, nome]) {
    if (!tentativa) continue;
    const lista = await geocodificar(tentativa).catch(() => []);
    if (lista.length) {
      const r = lista[0];
      return {
        latitude: r.latitude,
        longitude: r.longitude,
        titulo: nomeTexto || nome || r.titulo,
        endereco: enderecoTexto || r.endereco,
      };
    }
  }
  return null;
}
