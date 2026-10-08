// API de votos da enquete — GET lista todos os votos, POST registra/atualiza um voto.
//
// Armazenamento: Upstash Redis (grátis, via Vercel Marketplace). A integração cria
// as variáveis KV_REST_API_URL e KV_REST_API_TOKEN (ou UPSTASH_REDIS_REST_*).
// Sem essas variáveis (ex.: rodando local), cai num Map em memória só para testes.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "bia:votes"; // hash: campo = nome normalizado, valor = JSON do voto

const OPTIONS = [
  "Consigo ir na quinta",
  "Consigo ir sábado pra serra",
  "Consigo ir nos dois",
  "Não consigo ir",
];

const memory = globalThis.__biaVotes ?? (globalThis.__biaVotes = new Map());
const noStore = { "Cache-Control": "no-store" };

// Executa um comando Redis pela API REST do Upstash (sem precisar de npm install)
async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Redis ${res.status}`);
  return data.result;
}

async function readVotes() {
  if (!REDIS_URL) return [...memory.values()];
  const flat = (await redis(["HGETALL", KEY])) || []; // [campo, valor, campo, valor...]
  const votes = [];
  for (let i = 1; i < flat.length; i += 2) {
    try { votes.push(JSON.parse(flat[i])); } catch { /* ignora lixo */ }
  }
  return votes;
}

async function saveVote(id, vote) {
  if (!REDIS_URL) return void memory.set(id, vote);
  await redis(["HSET", KEY, id, JSON.stringify(vote)]);
}

// Mesmo nome (ignorando maiúsculas/acentos/espaços) = mesma pessoa → o voto é atualizado
const normalize = (name) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function summary(votes) {
  votes.sort((a, b) => a.at.localeCompare(b.at));
  return {
    options: OPTIONS,
    total: votes.length,
    votes: votes.map(({ name, choice, at }) => ({ name, choice, at })),
    storage: REDIS_URL ? "redis" : "memory",
  };
}

export async function GET() {
  try {
    return Response.json(summary(await readVotes()), { headers: noStore });
  } catch (error) {
    console.error("Falha ao ler votos", error);
    return Response.json({ error: "Não foi possível carregar os votos" }, { status: 502, headers: noStore });
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").replace(/\s+/g, " ").trim();
  const choice = String(body?.choice ?? "").trim();

  if (!name || name.length > 40 || !OPTIONS.includes(choice)) {
    return Response.json({ error: "Voto inválido" }, { status: 400, headers: noStore });
  }

  try {
    await saveVote(normalize(name), { name, choice, at: new Date().toISOString() });
    return Response.json(summary(await readVotes()), { headers: noStore });
  } catch (error) {
    console.error("Falha ao registrar voto", error);
    return Response.json({ error: "Não foi possível registrar o voto" }, { status: 502, headers: noStore });
  }
}
