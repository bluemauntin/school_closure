/**
 * NEIS Open API - 학교기본정보 조회
 * https://open.neis.go.kr/portal/data/service/selectServicePage.do
 *
 * VITE_NEIS_API_KEY 환경변수가 있으면 인증키 사용 (전국 모든 학교 검색 가능)
 * 없으면 데모 키로 제한적 조회
 */

const NEIS_BASE = 'https://open.neis.go.kr/hub/schoolInfo'

/**
 * 시도교육청 코드 목록 (전국 17개 시도)
 */
const EDU_OFFICE_CODES = [
  'B10', // 서울
  'C10', // 부산
  'D10', // 대구
  'E10', // 인천
  'F10', // 광주
  'G10', // 대전
  'H10', // 울산
  'I10', // 세종
  'J10', // 경기
  'K10', // 강원
  'M10', // 충북
  'N10', // 충남
  'P10', // 전북
  'Q10', // 전남
  'R10', // 경북
  'S10', // 경남
  'T10', // 제주
]

/**
 * NEIS API 키 가져오기
 */
function getApiKey() {
  return import.meta.env.VITE_NEIS_API_KEY || ''
}

/**
 * 단일 시도교육청에서 학교 검색
 */
async function searchInOffice(keyword, officeCode, apiKey, pSize = 100) {
  try {
    const params = new URLSearchParams({
      Type: 'json',
      pIndex: '1',
      pSize: String(pSize),
      SCHUL_NM: keyword.trim(),
      ATPT_OFCDC_SC_CODE: officeCode,
    })

    if (apiKey) {
      params.set('KEY', apiKey)
    }

    const res = await fetch(`${NEIS_BASE}?${params}`)
    if (!res.ok) return []
    const data = await res.json()

    if (data.RESULT?.CODE === 'INFO-200') return []

    const rows = data.schoolInfo?.[1]?.row || []
    return rows.map(mapSchoolRow)
  } catch {
    return []
  }
}

// NEIS HS_SC_NM 정규화:
//   - "특성화고등학교" 형태(등학교 붙은 형태) → 단축형
//   - "특수목적고(등학교)": NEIS 4대 분류 중 하나. 마이스터고·과학고·외국어고 등이
//     이 값으로 내려올 수 있으므로 '특목고'로 매핑해 검색·필터에서 일관되게 처리
const HS_TYPE_MAP = {
  '특성화고등학교': '특성화고',
  '마이스터고등학교': '마이스터고',
  '일반고등학교': '일반고',
  '자율고등학교': '자율고',
  '특목고등학교': '특목고',
  '특수목적고등학교': '특목고',   // NEIS 4대 분류 대응
  '특수목적고': '특목고',         // NEIS 4대 분류 단축형 대응
  '외국어고등학교': '외국어고',
  '과학고등학교': '과학고',
  '예술고등학교': '예술고',
  '체육고등학교': '체육고',
  '국제고등학교': '국제고',
}

function normalizeHsType(raw = '') {
  return HS_TYPE_MAP[raw] || raw
}

/**
 * API 응답 row를 학교 객체로 변환
 */
function mapSchoolRow(s) {
  return {
    id: s.SD_SCHUL_CODE,
    name: s.SCHUL_NM,
    region: `${s.LCTN_SC_NM} ${s.JU_ORG_NM}`,
    type: s.SCHUL_KND_SC_NM,                        // 초등학교 / 중학교 / 고등학교
    hsType: normalizeHsType(s.HS_SC_NM || ''),      // 특성화고 / 마이스터고 / 일반고 / 자율고 등
    address: s.ORG_RDNMA,
    phone: s.ORG_TELNO,
    establish: s.FOND_SC_NM,
    officeCode: s.ATPT_OFCDC_SC_CODE,
    schoolCode: s.SD_SCHUL_CODE,
  }
}

/**
 * 학교명으로 전국 학교 검색
 * - API 키가 있으면: 전국 17개 시도교육청에 동시 요청 → 모든 학교 검색 가능
 * - API 키가 없으면: 단일 요청으로 제한적 검색
 *
 * @param {string} keyword - 검색어 (학교명)
 * @returns {Promise<Array>} 학교 목록
 */
