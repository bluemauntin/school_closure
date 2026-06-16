/**
 * 학교알리미 OpenAPI (schoolinfo.go.kr) — 학년별 학생 수 공시 데이터
 *
 * 동작하는 호출 형태(실측):
 *   GET /openApi.do?apiKey=KEY&apiType=09
 *       &schulKndCode={02|03|04}&sidoCode=NN&sggCode=NNNNN&pbanYr=YYYY
 *   → 해당 시군구의 모든 학교가 학년별 학생 수 컬럼과 함께 내려온다.
 *   (apiType 값이 곧 공시항목 코드: 0=학교기본정보, 09=학년별·학급별 학생수)
 *   학생 수 데이터는 최근 약 2~3개년만 제공된다.
 *
 * 주요 응답 필드(항목 09 = 학년별·학급별 학생수):
 *   SCHUL_NM, SCHUL_CODE
 *   COL_S1..COL_S6 = 학년별 학생 수 (COL_S1 = 1학년 = 신입생)
 *   COL_S_SUM      = 전교생 수
 *   TEACH_CNT      = 교사 수
 *
 * schoolinfo.go.kr 은 CORS 헤더를 주지 않으므로 브라우저에서 직접 호출 불가.
 * 개발(Vite)·배포(Vercel) 모두 '/sapi' 프록시를 통해 호출한다.
 */

import { SIGUNGU } from '../data/sigunguCodes'
import { buildTenYearTrend } from './trend'

const API_BASE = '/sapi/openApi.do'

function getApiKey() {
  return import.meta.env.VITE_SCHOOLINFO_API_KEY
}

// 시도명(또는 주소) → 학교알리미 sidoCode
const SIDO_PREFIX = [
  ['서울', '11'], ['부산', '26'], ['대구', '27'], ['인천', '28'],
  ['광주', '29'], ['대전', '30'], ['울산', '31'], ['세종', '36'],
  ['경기', '41'], ['충청북', '43'], ['충북', '43'], ['충청남', '44'], ['충남', '44'],
  ['전라북', '52'], ['전북', '52'], ['전라남', '46'], ['전남', '46'],
  ['경상북', '47'], ['경북', '47'], ['경상남', '48'], ['경남', '48'],
  ['제주', '50'], ['강원', '51'],
]

// 학교 유형 → schulKndCode (초/중/고만 학생 수 공시 지원)
function toKndCode(type = '') {
  if (type.includes('초등')) return '02'
  if (type.includes('중학')) return '03'
  if (type.includes('고등')) return '04'
  return null
}

function matchSidoCode(text = '') {
  for (const [prefix, code] of SIDO_PREFIX) {
    if (text.startsWith(prefix) || text.includes(prefix)) return code
  }
  return null
}

/**
 * 학교의 주소/지역 문자열에서 sidoCode + sggCode 를 해석
 */
export function resolveRegionCodes(school) {
  const addr = `${school.address || ''} ${school.region || ''}`.trim()
  if (!addr) return null

  const sidoCode = matchSidoCode(addr)
  if (!sidoCode) return null

  const candidates = SIGUNGU.filter(s => s.sido === sidoCode)
  let best = null
  for (const c of candidates) {
    const parts = c.name.split(/\s+/)
    if (parts.every(p => addr.includes(p))) {
      if (!best || c.name.length > best.name.length) best = c
    }
  }
  if (!best) return null
  return { sidoCode, sggCode: best.sgg }
}

// (sido,sgg,knd,year) 단위 시군구 학교 목록 캐시 — 추이 조회 시 재호출 방지
const listCache = new Map()

