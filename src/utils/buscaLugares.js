// Busca de lugares pelo nome (igrejas, ginásios, escolas...) no Photon,
// um serviço gratuito e sem chave baseado no OpenStreetMap.
// Usado no celular e na web; se falhar, cada plataforma usa a busca antiga.
const PHOTON = 'https://photon.komoot.io/api/';

function montarEndereco(p) {
  const rua = [p.street, p.housenumber].filter(Boolean).join(', ');
  const bairro = p.district || p.locality;
  const cidade = p.city || p.county;
  const partes = [rua, bairro, cidade && p.state ? `${cidade} - ${siglaUF(p.state)}` : cidade].filter(Boolean);
  return partes.filter((x, i) => partes.indexOf(x) === i).join(' — ');
}

const UFS = {
  Acre: 'AC', Alagoas: 'AL', Amapá: 'AP', Amazonas: 'AM', Bahia: 'BA', Ceará: 'CE', 'Distrito Federal': 'DF',
  'Espírito Santo': 'ES', Goiás: 'GO', Maranhão: 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', Pará: 'PA', Paraíba: 'PB', Paraná: 'PR', Pernambuco: 'PE', Piauí: 'PI',
  'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS', Rondônia: 'RO', Roraima: 'RR',
  'Santa Catarina': 'SC', 'São Paulo': 'SP', Sergipe: 'SE', Tocantins: 'TO',
};
const siglaUF = (estado) => UFS[estado] || estado;

export async function buscarNoPhoton(texto, perto) {
  const params = new URLSearchParams({ q: texto, limit: '8' });
  if (perto) {
    params.set('lat', String(perto.latitude));
    params.set('lon', String(perto.longitude));
  }
  const controle = new AbortController();
  const tempo = setTimeout(() => controle.abort(), 8000);
  try {
    const r = await fetch(`${PHOTON}?${params}`, { signal: controle.signal });
    if (!r.ok) throw new Error(`Photon ${r.status}`);
    const json = await r.json();
    return (json.features || [])
      .filter((f) => !f.properties?.countrycode || f.properties.countrycode === 'BR')
      .slice(0, 5)
      .map((f, i) => {
        const p = f.properties || {};
        const [longitude, latitude] = f.geometry.coordinates;
        const endereco = montarEndereco(p);
        return { id: `p${i}`, latitude, longitude, titulo: p.name || endereco || texto, endereco: endereco || p.name || '' };
      });
  } finally {
    clearTimeout(tempo);
  }
}

// Junta duas listas de resultados sem repetir lugares a menos de ~80 m um do outro
export function juntarResultados(a, b, max = 5) {
  const lista = [...a];
  for (const r of b) {
    const perto = lista.some(
      (x) => Math.abs(x.latitude - r.latitude) < 0.0008 && Math.abs(x.longitude - r.longitude) < 0.0008
    );
    if (!perto) lista.push(r);
  }
  return lista.slice(0, max).map((r, i) => ({ ...r, id: String(i) }));
}
