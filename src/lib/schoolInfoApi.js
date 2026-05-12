/**
 * 학교알리미 Open API (schoolinfo.go.kr)
 */

const BASE_URL = 'https://www.schoolinfo.go.kr/openApi/api/jsp.do'

function getApiKey() {
  return import.meta.env.VITE_SCHOOLINFO_API_KEY
}

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

  // '초등학교', '중학교' 등 수식어 제거 후 검색 시도 (매칭률 향상)
  const cleanName = schoolName.replace(/(초등학교|중학교|고등학교|학교)$/, '').trim()

  const data = await callApi({
    apiType: '0',
    pCode: 'B000000001',
    schul_nm: cleanName
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
 * 학교명과 지역으로 학교알리미 학교 코드를 찾음
 */
export async function findSchoolCodeByName(schoolName, region) {
  const schools = await searchSchoolInfo(schoolName)
  if (!schools || schools.length === 0) return null
  
  const cleanTarget = schoolName.replace(/\s+/g, '')
  
  // 1. 이름과 지역이 정확히 일치하는 경우
  let match = schools.find(s => 
    s.name.replace(/\s+/g, '') === cleanTarget && 
    (region ? s.address.includes(region.slice(0, 2)) : true)
  )
  
  // 2. 이름 포함 관계로 검색
  if (!match) {
    match = schools.find(s => s.name.includes(cleanTarget) || cleanTarget.includes(s.name))
  }
  
  return match ? match.schoolCode : (schools[0]?.schoolCode || null)
}

/**
 * 다양한 API 응답 패턴에서 학년별 인원 추출 유틸리티
 */
function extractGradeCount(data, gradeNum) {
  if (!data) return 0
  // 패턴 1: COL_1, COL_2 ...
  if (data[`COL_${gradeNum}`] !== undefined) return Number(data[`COL_${gradeNum}`])
  // 패턴 2: TOTAL1_SUM, TOTAL2_SUM ...
  if (data[`TOTAL${gradeNum}_SUM`] !== undefined) return Number(data[`TOTAL${gradeNum}_SUM`])
  // 패턴 3: TOTAL1_TOT, TOTAL2_TOT ...
  if (data[`TOTAL${gradeNum}_TOT`] !== undefined) return Number(data[`TOTAL${gradeNum}_TOT`])
  // 패턴 4: MAN1_TOT + WOMAN1_TOT (제공해주신 데이터 패턴)
  const man = Number(data[`MAN${gradeNum}_TOT`] || 0)
  const woman = Number(data[`WOMAN${gradeNum}_TOT`] || 0)
  if (man > 0 || woman > 0) return man + woman
  
  return 0
}

/**
 * 특정 연도의 학년별 학생 수 조회
 */
async function fetchYearlyGradeStats(schoolCode, year) {
  // 우선 B000000021(학년별·학급별) 시도
  let data = await callApi({
    apiType: '1',
    pCode: 'B000000021',
    schul_code: schoolCode,
    year: year ? String(year) : ''
  })
  
  // 데이터가 없으면 B000000022(학년별·성별) 시도
  if (!data || !data.list || data.list.length === 0) {
    data = await callApi({
      apiType: '1',
      pCode: 'B000000022',
      schul_code: schoolCode,
      year: year ? String(year) : ''
    })
  }
  
  if (!data || !data.list || data.list.length === 0) return null
  return data.list[0]
}

/**
 * 학교별 학년별 학생 수 및 연도별 추이 조회
 */
export async function fetchStudentStatus(schoolCode) {
  if (!schoolCode) return null

  const targetYears = [2025, 2024, 2023, 2022]
  
  try {
    const results = await Promise.all(
      targetYears.map(y => fetchYearlyGradeStats(schoolCode, y))
    )

    let statsByYear = results.filter(r => r !== null)
    
    if (statsByYear.length === 0) {
      const defaultData = await fetchYearlyGradeStats(schoolCode, '')
      if (defaultData) statsByYear.push(defaultData)
    }

    if (statsByYear.length === 0) return null

    const latest = statsByYear[0]
    
    // 신입생(1학년) 추이 가공
    const yearlyTrend = statsByYear
      .map(s => ({
        year: Number(s.AY || s.YEAR || 0),
        count: extractGradeCount(s, 1)
      }))
      .filter(t => t.count > 0 && t.year > 0)
      .sort((a, b) => a.year - b.year)

    // 학년별 분포 가공
    const grades = []
    for (let i = 1; i <= 6; i++) {
      const count = extractGradeCount(latest, i)
      if (count > 0) {
        grades.push({ grade: i, count })
      }
    }

    return {
      year: latest.AY || latest.YEAR || '2024',
      grades: grades,
      total: Number(latest.TOTAL_SUM || latest.ALL_SUM || latest.COL_13 || 0),
      teachers: Number(latest.COL_14 || 0),
      yearlyTrend: yearlyTrend.length > 1 ? yearlyTrend : null
    }
  } catch (error) {
    console.error('fetchStudentStatus Error:', error)
    return null
  }
}
