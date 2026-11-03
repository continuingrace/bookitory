const ALLOWED_ORIGINS = new Set([
  "https://continuingrace.github.io",
  "https://bookitory-secure.netlify.app",
]);

function corsHeaders(origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60, s-maxage=300",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

exports.handler = async (event) => {
  const origin = event.headers?.origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    if (!ALLOWED_ORIGINS.has(origin)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: "Origin not allowed" }) };
    }
    return {
      statusCode: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Origin not allowed" }) };
  }

  const query = (event.queryStringParameters?.q || "").trim();
  if (!query || query.length > 100) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "검색어는 1~100자로 입력해 주세요." }) };
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server configuration error" }) };
  }

  try {
    const url = `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=12`;
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: "Kakao book search failed" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ documents: data.documents || [], meta: data.meta || {} }),
    };
  } catch {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Book search service unavailable" }),
    };
  }
};
