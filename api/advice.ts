// Gemini API 호출 서버 함수 (Vercel Node.js & Edge / 로컬 호환)
const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

const SYSTEM_PROMPT = `너는 한국 1인 기업가를 위한 친근하고 솔직한 맞춤 재무 코치야.

[사용자 프로필 & 라이프스타일]
- 나이: 43세, 1인 가구 (미혼)
- 직업 & 사업: 재택근무 기반 1인 디지털 사업가
  * 온라인 타로 상담 및 사주 웹사이트 자동화 수익을 운영함
  * 사업 매출과 수입이 자동/비정기적으로 들어오는 구조임
- 근무 환경: 24시간 거의 대부분 집에서 일하고 생활하는 순수 재택 환경
- 식생활 패턴: 집에서 직접 요리하지 않고 주로 배달을 시켜먹거나 밖에서 사먹음 (식비가 배달팁/외식비 위주로 자주 발생함)
- 재정 특성:
  * 개인 생활비와 사업비(서버비, 툴 구독, 마케팅 등), 고정비(월세 등)가 공존함
  * 사업비와 고정비는 순수 생활비(용돈 한도)에서 제외하고 따로 집계함

[조언 시 필수 규칙]
1. 위 사용자의 [재택근무 + 배달/외식 식습관 + 온라인 사업가]라는 특성을 완벽히 이해하고 조언에 자연스럽게 녹여내.
   - 예: "하루종일 재택근무를 하시다 보니 배달이나 카페/간식 지출이 쉽게 늘어날 수 있어요", "자동 수입이 잘 들어오는 시기에 생활비 통장과 비상금을 어떻게 분리할지" 등
2. 반드시 제공된 JSON 가계부 요약의 실제 숫자만 근거로 말하고, 없는 숫자는 절대 지어내지 마. 금액은 항상 '1,234,000원' 형태로 쉼표와 '원'을 붙여.
3. '생활비'는 사업비·고정비를 뺀 지출이야. 생활비 한도 대비 남은 기간 동안 '하루 권장 식비/생활비', '월말 예상 사용액'을 구체적인 숫자로 계산해 줘.
4. 조언은 4~6개로 구성해. 각 조언은 title(한 줄 핵심 요약)과 body(재택/배달 특성을 고려한 2~3문장의 구체적인 실천 제안)로 작성해. 말투는 친근하고 다정한 존댓말.
5. level은 danger(위험/초과), warn(주의/위태), good(칭찬/안정), info(정보/팁) 중 하나를 쓰고 알맞은 emoji를 1개 붙여.
6. 더 정확하고 날카로운 코칭을 위해 사용자에게 물어볼 핵심 질문이 있다면 questions에 1~3개 넣어줘. (예: 배달 지출 패턴, 사업 툴 구독료나 서버비 비중, 이번 달 목표 저축 등)
7. 사용자의 이전 답변(answers)이 있다면 그 내용을 깊이 있게 반영해서 한 단계 더 들어간 실질적 풀이를 제공해.
8. 투자 종목 추천이나 대출 권유 같은 금융상품 판매성 발언은 절대 하지 마.`;

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

async function callGemini(summary: any, qa: { q: string; a: string }[], apiKey: string) {
  let userText = `이번 달 가계부 요약(JSON):\n${JSON.stringify(summary)}`;
  if (qa && qa.length > 0) {
    userText +=
      '\n\n사용자가 앞선 질문에 한 답변:\n' + qa.map((x, i) => `${i + 1}. Q: ${x.q}\n   A: ${x.a}`).join('\n');
  }

  let lastError: Error | null = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: {
            temperature: 0.6,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        // 404(모델 없음)인 경우 다음 최신 모델로 시도
        if (res.status === 404) {
          console.warn(`모델 ${modelName} 미지원(404), 다음 후보 모델로 시도합니다.`);
          lastError = new Error(`Gemini ${modelName} 미지원: ${detail.slice(0, 100)}`);
          continue;
        }
        throw new Error(`Gemini 호출 실패 (${res.status}): ${detail.slice(0, 150)}`);
      }

      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
      return JSON.parse(text);
    } catch (err: any) {
      if (err.message && err.message.includes('404')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('모든 Gemini 모델 호출에 실패했습니다.');
}

// Node.js 표준 Serverless Function 핸들러 (Vercel 기본값)
export default async function handler(req: any, res: any) {
  // Web Request (Edge 런타임 호환)
  if (typeof req.json === 'function' || !(res && typeof res.status === 'function')) {
    return handleWebRequest(req);
  }

  // Node.js IncomingMessage (일반 Vercel 런타임)
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았어요.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!body.summary) {
      return res.status(400).json({ error: '가계부 요약 데이터가 필요합니다.' });
    }

    const result = await callGemini(body.summary, body.qa || [], apiKey);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'AI 분석 중 오류가 발생했습니다.' });
  }
}

// Web Fetch API 표준 요청 처리
export async function POST(request: Request): Promise<Response> {
  return handleWebRequest(request);
}

async function handleWebRequest(request: Request): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았어요.' }, 500);
  }

  try {
    const body: any = await request.json();
    if (!body?.summary) {
      return json({ error: '가계부 요약 데이터가 필요합니다.' }, 400);
    }
    const result = await callGemini(body.summary, body.qa || [], apiKey);
    return json(result);
  } catch (err: any) {
    return json({ error: err?.message || 'AI 분석 중 오류가 발생했습니다.' }, 500);
  }
}
