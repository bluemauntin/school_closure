const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// CJK 통합한자 + 확장 블록 + 일본어 가나 전체 제거
const CJK_RE = /[⺀-⻿⼀-⿟぀-ヿ㐀-䶿一-鿿豈-﫿]/g

function stripCJK(text) {
  if (typeof text !== 'string') return text
  return text.replace(CJK_RE, '').replace(/\s{2,}/g, ' ').trim()
}

function sanitizeObj(obj) {
  if (!obj || typeof obj !== 'object') return obj
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, stripCJK(v)]))
}

const KOREAN_ONLY_RULE =
  '[언어 절대 규칙] 응답의 모든 텍스트는 반드시 한국어(한글)로만 작성하세요. ' +
  '한자(漢字)를 절대 사용하지 마세요. 예를 들어 연도 표기는 반드시 "2024년"으로 쓰고 "2024年" 또는 "2024年的"처럼 한자를 절대 쓰지 마세요. ' +
  '영어 단어도 단 하나라도 사용하지 마세요. ' +
  '오직 순수한 한글, 숫자, 문장부호만 허용됩니다. 한자나 영어를 사용하면 업무 실패로 간주됩니다.'

async function callGroq(messages, options = {}) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('Groq API 키가 설정되지 않았습니다. .env 파일을 확인하세요.')
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: options.maxTokens || 600,
      temperature: options.temperature ?? 0.7,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API 오류 (${response.status})`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/** 학교 폐교 위험도 예측 */
export async function predictSchoolClosure(school) {
  const hasEnrollment = school.enrollment && school.enrollment.length > 0
  const enrollmentStr = hasEnrollment
    ? school.enrollment.map((e) => `${e.year}년 ${e.count}명`).join(', ')
    : '데이터 없음'

  const userContent = hasEnrollment
    ? `다음 학교의 폐교 위험도를 분석해주세요.

학교명: ${school.name}
지역: ${school.region || school.address || '알 수 없음'}
유형: ${school.type}
연도별 신입생 수: ${enrollmentStr}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "risk": "고위험 또는 주의 또는 안전",
  "expectedYear": "예상 폐교 연도(예: 2028년 예상) 또는 당분간 안전",
  "analysis": "2~3문장 분석 근거",
  "recommendation": "단기 권고사항 한 문장"
}`
    : `신입생 통계 데이터 없이 아래 학교의 폐교 위험도를 지역·학교유형 기반으로 추정해주세요.

학교명: ${school.name}
지역: ${school.region || school.address || '알 수 없음'}
유형: ${school.type}

한국의 지역별 학령인구 감소 트렌드, 농촌·도시 여부, 학교 유형을 종합적으로 고려해서 분석하세요.

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "risk": "고위험 또는 주의 또는 안전",
  "expectedYear": "예상 폐교 시기(예: 2030년 이후 주의 필요) 또는 당분간 안전",
  "analysis": "지역 특성과 학교 유형 기반 2~3문장 분석",
  "recommendation": "단기 권고사항 한 문장"
}`

  const messages = [
    {
      role: 'system',
      content:
        `당신은 한국 교육 통계를 분석하는 전문가입니다. 학교 신입생 수 추이 또는 지역 특성을 바탕으로 폐교 위험도를 평가합니다. 답변은 반드시 정중한 존댓말을 사용하세요. ${KOREAN_ONLY_RULE} JSON 형식을 엄격히 준수하세요.`,
    },
    {
      role: 'user',
      content: userContent,
    },
  ]

  const content = await callGroq(messages, { maxTokens: 400, temperature: 0.2 })
  const match = content.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      return sanitizeObj(parsed)
    } catch {
      // fallback
    }
  }
  return {
    risk: '분석불가',
    expectedYear: '알 수 없음',
    analysis: stripCJK(content),
    recommendation: '',
  }
}

/** 폐교 관련 뉴스 요약 생성 */
export async function generateNewsSummaries() {
  const messages = [
    {
      role: 'system',
      content: `당신은 한국 교육 뉴스를 요약하는 기자입니다. JSON 배열만 응답하세요. 답변은 반드시 정중한 존댓말을 사용하세요. ${KOREAN_ONLY_RULE}`,
    },
    {
      role: 'user',
      content: `2023~2025년 한국 폐교 관련 실제 정보를 바탕으로 뉴스 카드 4개를 만들어주세요.
실제 통계(2024년 누적 폐교 3,955곳, 연간 33곳 폐교 등)를 반영해서 현실감 있게 작성하세요.

다음 JSON 배열 형식으로만 응답하세요:
[
  {
    "tag": "카테고리(정책/통계/사례/교육 중 하나)",
    "title": "뉴스 제목(30자 이내)",
    "summary": "2문장 요약",
    "date": "2024.MM.DD 형식"
  }
]`,
    },
  ]

  const content = await callGroq(messages, { maxTokens: 700, temperature: 0.5 })
  const match = content.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      return parsed.map(item => sanitizeObj(item))
    } catch {
      return []
    }
  }
  return []
}
