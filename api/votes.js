const UPSTREAM_URL = "https://bia-sunset-party.amusedmango4.chatgpt.site/api/votes";

const VALID_CHOICES = new Set([
  "Consigo ir na quinta",
  "Consigo ir sábado pra serra",
  "Consigo ir nos dois",
  "Não consigo ir",
]);

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const choice = String(body?.choice ?? "").trim();

  if (!name || name.length > 100 || !VALID_CHOICES.has(choice)) {
    return Response.json(
      { error: "Voto inválido" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const upstreamResponse = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, choice }),
    });

    return new Response(await upstreamResponse.text(), {
      status: upstreamResponse.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": upstreamResponse.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Falha ao registrar voto", error);
    return Response.json(
      { error: "Não foi possível registrar o voto" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
