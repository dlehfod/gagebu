// Gemini API 호출 서버 함수 (Vercel Functions / 로컬 dev 서버 공용)
// API 키는 브라우저에 노출되지 않도록 서버 환경변수 GEMINI_API_KEY 에서만 읽는다.

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `너는 한국 개인 가계부 앱 안의 친근하고 솔직한 재무 코치야.
사용자는 사업(사업비)도 하고 고정비도 있는 1인 가구야. 아래 JSON 가계부 요약(이번 달 기준)을 보고 조언해.

규칙:
- 반드시 제공된 숫자만 근거로 말하고, 없는 숫자는 지어내지 마. 금액은 '1,234,000원'처럼 쉼표와 '원'을 붙여.
- '생활비'는 사업비·고정비를 뺀 지출이야. 생활비 한도 기준으로 하루 권장 사용액, 월말 예상 등을 구체적으로 계산해서 말해.
- 조언은 4~6개. 각 조언은 title(한 줄 요약)과 body(2~3문장, 구체적인 행동 제안)로 써. 말투는 부드러운 존댓말.
- level은 danger(위험), warn(주의), good(잘하고 있음), info(참고) 중 하나. emoji는 이모지 1개.
- 더 정확하게 풀이하려면 사용자에게 꼭 물어봐야 할 것이 있으면 questions에 짧은 질문을 최대 3개 넣어. (예: 이번 달 큰 사업비의 성격, 수입이 불규칙한지, 이번 달 목표 저축액, 줄이기 힘든 지출이 뭔지)
- 이미 사용자의 답변(answers)이 있으면 그 내용을 반영해서 더 구체적이고 자세하게 풀이해. 이미 물어본 질문은 다시 묻지 말고, 정말 더 필요할 때만 질문 1개까지 해. 충분하면 questions는 빈 배열.
- 투자 종목 추천, 대출 권유 같은 금융상품 판매성 조언은 하지 마.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    advice: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          level: { type: 'STRING', enum: ['danger', 'warn', 'good', 'info'] },
          emoji: { type: 'STRING' },
          title: { type: 'STRING' },
          body: { type: 'STRING' },
        },
        required: ['level', 'emoji', 'title', 'body'],
      },
    },
    questions: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['advice', 'questions'],
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았어요.' }, 500);

  let body: { summary?: unknown; qa?: { q: string; a: string }[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: '잘못된 요청이에요.' }, 400);
  }
  if (!body.summary) return json({ error: '가계부 요약이 없어요.' }, 400);

  const qa = Array.isArray(body.qa) ? body.qa : [];
  let userText = `이번 달 가계부 요약(JSON):\n${JSON.stringify(body.summary)}`;
  if (qa.length > 0) {
    userText +=
      '\n\n사용자가 앞선 질문에 한 답변:\n' + qa.map((x, i) => `${i + 1}. Q: ${x.q}\n   A: ${x.a}`).join('\n');
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: `Gemini 호출 실패 (${res.status})`, detail: detail.slice(0, 300) }, 502);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
  try {
    return json(JSON.parse(text));
  } catch {
    return json({ error: 'AI 응답을 읽지 못했어요.' }, 502);
  }
}
