# Bia's Sunset Party

Convite interativo em pixel art com enquete estilo WhatsApp: cada pessoa coloca o nome, toca numa opção e todo mundo que abre o site vê os votos (contagem, barras e "ver votos" com os nomes).

## Como os votos são salvos

`api/votes.js` é uma função serverless da Vercel:

- `GET /api/votes` → lista todos os votos
- `POST /api/votes` `{ name, choice }` → registra o voto. Mesmo nome (ignorando maiúsculas/acentos) = mesma pessoa, então votar de novo **troca** o voto.

Os votos ficam num hash do **Upstash Redis** (chave `bia:votes`), acessado pela API REST — sem dependências npm.
Sem as variáveis de ambiente do Redis, a função usa memória (só serve para teste local; some a cada deploy).

## Publicar na Vercel

1. Importe este repositório na Vercel (diretório raiz `.`, sem build).
2. No projeto: **Storage → Create Database → Upstash (Redis)** → conecte ao projeto. Isso cria `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
3. Faça um **Redeploy** para a função enxergar as variáveis.
4. Confira em `https://SEU-SITE.vercel.app/api/votes` → deve aparecer `"storage":"redis"`.
