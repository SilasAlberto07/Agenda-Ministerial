import * as Location from 'expo-location';
import { buscarNoPhoton, juntarResultados } from './buscaLugares';

// Monta um endereço curto e legível a partir do resultado do geocoder do celular
export function formatarEndereco(a) {
  if (!a) return '';
  const rua = [a.street, a.streetNumber].filter(Boolean).join(', ');
  const cidade = a.city || a.subregion;
  const partes = [rua || a.name, a.district, cidade].filter(Boolean);
  const unicas = partes.filter((p, i) => partes.indexOf(p) === i);
  return unicas.join(' — ') || a.formattedAddress || '';
}

export async function enderecoDe(coord) {
  try {
    const [a] = await Location.reverseGeocodeAsync(coord);
    return { titulo: a?.name && a.name !== a.streetNumber ? a.name : formatarEndereco(a), endereco: formatarEndereco(a) };
  } catch {
    return { titulo: 'Local escolhido', endereco: `${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}` };
  }
}

// Busca um texto (igreja, endereço, bairro): primeiro pelo nome do lugar (Photon),
// depois pelo geocoder do celular; junta os dois sem repetir.
async function buscarNoCelular(texto) {
  const coords = await Location.geocodeAsync(texto);
  return Promise.all(
    coords.slice(0, 5).map(async (c, i) => {
      const { titulo, endereco } = await enderecoDe(c);
      return { id: `g${i}`, latitude: c.latitude, longitude: c.longitude, titulo: titulo || texto, endereco };
    })
  );
}

export async function buscarLocais(texto, perto) {
  const [porNome, porEndereco] = await Promise.all([
    buscarNoPhoton(texto, perto).catch(() => []),
    buscarNoCelular(texto).catch(() => []),
  ]);
  // Texto com número (rua, CEP) é endereço: o geocoder de endereços vem primeiro
  return /\d/.test(texto) ? juntarResultados(porEndereco, porNome) : juntarResultados(porNome, porEndereco);
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
