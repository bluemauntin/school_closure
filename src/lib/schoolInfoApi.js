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
 * @param {string} schoolName 학교명
 * @returns {Promise<Array>} 학교 목록
 */
export async function searchSchoolInfo(schoolName) {
  if (!schoolName || schoolName.trim().length < 2) return []

  // apiType=0, pCode=B000000001: 학교 기본 정보 (검색용)
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
 * 학교별 학년별 학생 수 현황 조회
 * @param {string} schoolCode 학교코드
 * @returns {Promise<Array|null>} 연도별/학년별 학생 수
 */
export async function fetchStudentStatus(schoolCode) {
  if (!schoolCode) return null

  // apiType=1, pCode=B000000021: 학년별·학급별 학생수
  const data = await callApi({
    apiType: '1',
    pCode: 'B000000021',
    schul_code: schoolCode
  })

  if (!data || !data.list || data.list.length === 0) return null

  // 최근 연도 데이터 추출 (보통 가장 최근 공시 자료가 나옴)
  // 학교알리미는 연도별 이력보다는 특정 시점 공시 자료 위주임
  // '폐교 리포트' 앱의 차트 형식을 위해 가공
  const latest = data.list[0]
  
  // 학년별 학생 수 추출 (COL_1: 1학년, COL_2: 2학년 ...)
  // 초등학교 기준 1~6학년
  const enrollment = []
  
  // 학교알리미 데이터는 현재 시점의 학년별 인원임. 
  // '신입생 추이'를 보여주려면 과거 연도 데이터가 여러개 필요하지만 
  // OpenAPI는 보통 최근 3년 정도만 제공하거나 현재 공시 자료만 줄 수 있음.
  // 여기서는 현재 학년별 분포를 반환하여 AI가 분석할 수 있게 함.
  
  return {
    year: latest.AY, // 학년도
    grades: [
      { grade: 1, count: Number(latest.COL_1 || 0) },
      { grade: 2, count: Number(latest.COL_2 || 0) },
      { grade: 3, count: Number(latest.COL_3 || 0) },
      { grade: 4, count: Number(latest.COL_4 || 0) },
      { grade: 5, count: Number(latest.COL_5 || 0) },
      { grade: 6, count: Number(latest.COL_6 || 0) },
    ].filter(g => g.count > 0),
    total: Number(latest.COL_13 || 0), // 전체 학생 수
    teachers: Number(latest.COL_14 || 0), // 전체 교원 수
  }
}
