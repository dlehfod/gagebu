// Gemini API 호출 서버 함수 (Vercel Node.js & Edge / 로컬 호환)
const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

const SYSTEM_PROMPT = `너는 한국 1인 기업가를 위한 친근하고 솔직하며 매우 똑똑한 1:1 전담 맞춤 재무 파트너야.
사용자가 제공한 전체 가계부 내역(최근 수입 건별 내역, 지출 건별 카테고리와 세부메모, 고정비 현황, 현재 전재산 등)을 세세하게 전부 다 훑어보고 종합 분석해.

[사용자 프로필 & 비즈니스]
- 나이: 43세, 1인 가구 (미혼)
- 직업 & 사업 구성 (1인 디지털 사업가):
  * 1) 사주 웹사이트: 자동화 시스템으로 24시간 자동 결제/수입이 발생하는 구조
  * 2) 온라인 타로 상담: 재택근무로 직접 전화나 카카오톡을 통해 고객과 1:1로 진행하는 상담 (상담 시간과 정성을 직접 투입하여 수익 발생, 절대 자동화가 아님)
- 근무 환경: 24시간 거의 대부분 집에서 일하고 생활하는 순수 재택 환경 (집에서 전화/카톡 타로 상담 및 사주 웹사이트 운영)
- 식생활 패턴: 집에서 직접 요리하지 않고 주로 배달을 시켜먹거나 밖에서 사먹음 (식비가 배달팁/외식비 위주로 자주 발생함)
- 유흥/소비 패턴: 나이트, 소개팅/채팅 어플, 이성 만남, 차비 등의 지출이 발생함
- 사용자 핵심 목표: summary.사용자_재정목표 (예: "총자산 1억 모으기")
- 재정 특성:
  * 개인 생활비와 사업비(사주 웹 서버비, 툴 구독, 마케팅/광고비 등), 고정비(월세 등)가 공존함
  * 사업비와 고정비는 순수 생활비(용돈 한도)에서 제외하고 따로 집계함

[★ 가장 중요한 작성 원칙: 정형화된 틀이나 템플릿 완전 배제 ★]
1. "1. 제목 - 내용", "2. 제목 - 내용" 같은 기계적인 번호 매기기나 판에 박힌 템플릿 양식을 절대 쓰지 마.
2. 마치 대표님을 오래전부터 곁에서 지켜본 든든한 전담 재정 코치가, 이번 달 실제 가계부 영수증과 입금 내역을 하나하나 다 살펴본 뒤 자연스럽고 깊이 있게 이야기해 주는 맞춤형 편지/진단 글처럼 작성해.
3. 제공된 상세 내역에 적힌 실제 메모(예: 배달, 나이트, 어플, 특정 식비, 광고비 등)와 수입 내역(사주 웹 자동 수입, 타로 상담 수입)을 구체적으로 직접 언급하면서 분석해줘. 없는 숫자는 지어내지 말고 실제 데이터를 인용해.
4. 대표님의 최우선 목표인 [사용자_재정목표, 예: 총자산 1억 모으기]를 달성하기 위해, 지금 시점에서 어디를 조이고 어디를 집중해야 하는지 현실적이고 따뜻하며 솔직한 통찰을 전해줘.
5. 문단과 단락 구분을 넉넉하고 읽기 편하게 띄어쓰기를 잘해서 작성하고, 친근하고 신뢰감 있는 다정한 존댓말로 써줘.
6. 투자 종목 추천이나 대출 권유 같은 금융상품 판매성 발언은 절대 하지 마.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    adviceText: {
      type: 'STRING',
      description: '틀이나 템플릿 없이 자연스럽고 깊이 있게 작성된 자유 형식의 맞춤 재무 조언 본문 (줄바꿈과 문단 구분이 잘 된 텍스트)',
    },
  },
  required: ['adviceText'],
};

async function callGemini(summary: any, qa: { q: string; a: string }[], apiKey: string) {
  let userText = `이번 달 가계부 전체 데이터(JSON):\n${JSON.stringify(summary, null, 2)}`;
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
            temperature: 0.7,
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

async function callGeminiChat(summary: any, chatMessages: { role: 'user' | 'assistant'; content: string }[], apiKey: string) {
  const goal = summary?.사용자_재정목표 || '총자산 1억 모으기';
  const contextText = `너는 한국 1인 기업가(43세, 미혼, 사주 웹 자동화 수입 + 집에서 전화/카톡으로 1:1 온라인 타로 상담 진행, 배달/외식 위주)를 위한 친근하고 똑똑한 1:1 맞춤 재무 코치야.
- 사주 웹사이트: 자동화로 결제/수입이 자동으로 발생하는 구조
- 타로 상담: 재택근무로 직접 전화나 카카오톡을 통해 고객과 1:1로 시간을 들여 상담하는 직접 수익 모델 (절대 자동화가 아님)
사용자의 최우선 핵심 목표는 [${goal}]이야. 대화할 때 사용자가 이 목표를 달성할 수 있도록 지출 관리, 저축, 사업 마진 등에 대해 항상 목표 관점에서 실질적인 솔루션을 제시하고 격려해줘.
항상 다정하고 실용적인 존댓말로, 띄어쓰기와 문단 구분을 깔끔하게 해서 읽기 편하게 답변해줘.
사용자의 가계부 요약 데이터(JSON):
${JSON.stringify(summary, null, 2)}
`;

  const contents = [
    { role: 'user', parts: [{ text: contextText }] },
    { role: 'model', parts: [{ text: '네, 대표님의 이번 달 가계부 상황을 파악했습니다. 무엇이든 편하게 물어보세요!' }] },
    ...chatMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
          },
        }),
      });

      if (!res.ok) {
        if (res.status === 404) continue;
        const detail = await res.text();
        throw new Error(`Gemini 채팅 실패 (${res.status}): ${detail.slice(0, 150)}`);
      }

      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
      return { reply: text };
    } catch (err: any) {
      if (err.message && err.message.includes('404')) continue;
      throw err;
    }
  }

  throw new Error('채팅 응답 생성에 실패했습니다.');
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

    // 1) 추가 채팅 질문 요청인 경우
    if (body.chatMessages && Array.isArray(body.chatMessages)) {
      const chatResult = await callGeminiChat(body.summary, body.chatMessages, apiKey);
      return res.status(200).json(chatResult);
    }

    // 2) 초기 종합 조언 요청인 경우
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

    // 1) 추가 채팅 질문 요청인 경우
    if (body.chatMessages && Array.isArray(body.chatMessages)) {
      const chatResult = await callGeminiChat(body.summary, body.chatMessages, apiKey);
      return json(chatResult);
    }

    // 2) 초기 종합 조언 요청인 경우
    const result = await callGemini(body.summary, body.qa || [], apiKey);
    return json(result);
  } catch (err: any) {
    return json({ error: err?.message || 'AI 분석 중 오류가 발생했습니다.' }, 500);
  }
}
