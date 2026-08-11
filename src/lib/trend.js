/**
 * 신입생(1학년) 10년 추이 구성 유틸
 *
 * 학교알리미 OpenAPI는 최근 약 2년치 학생 수만 제공하므로, 10년 추이는
 * 아래 3종류 데이터를 합쳐 구성한다(각 점은 kind 로 구분):
 *   - actual   : 그 해 1학년(COL_S1) 실측값 / 로컬 샘플 실측값
 *   - cohort   : 최근 학년별 분포로 역산한 과거 신입생 추정값
 *                (예: 2025년 3학년 수 ≈ 2023년 신입생 수)
 *   - estimate : 그래도 비는 과거 연도를 추세선으로 외삽한 추정값
 */

export const TREND_YEARS = 10

const KIND_PRIORITY = { actual: 3, cohort: 2, estimate: 1 }

// 알려진 점들로 최소제곱 1차 추세선 계산 → 특정 연도 값 외삽
function linearProjector(points) {
  const n = points.length
  if (n === 0) return null
  if (n === 1) return () => points[0].count
  const sx = points.reduce((a, p) => a + p.year, 0)
  const sy = points.reduce((a, p) => a + p.count, 0)
  const sxx = points.reduce((a, p) => a + p.year * p.year, 0)
  const sxy = points.reduce((a, p) => a + p.year * p.count, 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return () => sy / n
  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n
  return (year) => slope * year + intercept
}

/**
 * 알려진 점들을 받아 endYear 기준 최근 10년 추이 배열을 만든다.
 * @param {Array<{year:number,count:number,kind?:string}>} known
 * @param {number} [endYear] 마지막 연도(기본: known 의 최대 연도)
 * @returns {Array<{year:number,count:number,kind:string}>}
 */
export function buildTenYearTrend(known, endYear) {
  const valid = (known || []).filter(p => Number.isFinite(p.year) && Number.isFinite(p.count) && p.count >= 0)
  if (valid.length === 0) return []

  // 연도별로 가장 신뢰도 높은(kind 우선순위) 값만 남김
  const byYear = new Map()
  for (const p of valid) {
    const kind = p.kind || 'actual'
    const cur = byYear.get(p.year)
    if (!cur || KIND_PRIORITY[kind] > KIND_PRIORITY[cur.kind]) {
      byYear.set(p.year, { year: p.year, count: Math.round(p.count), kind })
    }
  }

  const last = endYear || Math.max(...valid.map(p => p.year))
  const first = last - (TREND_YEARS - 1)

  const project = linearProjector([...byYear.values()])

  const out = []
  for (let y = first; y <= last; y++) {
    if (byYear.has(y)) {
      out.push(byYear.get(y))
    } else if (project) {
      const v = Math.round(project(y))
      // 추정값이 0 이하면 학교 개교 이전으로 간주 → 그래프에 표시하지 않음
      if (v > 0) out.push({ year: y, count: v, kind: 'estimate' })
    }
  }
  return out
}

// 신입생 수가 이 아래로 떨어지면 통계적으로 폐교 논의 대상이 되는 경우가 많다고 보는
// 참고용 임계값(법적·행정적 절대 기준은 아님) — 추세 설명 문구를 만들 때만 사용
const RISK_LINE = 10
// "안전" 판정 시 표기할 안정 예상 기간의 상한(그 이상은 추세 신뢰도가 낮아 의미 없음)
const SAFE_HORIZON_YEARS = 15

/**
 * 연도별 신입생 실측/코호트 추정치(estimate 제외)로 최소제곱 추세선을 구해
 * 위험선(RISK_LINE)·0명 도달 예상 연도를 역산한다.
 * @param {Array<{year:number,count:number,kind?:string}>} points
 */
export function estimateClosureTrend(points) {
  const usable = (points || [])
    .filter(p => (p.kind || 'actual') !== 'estimate' && Number.isFinite(p.year) && Number.isFinite(p.count))
    .sort((a, b) => a.year - b.year)

  if (usable.length < 3) return { available: false }

  const n = usable.length
  const sx = usable.reduce((a, p) => a + p.year, 0)
  const sy = usable.reduce((a, p) => a + p.count, 0)
  const sxx = usable.reduce((a, p) => a + p.year * p.year, 0)
  const sxy = usable.reduce((a, p) => a + p.year * p.count, 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return { available: false }
  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n

  const first = usable[0]
  const last = usable[n - 1]
  const yearSpan = last.year - first.year || 1
  const avgAnnualPct = first.count > 0
    ? (Math.pow(Math.max(last.count, 0) / first.count, 1 / yearSpan) - 1) * 100
    : null

  const DECLINE_EPS = 0.5
  const direction = slope < -DECLINE_EPS ? 'declining' : slope > DECLINE_EPS ? 'growing' : 'stable'

  const solveYear = (threshold) => {
    if (slope >= -0.0001) return null
    const y = (threshold - intercept) / slope
    return y > last.year ? Math.round(y) : null
  }

  const riskLineYear = direction === 'declining' && last.count > RISK_LINE ? solveYear(RISK_LINE) : null
  const zeroYear = direction === 'declining' ? solveYear(0) : null

  return {
    available: true,
    direction,
    dataPoints: n,
    firstYear: first.year,
    lastYear: last.year,
    latestCount: last.count,
    avgAnnualPct,
    avgAnnualAbs: slope,
    riskLineYear,
    yearsToRiskLine: riskLineYear ? riskLineYear - last.year : null,
    zeroYear,
    yearsToZero: zeroYear ? zeroYear - last.year : null,
  }
}

function fmtRate(t) {
  return t.avgAnnualPct != null
    ? `연평균 ${t.avgAnnualPct >= 0 ? '+' : ''}${t.avgAnnualPct.toFixed(1)}%`
    : `연평균 약 ${t.avgAnnualAbs >= 0 ? '+' : ''}${t.avgAnnualAbs.toFixed(1)}명`
}

/** 계산된 추세로 "예상 폐교 시기" 표시 문구를 만든다(연도는 항상 이 함수가 결정 — AI가 지어내지 않음) */
export function buildExpectedYearText(trend, risk) {
  if (!trend?.available) {
    return risk === '안전' ? '당분간 안전 (추세 데이터 부족)' : '데이터 부족으로 구체적 시기 특정 어려움'
  }
  if (trend.direction === 'declining') {
    const targetYear = trend.riskLineYear || trend.zeroYear
    if (targetYear) return `${targetYear - 1}년~${targetYear + 1}년경`
    return '추세상 장기적 위험 있으나 구체적 시기 특정 어려움'
  }
  return `향후 ${SAFE_HORIZON_YEARS}년 이상 안정 예상`
}

function yearsPhrase(years) {
  return years <= 0 ? '이미' : `약 ${years}년 후`
}

/** 계산된 추세의 산출 근거를 사람이 읽을 문장으로 만든다 */
export function buildTrendBasisText(trend) {
  if (!trend?.available) {
    return '실측 연도별 데이터가 3개 미만이라 추세 기반 정밀 추정이 어렵습니다.'
  }
  const span = trend.lastYear - trend.firstYear
  const base = `최근 ${span}년간(${trend.firstYear}~${trend.lastYear}년) 신입생 ${fmtRate(trend)} 변화`
  if (trend.direction === 'declining' && trend.yearsToRiskLine != null) {
    return `${base}. 이 추세 유지 시 ${yearsPhrase(trend.yearsToRiskLine)} 신입생 ${RISK_LINE}명 미만(폐교 위험선) 도달 예상`
  }
  if (trend.direction === 'declining' && trend.yearsToZero != null) {
    return `${base}. 이 추세 유지 시 ${yearsPhrase(trend.yearsToZero)} 신입생 0명 도달 예상`
  }
  if (trend.direction === 'growing') {
    return `${base}. 현재 추세면 향후 ${SAFE_HORIZON_YEARS}년 이상 신입생 수 유지·증가 예상`
  }
  return `${base}. 뚜렷한 감소세 없이 안정적으로 유지되는 추세`
}
