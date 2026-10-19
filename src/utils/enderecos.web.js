import { buscarNoPhoton, juntarResultados } from './buscaLugares';

// Versão web da busca de endereços: Photon (nomes de lugares) + Nominatim (endereços),
// os dois gratuitos e sem chave, baseados no OpenStreetMap.
// O geocoder do expo-location não funciona no navegador.
const BASE = 'https://nominatim.openstreetmap.org';

function formatar(r) {
  const a = r.address || {};
  const rua = [a.road || a.pedestrian, a.house_number].filter(Boolean).join(', ');
  const bairro = a.suburb || a.neighbourhood || a.quarter;
  const cidade = a.city || a.town || a.village || a.municipality;
  const partes = [rua, bairro, cidade].filter(Boolean);
  return partes.join(' — ') || r.display_name || '';
}

function titulo(r) {
  return r.name && r.name.length > 1 ? r.name : formatar(r);
}

export async function enderecoDe(coord) {
  try {
    const url = `${BASE}/reverse?format=jsonv2&addressdetails=1&accept-language=pt-BR&lat=${coord.latitude}&lon=${coord.longitude}`;
    const r = await (await fetch(url)).json();
    return { titulo: titulo(r), endereco: formatar(r) };
  } catch {
    return { titulo: 'Local escolhido', endereco: `${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}` };
  }
}

async function buscarNoNominatim(texto, perto) {
  const params = new URLSearchParams({
    q: texto,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'br',
    'accept-language': 'pt-BR',
  });
  if (perto) {
    const d = 0.5;
    params.set('viewbox', [perto.longitude - d, perto.latitude + d, perto.longitude + d, perto.latitude - d].join(','));
  }
  const lista = await (await fetch(`${BASE}/search?${params}`)).json();
  return lista.map((r, i) => ({
    id: String(i),
    latitude: Number(r.lat),
    longitude: Number(r.lon),
    titulo: titulo(r),
    endereco: formatar(r),
  }));
}

export async function buscarLocais(texto, perto) {
  const [porNome, porEndereco] = await Promise.all([
    buscarNoPhoton(texto, perto).catch(() => []),
    buscarNoNominatim(texto, perto).catch(() => []),
  ]);
  return juntarResultados(porNome, porEndereco);
}

export function distanciaKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const textoKm = (km) => (km == null ? '' : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);
