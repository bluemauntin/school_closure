/**
 * 학교알리미 Open API (schoolinfo.go.kr)
 *
 * 이 API는 NEIS보다 더 상세한 공시 정보(학생 수 현황 등)를 제공합니다.
 */

const BASE_URL = 'https://www.schoolinfo.go.kr/openApi/api/jsp.do'

function getApiKey() {
  return import.meta.env.VITE_SCHOOLINFO_API_KEY
}

/**
 * 학교알리미 API 호출 유틸리티
 */
async function callApi(params) {
  const apiKey = getApiKey()
  if (!apiKey) return null

  const queryParams = new URLSearchParams({
    apiKey,
    ...params
  })

  try {
    const response = await fetch(`${BASE_URL}?${queryParams}`)
    if (!response.ok) return null
    const data = await response.json()
    return data
  } catch (error) {
    console.error('SchoolInfo API Error:', error)
    return null
  }
}

/**
 * 학교명으로 전국 학교 검색
 */
export async function searchSchoolInfo(schoolName) {
  if (!schoolName || schoolName.trim().length < 2) return []

  const data = await callApi({
    apiType: '0',
    pCode: 'B000000001',
    schul_nm: schoolName.trim()
  })

  if (!data || !data.list) return []

  return data.list.map(s => ({
    id: s.SCHUL_CODE,
    name: s.SCHUL_NM,
    region: s.ADRES,
    type: s.SCHUL_KND_SC_NM,
    address: s.ADRES,
    schoolCode: s.SCHUL_CODE,
    officeCode: s.ATPT_OFCDC_SC_CODE,
    _isSchoolInfo: true
  }))
}

/**
 * 특정 연도의 학년별 학생 수 조회
 */
async function fetchYearlyGradeStats(schoolCode, year) {
  const data = await callApi({
    apiType: '1',
    pCode: 'B000000021',
    schul_code: schoolCode,
    year: String(year)
  })
  
  if (!data || !data.list || data.list.length === 0) return null
  return data.list[0]
}

/**
 * 학교별 학년별 학생 수 및 연도별 추이 조회
 */
export async function fetchStudentStatus(schoolCode) {
  if (!schoolCode) return null

  // 최근 연도부터 순차적으로 시도 (2025~2021)
  const targetYears = [2025, 2024, 2023, 2022, 2021]
  
  try {
    // 병렬로 여러 연도 데이터 조회 시도
    const results = await Promise.all(
      targetYears.map(y => fetchYearlyGradeStats(schoolCode, y))
    )

    // 데이터가 존재하는 연도만 필터링
    const statsByYear = results.filter(r => r !== null)
    
    if (statsByYear.length === 0) {
      // 연도 지정 없이 다시 시도 (기본 공시 데이터)
      const defaultData = await fetchYearlyGradeStats(schoolCode, '')
      if (!defaultData) return null
      statsByYear.push(defaultData)
    }

    const latest = statsByYear[0]
    
    // 연도별 1학년(신입생) 수 추이 (Trend Graph용)
    const yearlyTrend = statsByYear
      .map(s => ({
        year: Number(s.AY),
        count: Number(s.COL_1 || 0)
      }))
      .filter(t => t.count > 0)
      .sort((a, b) => a.year - b.year)

    // 현재 시점 학년별 분포 (Distribution Graph용)
    const grades = [
      { grade: 1, count: Number(latest.COL_1 || 0) },
      { grade: 2, count: Number(latest.COL_2 || 0) },
      { grade: 3, count: Number(latest.COL_3 || 0) },
      { grade: 4, count: Number(latest.COL_4 || 0) },
      { grade: 5, count: Number(latest.COL_5 || 0) },
      { grade: 6, count: Number(latest.COL_6 || 0) },
    ].filter(g => g.count > 0)

    return {
      year: latest.AY,
      grades: grades,
      total: Number(latest.COL_13 || 0),
      teachers: Number(latest.COL_14 || 0),
      yearlyTrend: yearlyTrend.length > 1 ? yearlyTrend : null
    }
  } catch (error) {
    console.error('fetchStudentStatus Error:', error)
    return null
  }
}
