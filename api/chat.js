// Vercel serverless function — natural-language → structured filters.
// The user describes what they need; Claude returns {filters, reply}:
//   filters = the COMPLETE current filter set (everything understood so far)
//   reply   = a short clarifying question (or confirmation)
// History is sent each turn so the AI can interpret answers to its own questions.

const MODEL = "claude-haiku-4-5-20251001";
// --- Rate limiting (in-memory, per IP) ---
const RATE_LIMIT = 20;          // max requests
const RATE_WINDOW = 60 * 1000;  // per 60 seconds
const hits = new Map();         // ip -> [timestamps]

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}
// These enum values MUST match src/data.js exactly, or filtering breaks.
const CATEGORIES = [
  "Мясо и птица",
  "Овощи и фрукты",
  "Бакалея",
  "Молочка",
  "Заморозка",
  "Рыба и морепродукты",
  "Напитки",
  "Упаковка и расходники",
];

const SYSTEM_PROMPT = `Ты — ассистент по подбору поставщиков продуктов питания в Екатеринбурге. Пользователь описывает, что ему нужно, обычным языком. Твоя задача — превратить запрос в структурированные фильтры И задать ОДИН уточняющий вопрос про фильтр, который пользователь ещё не указал.

Ты ВСЕГДА отвечаешь СТРОГО в формате JSON, без markdown, без пояснений, без текста до или после. Ровно такая структура:

{
  "filters": {
    "categories": [],
    "city": "any",
    "producer": "any",
    "delivery": "any",
    "horeca": "any",
    "halal": "any"
  },
  "reply": "короткий уточняющий вопрос на русском"
}

ПРАВИЛА ПО ПОЛЯМ:

"categories" — массив. Допустимы ТОЛЬКО эти значения (выбирай ближайшие по смыслу):
${CATEGORIES.map((c) => `  - "${c}"`).join("\n")}
Примеры сопоставления: "курица","говядина","фарш" → "Мясо и птица"; "картошка","зелень","фрукты" → "Овощи и фрукты"; "крупы","мука","макароны","сахар" → "Бакалея"; "сыр","молоко","сметана" → "Молочка"; "заморозка","замороженные" → "Заморозка"; "рыба","морепродукты","креветки" → "Рыба и морепродукты"; "вода","соки","напитки" → "Напитки"; "упаковка","контейнеры","посуда","плёнка" → "Упаковка и расходники". Если категория не ясна — оставь пустой массив [].

"city" — "Екатеринбург" или "any". Сейчас в базе только Екатеринбург, поэтому если город не важен или не назван — "any".

"producer" — "producer" (нужен производитель), "distributor" (дистрибьютор/перепродажа), или "any".

"delivery" — "own" (своя доставка), "pickup" (самовывоз), "russia" (доставка по России), или "any".

"horeca" — "yes" если упомянуты ресторан/кафе/общепит/HoReCa/столовая/бар; иначе "any".

"halal" — "yes" если упомянут халяль; иначе "any".

ВАЖНО:
- В "filters" всегда возвращай ПОЛНУЮ картину: все фильтры, которые удалось понять из ВСЕХ сообщений пользователя (с учётом истории), а не только из последнего. Это полный текущий набор, который заменит фильтры целиком.
- Не выдумывай фильтры, которых пользователь не подтверждал. Если не уверен — "any" или [].
- "reply": задай ОДИН короткий, естественный уточняющий вопрос про поле, которое всё ещё "any"/пустое и которое поможет сузить поиск. Если всё уже понятно — просто подтверди подбор одной фразой. Не перечисляй фильтры списком, говори как живой человек.
- Если пользователь отвечает на твой предыдущий вопрос — учитывай это и обнови нужное поле.

Отвечай ТОЛЬКО JSON-объектом.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
 const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({
      error: "rate_limited",
      reply: "Слишком много запросов. Подождите немного и попробуйте снова.",
    });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages required" });
    }

    // Keep payload bounded — last 12 turns is plenty for this task.
    const trimmed = messages.slice(-12);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text();
      return res.status(502).json({ error: "Upstream error", detail: text });
    }

    const data = await anthropicRes.json();
    const raw = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    // Parse the JSON Claude returned (strip stray fences just in case).
    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      // If parsing fails, degrade gracefully: no filter change, surface text.
      return res.status(200).json({
        filters: null,
        reply: raw || "Не удалось разобрать запрос. Попробуйте переформулировать.",
      });
    }

    return res.status(200).json({
      filters: parsed.filters ?? null,
      reply: parsed.reply ?? "",
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