async function fetchRegionList(sidoCode, sggCode, kndCode, year) {
  const apiKey = getApiKey()
  if (!apiKey) return null

  const key = `${sidoCode}-${sggCode}-${kndCode}-${year}`
  if (listCache.has(key)) return listCache.get(key)

  const params = new URLSearchParams({
    apiKey,
    apiType: '09',   // 학년별·학급별 학생수 (apiType 값이 곧 공시항목 코드)
    schulKndCode: kndCode,
    sidoCode,
    sggCode,
    pbanYr: String(year),
  })

  try {
    const res = await fetch(`${API_BASE}?${params}`)
    if (!res.ok) { listCache.set(key, null); return null }
    const data = await res.json()
    console.log(`[schoolInfo] fetchRegionList (sido=${sidoCode} sgg=${sggCode} knd=${kndCode} year=${year}) resultCode=`, data?.resultCode, '/ list.length=', data?.list?.length)
    // resultCode 비교를 대소문자 무시로 처리
    const rc = String(data?.resultCode || '').toLowerCase()
    const list = (rc === 'success' || rc === '200' || Array.isArray(data?.list)) ? (data.list || []) : null
    listCache.set(key, list)
    return list
  } catch (e) {
    console.error('[schoolInfo] fetchRegionList error:', e)
    listCache.set(key, null)
    return null
  }
}

const normName = (n = '') => n.replace(/\s+/g, '')

/**
 * 학교의 학년별 학생 수 + 신입생(1학년) 연도별 추이 조회
 *
 * @param {object} school - { name, type, address, region } (NEIS 검색 결과)
 * @returns studentInfo | null
 */
export async function fetchStudentStatus(school, years = [2025, 2024, 2023]) {
  if (!school?.name) return null

  const kndCode = toKndCode(school.type || '')
  if (!kndCode) {
    console.log('[schoolInfo] fetchStudentStatus: 지원 안 되는 학교 유형:', school.type)
    return null
  }

  const codes = resolveRegionCodes(school)
  console.log('[schoolInfo] fetchStudentStatus:', school.name, '/ addr:', `${school.address || ''} ${school.region || ''}`.trim(), '/ codes:', codes)
  if (!codes) return null

  const target = normName(school.name)

  // 연도별로 해당 시군구 목록을 받아 학교명으로 매칭
  const perYear = await Promise.all(
    years.map(async (y) => {
      const list = await fetchRegionList(codes.sidoCode, codes.sggCode, kndCode, y)
      if (!list) return null
      const rec = list.find(r => normName(r.SCHUL_NM) === target)
      return rec ? { year: y, rec } : null
    })
  )

  const found = perYear.filter(Boolean)
  if (found.length === 0) return null

  // years 는 최신순 → found[0] 이 가장 최신 연도
  const latest = found[0]
  const rec = latest.rec

  // 학년별 학생 수 (COL_S1..COL_S6)
  const grades = []
  for (let g = 1; g <= 6; g++) {
    const count = Number(rec[`COL_S${g}`] || 0)
    if (count > 0) grades.push({ grade: g, count })
  }

  const gradeSum = grades.reduce((acc, g) => acc + g.count, 0)
  const total = Number(rec.COL_S_SUM || 0) || gradeSum
  const teachers = Number(rec.TEACH_CNT || 0) || null

  // 신입생(1학년) 추이용 점 구성:
  //  - 각 공시연도 Y 의 g학년 학생수(COL_S{g}) ≈ (Y-(g-1))년 신입생 (코호트 역산)
  //  - g=1 은 그 해 실측 신입생(actual), g>=2 는 추정(cohort)
  //  - 같은 연도가 겹치면 actual 우선, 그다음 g 가 작은(=가까운 시점에 관측된) 값 우선
  const bestByYear = new Map()
  for (const f of found) {
    for (let g = 1; g <= 6; g++) {
      const c = Number(f.rec[`COL_S${g}`] || 0)
      if (c <= 0) continue
      const entryYear = f.year - (g - 1)
      const kind = g === 1 ? 'actual' : 'cohort'
      const cur = bestByYear.get(entryYear)
      const better =
        !cur ||
        (kind === 'actual' && cur.kind !== 'actual') ||
        (kind === cur.kind && g < cur.g)
      if (better) bestByYear.set(entryYear, { year: entryYear, count: c, kind, g })
    }
  }

  const latestYear = Math.max(...found.map(f => f.year))
  const yearlyTrend = buildTenYearTrend([...bestByYear.values()], latestYear)

  return {
    year: String(latest.year),
    grades,
    total,
    teachers,
    yearlyTrend, // 항상 10개년 (actual/cohort/estimate 혼합)
    schoolCode: rec.SCHUL_CODE,
  }
}
