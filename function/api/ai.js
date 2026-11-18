const MAX_CHARS = 14000;

const SYSTEM = {
  analyze: `Tu es un professeur qui prépare la révision d’un étudiant. À partir UNIQUEMENT du texte fourni (n’invente rien), réponds en JSON avec exactement cette forme :
{"summary":[{"title":"","key":"phrase-clé courte","text":"2 à 4 phrases simples","tip":"astuce pour mémoriser"}],
"express":[{"q":"notion","a":"définition courte"}],
"flashcards":[{"q":"","a":""}],
"quiz":[{"q":"","options":["","",""],"answer":0,"explain":""}],
"diagram":{"nodes":[{"id":"a","label":"2 à 3 mots"}],"links":[{"from":"a","to":"b","label":"verbe court"}]}}
Règles : une flashcard et une question de quiz par notion importante, pour couvrir tout le texte ; 3 options, "answer" est l’index (0 à 2) de la bonne réponse ; fausses réponses plausibles ; français simple ; "diagram" seulement si le texte décrit un processus ou des relations, sinon null.`,
  chat: `Tu es l’assistant d’un étudiant. Réponds en français simple, en 2 à 5 phrases, UNIQUEMENT à partir des extraits de cours fournis. Si la réponse n’y est pas, dis-le clairement. Termine par la source entre crochets.`,
};

export async function onRequestPost({ request, env }) {
  if (env.ACCESS_CODE && request.headers.get("x-access-code") !== env.ACCESS_CODE) {
    return reply({ error: "Accès refusé : code testeur manquant ou incorrect." }, 401);
  }
  let body;
  try { body = await request.json(); } catch { return reply({ error: "Requête invalide." }, 400); }

  const kind = body.action === "chat" ? "chat" : "analyze";
  const input = kind === "chat"
    ? `Question : ${body.question}\n\nExtraits des cours :\n${body.context}`
    : `Titre du cours : ${body.title}\n\nTexte du chapitre :\n${body.text}`;
  if (input.length > MAX_CHARS) return reply({ error: "Texte trop long." }, 413);

  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM[kind] }] },
      contents: [{ role: "user", parts: [{ text: input }] }],
      generationConfig: kind === "analyze"
        ? { responseMimeType: "application/json", temperature: 0.3 }
        : { temperature: 0.3 },
    }),
  });
  if (!res.ok) return reply({ error: "Erreur du service IA.", status: res.status }, 502);

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  return reply({ text });
}

const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
