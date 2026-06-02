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
    } else {
      const v = project ? Math.max(0, Math.round(project(y))) : 0
      out.push({ year: y, count: v, kind: 'estimate' })
    }
  }
  return out
}
