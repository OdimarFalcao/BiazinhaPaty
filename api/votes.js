const UPSTREAM_URL = "https://bia-sunset-party.amusedmango4.chatgpt.site/api/votes";

const VALID_CHOICES = new Set([
  "Consigo ir na quinta",
  "Consigo ir sábado pra serra",
  "Consigo ir nos dois",
  "Não consigo ir",
]);

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Método não permitido" });
  }

  const name = String(request.body?.name ?? "").trim();
  const choice = String(request.body?.choice ?? "").trim();

  if (!name || name.length > 100 || !VALID_CHOICES.has(choice)) {
    return response.status(400).json({ error: "Voto inválido" });
  }

  try {
    const upstreamResponse = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, choice }),
    });

    const contentType = upstreamResponse.headers.get("content-type") || "application/json";
    const payload = await upstreamResponse.text();

    response.setHeader("Content-Type", contentType);
    return response.status(upstreamResponse.status).send(payload);
  } catch (error) {
    console.error("Falha ao registrar voto", error);
    return response.status(502).json({ error: "Não foi possível registrar o voto" });
  }
};
