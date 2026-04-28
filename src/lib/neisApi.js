/**
 * NEIS Open API - 학교기본정보 조회
 * https://open.neis.go.kr/portal/data/service/selectServicePage.do?page=1&rows=10&sortColumn=&sortDirection=&infId=OPEN17020190531110010104913&infSeq=2
 *
 * 인증키 없이도 기본 100건 조회 가능 (데모 키)
 */

const NEIS_BASE = 'https://open.neis.go.kr/hub/schoolInfo'

/**
 * 학교명으로 전국 학교 검색
 * @param {string} keyword - 검색어 (학교명)
 * @returns {Promise<Array>} 학교 목록
 */
export async function searchSchools(keyword) {
  if (!keyword || keyword.trim().length < 1) return []

  try {
    const params = new URLSearchParams({
      Type: 'json',
      pIndex: '1',
      pSize: '10',
      SCHUL_NM: keyword.trim(),
    })

    const res = await fetch(`${NEIS_BASE}?${params}`)
    if (!res.ok) throw new Error('API 오류')
    const data = await res.json()

    // 결과 없음
    if (data.RESULT?.CODE === 'INFO-200') return []

    const rows = data.schoolInfo?.[1]?.row || []
    return rows.map((s) => ({
      id: s.SD_SCHUL_CODE,        // 행정표준코드
      name: s.SCHUL_NM,           // 학교명
      region: `${s.LCTN_SC_NM} ${s.JU_ORG_NM}`, // 시도 + 교육지원청
      type: s.SCHUL_KND_SC_NM,    // 학교종류 (초/중/고)
      address: s.ORG_RDNMA,       // 도로명주소
      phone: s.ORG_TELNO,         // 전화번호
      establish: s.FOND_SC_NM,    // 설립구분 (공립/사립)
      officeCode: s.ATPT_OFCDC_SC_CODE, // 시도교육청 코드
      schoolCode: s.SD_SCHUL_CODE,
    }))
  } catch (err) {
    console.error('NEIS API 오류:', err)
    return []
  }
}

/**
 * 학교 신입생 수 조회 (학년별 학생수)
 * NEIS API: 학교별 학년별 학생수
 */
export async function fetchEnrollment(officeCode, schoolCode) {
  try {
    const params = new URLSearchParams({
      Type: 'json',
      pIndex: '1',
      pSize: '100',
      ATPT_OFCDC_SC_CODE: officeCode,
      SD_SCHUL_CODE: schoolCode,
    })

    const res = await fetch(`https://open.neis.go.kr/hub/classInfo?${params}`)
    if (!res.ok) throw new Error('API 오류')
    const data = await res.json()

    if (data.RESULT?.CODE === 'INFO-200') return null

    const rows = data.classInfo?.[1]?.row || []
    // 학년별 집계
    const byYear = {}
    rows.forEach((r) => {
      const year = r.AY // 학년도
      if (!byYear[year]) byYear[year] = 0
      byYear[year]++
    })

    return Object.entries(byYear)
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year: Number(year), count }))
  } catch {
    return null
  }
}