export async function searchSchools(keyword) {
  if (!keyword || keyword.trim().length < 1) return []

  const apiKey = getApiKey()

  // API 키가 있으면 전국 동시 검색 (17개 시도교육청 병렬 요청)
  if (apiKey) {
    try {
      const promises = EDU_OFFICE_CODES.map((code) =>
        searchInOffice(keyword, code, apiKey, 100)
      )

      const results = await Promise.allSettled(promises)

      const allSchools = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value)

      // 중복 제거 (학교코드 기준)
      const seen = new Set()
      const unique = allSchools.filter((s) => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })

      // 학교명 정확도 순 정렬 (정확히 일치 → 시작 일치 → 포함)
      unique.sort((a, b) => {
        const aExact = a.name === keyword ? 0 : a.name.startsWith(keyword) ? 1 : 2
        const bExact = b.name === keyword ? 0 : b.name.startsWith(keyword) ? 1 : 2
        if (aExact !== bExact) return aExact - bExact
        return a.name.localeCompare(b.name, 'ko')
      })

      return unique.slice(0, 30) // 최대 30개 표시
    } catch (err) {
      console.error('NEIS 전국 검색 오류:', err)
      return []
    }
  }

  // API 키 없음: 기존 단일 요청 (제한적)
  try {
    const params = new URLSearchParams({
      Type: 'json',
      pIndex: '1',
      pSize: '20',
      SCHUL_NM: keyword.trim(),
    })

    const res = await fetch(`${NEIS_BASE}?${params}`)
    if (!res.ok) throw new Error('API 오류')
    const data = await res.json()

    if (data.RESULT?.CODE === 'INFO-200') return []

    const rows = data.schoolInfo?.[1]?.row || []
    return rows.map(mapSchoolRow)
  } catch (err) {
    console.error('NEIS API 오류:', err)
    return []
  }
}

/**
 * 학교 학년별 "학급 수" 조회
 *
 * 주의: NEIS classInfo(학급정보)에는 학생 수(인원) 필드가 없다.
 * 응답의 한 행(row)은 "한 학급"을 의미하며 GRADE/CLASS_NM만 제공한다.
 * 따라서 학생 수는 구할 수 없고, 학년별 학급 "개수"만 집계할 수 있다.
 * (과거 구현은 존재하지 않는 r.CNT 를 읽어 모든 값을 0으로 만들었고,
 *  이것이 "신입생 0명" 그래프의 원인이었다.)
 *
 * 반환값의 grades[].count 는 학생 수가 아니라 "학급 수"이며,
 * _isClassCount 플래그로 학생 수 데이터와 구분한다.
 */
export async function fetchClassCounts(officeCode, schoolCode) {
  try {
    const apiKey = getApiKey()
    const params = new URLSearchParams({
      Type: 'json',
      pIndex: '1',
      pSize: '200',
      ATPT_OFCDC_SC_CODE: officeCode,
      SD_SCHUL_CODE: schoolCode,
    })

    if (apiKey) {
      params.set('KEY', apiKey)
    }

    const res = await fetch(`https://open.neis.go.kr/hub/classInfo?${params}`)
    if (!res.ok) throw new Error('API 오류')
    const data = await res.json()

    if (data.RESULT?.CODE === 'INFO-200') return null

    const rows = data.classInfo?.[1]?.row || []
    if (rows.length === 0) return null

    // 가장 최신 학년도만 사용
    const latestYear = Math.max(...rows.map(r => Number(r.AY) || 0))
    const latestRows = rows.filter(r => Number(r.AY) === latestYear)

    // 학년별 학급 개수 = 해당 GRADE 의 row 개수
    const classByGrade = {}
    latestRows.forEach(r => {
      const g = Number(r.GRADE)
      if (!g) return
      classByGrade[g] = (classByGrade[g] || 0) + 1
    })

    const grades = Object.entries(classByGrade)
      .map(([g, c]) => ({ grade: Number(g), count: c }))
      .sort((a, b) => a.grade - b.grade)

    if (grades.length === 0) return null

    return {
      grades,
      year: String(latestYear),
      total: grades.reduce((acc, g) => acc + g.count, 0),
      _isClassCount: true, // count 는 "학급 수"(학생 수 아님)
    }
  } catch (error) {
    console.error('NEIS fetchClassCounts Error:', error)
    return null
  }
}
