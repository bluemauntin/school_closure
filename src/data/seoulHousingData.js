// 서울 25개 자치구 주거 개발 현황 × 학교 안전율 상관 데이터
// 출처 기반 추산: 서울시 건축 허가 통계(2020~2024), 교육부 학생 수 현황, 통계청 학령인구

export const SEOUL_DISTRICT_DATA = [
  {
    name: '강동구', newApts: 16800, safeRate: 82, schoolCnt: 58, gradePopDelta: 2.6,
    devPhase: '재건축 활성',
    complexes: ['둔촌주공(올림픽파크포레온)', '고덕 아르테온', '강동 헤리티지'],
    policy: '둔촌주공 재건축 완료로 대규모 학령인구 유입 예상. 인근 초등학교 학급 증설 계획 선제 수립 필요.',
  },
  {
    name: '서초구', newApts: 14200, safeRate: 87, schoolCnt: 52, gradePopDelta: 3.4,
    devPhase: '재건축 활성',
    complexes: ['반포 래미안 원베일리', '반포 디에이치 클래스트', '방배 아크로'],
    policy: '반포 대단지 재건축 완료로 학령인구 꾸준히 증가 중. 신설 학교 부지 확보 및 학급 확대 검토 권장.',
  },
  {
    name: '강남구', newApts: 12400, safeRate: 83, schoolCnt: 68, gradePopDelta: 2.1,
    devPhase: '재건축 진행',
    complexes: ['개포 주공 재건축 단지', '대치 래미안', '압구정 현대 재건축'],
    policy: '압구정·개포 재건축 진행 중. 완료 시점에 맞춰 학교 수용 계획 선제 수립 필요.',
  },
  {
    name: '송파구', newApts: 18600, safeRate: 81, schoolCnt: 74, gradePopDelta: 1.8,
    devPhase: '공급 완료',
    complexes: ['헬리오시티', '파크리오', '잠실 엘스'],
    policy: '헬리오시티 입주 완료 후 학생 수 회복세. 잠실 일대 추가 재건축 시 수용 계획 재수립 필요.',
  },
  {
    name: '강서구', newApts: 9800, safeRate: 78, schoolCnt: 62, gradePopDelta: 0.4,
    devPhase: '개발 진행',
    complexes: ['마곡 엠밸리 14단지', '가양 래미안', '화곡 재개발'],
    policy: '마곡지구 신규 입주 지속. 마곡·가양 지역 학교 시설 현대화와 학급 수 조정 병행 필요.',
  },
  {
    name: '영등포구', newApts: 8800, safeRate: 72, schoolCnt: 48, gradePopDelta: -0.9,
    devPhase: '재개발 진행',
    complexes: ['여의도 재건축 추진', '당산 래미안', '영등포 뉴타운'],
    policy: '여의도 재건축 본격화 시 학령인구 급증 예상. 사전에 학교 용지 확보 및 시설 투자 계획 수립 권장.',
  },
  {
    name: '마포구', newApts: 8200, safeRate: 74, schoolCnt: 56, gradePopDelta: -1.2,
    devPhase: '재개발 진행',
    complexes: ['아현 래미안 푸르지오', '염리 재개발', '공덕 파크자이'],
    policy: '아현·염리 뉴타운 재개발 진행 중이나 세대 수 증가폭 제한적. 소규모 학교 통폐합 선제 검토 필요.',
  },
  {
    name: '양천구', newApts: 7200, safeRate: 75, schoolCnt: 58, gradePopDelta: -1.1,
    devPhase: '재건축 예정',
    complexes: ['목동 신시가지 재건축 추진', '신정 이펜하우스'],
    policy: '목동 신시가지 재건축 추진 시 학령인구 급증 예상. 재건축 이주·입주 단계별 학교 수용 계획 선제 수립 시급.',
  },
  {
    name: '성동구', newApts: 7600, safeRate: 76, schoolCnt: 45, gradePopDelta: 0.8,
    devPhase: '개발 진행',
    complexes: ['왕십리 센트라스', '행당 한진타운', '서울숲 리버뷰자이'],
    policy: '성수·왕십리 재개발 진행 중. 학령인구 소폭 증가 추세 유지. 기존 학교 시설 개보수 병행 검토.',
  },
  {
    name: '용산구', newApts: 6400, safeRate: 71, schoolCnt: 38, gradePopDelta: -1.8,
    devPhase: '개발 예정',
    complexes: ['한남 재건축 추진', '이촌 래미안', '용산 정비창 개발 예정'],
    policy: '용산 정비창·한남 재건축 사업 본격화 예정. 개발 완료 후 대규모 학령인구 유입 대비 사전 학교 계획 시급.',
  },
  {
    name: '구로구', newApts: 6100, safeRate: 65, schoolCnt: 52, gradePopDelta: -2.8,
    devPhase: '정체',
    complexes: ['개봉 재개발', '고척 스카이뷰', '구로 디지털단지 인근'],
    policy: '디지털단지 배후 주거지 개발 필요. 구로 남부 노후 단독주택 밀집 지역 소규모 재개발 추진 권장.',
  },
  {
    name: '은평구', newApts: 5200, safeRate: 61, schoolCnt: 58, gradePopDelta: -3.4,
    devPhase: '개발 감소',
    complexes: ['은평 뉴타운(완료)', '녹번 재개발', '역촌 재개발'],
    policy: '은평 뉴타운 완료 후 신규 공급 급감. 구 북부 단독주택 밀집 지역 학교 통폐합 계획 수립 권장.',
  },
  {
    name: '광진구', newApts: 4800, safeRate: 68, schoolCnt: 48, gradePopDelta: -2.1,
    devPhase: '정체',
    complexes: ['구의 파크자이', '광장 현대', '자양 재개발'],
    policy: '자양동 재개발 진행 중이나 규모 소. 학교 시설 노후화 가속 중. 소규모 공급과 학교 통합 병행 검토.',
  },
  {
    name: '서대문구', newApts: 4800, safeRate: 62, schoolCnt: 44, gradePopDelta: -3.1,
    devPhase: '정체',
    complexes: ['북아현 뉴타운', '가재울 뉴타운', '홍은 재개발'],
    policy: '북아현·가재울 뉴타운 완료 후 추가 공급 없음. 홍제·홍은 지역 노후 학교 시설 통합 방안 검토 권장.',
  },
  {
    name: '동작구', newApts: 4600, safeRate: 67, schoolCnt: 50, gradePopDelta: -2.6,
    devPhase: '정체',
    complexes: ['흑석 아크로리버하임', '사당 래미안', '노량진 재개발'],
    policy: '흑석 재개발 완료 후 추가 공급 감소. 노량진 재개발 가속화와 학교 시설 투자를 연계한 패키지 추진 권장.',
  },
  {
    name: '성북구', newApts: 4400, safeRate: 63, schoolCnt: 58, gradePopDelta: -3.2,
    devPhase: '정체',
    complexes: ['장위 뉴타운', '길음 래미안', '정릉 재개발'],
    policy: '장위 뉴타운 완료 후 북부 지역은 공급 감소. 성북구 북부 학교 통폐합 및 거점학교 지정 검토 필요.',
  },
  {
    name: '동대문구', newApts: 4200, safeRate: 60, schoolCnt: 44, gradePopDelta: -3.8,
    devPhase: '정체',
    complexes: ['전농 래미안', '이문 재개발', '장안 재개발'],
    policy: '이문·휘경 재개발 진행 중이나 입주 전. 학생 수 감소 가속 중. 재개발 완료까지 학교 탄력 운영 방안 마련 필요.',
  },
  {
    name: '중랑구', newApts: 3800, safeRate: 58, schoolCnt: 54, gradePopDelta: -4.8,
    devPhase: '정체',
    complexes: ['면목 재개발', '신내 데시앙', '망우 재개발'],
    policy: '면목·망우 재개발 진행 중이나 규모 소. 지속적 학생 수 감소 대비 중장기 학교 통합 로드맵 수립 필요.',
  },
  {
    name: '노원구', newApts: 3400, safeRate: 55, schoolCnt: 72, gradePopDelta: -5.8,
    devPhase: '노후화',
    complexes: ['상계 주공 재건축 추진', '중계 무지개', '하계 재건축'],
    policy: '상계·중계 노후 대단지 재건축 지연으로 학령인구 급감. 재건축 인센티브 부여와 학교 통폐합 병행 추진 시급.',
  },
  {
    name: '금천구', newApts: 3200, safeRate: 56, schoolCnt: 32, gradePopDelta: -4.1,
    devPhase: '공급 감소',
    complexes: ['독산 재개발', '시흥 뉴타운(일부)'],
    policy: '학교 안전율 하위권. 신규 공급 절대 부족. 시흥 뉴타운 재추진 또는 독산 재개발 가속화가 학교 안전의 핵심.',
  },
  {
    name: '관악구', newApts: 2800, safeRate: 51, schoolCnt: 54, gradePopDelta: -5.2,
    devPhase: '공급 감소',
    complexes: ['봉천 재개발(일부)', '신림 재개발'],
    policy: '대학가 배후 단독·다세대 밀집. 학령가구 비율 서울 최저 수준. 신림 재개발 확대와 교육환경 개선 연계 추진 권장.',
  },
  {
    name: '중구', newApts: 2200, safeRate: 52, schoolCnt: 28, gradePopDelta: -5.4,
    devPhase: '노후화',
    complexes: ['황학 재개발', '신당 재개발'],
    policy: '학교 수 자체가 적어 통폐합 여지 좁음. 신당·황학 재개발 완료 시 학령인구 소폭 회복 가능. 중장기 모니터링 지속 필요.',
  },
  {
    name: '도봉구', newApts: 2100, safeRate: 48, schoolCnt: 44, gradePopDelta: -7.2,
    devPhase: '노후화',
    complexes: ['창동 역세권 개발', '방학 성원', '도봉 뉴타운(중단)'],
    policy: '창동 역세권 개발 계획 진행 중이나 주거 공급 효과 제한적. 학교 통폐합 불가피. 거점학교 중심 재편 계획 수립 권장.',
  },
  {
    name: '종로구', newApts: 1800, safeRate: 44, schoolCnt: 34, gradePopDelta: -7.6,
    devPhase: '노후화',
    complexes: ['창신 숭인 재개발', '세운 재정비'],
    policy: '역사도심 특성상 대규모 주거 개발 제한. 학교 시설 현대화 투자로 잔류 학생 교육환경 개선에 집중 권장.',
  },
  {
    name: '강북구', newApts: 1200, safeRate: 42, schoolCnt: 38, gradePopDelta: -8.4,
    devPhase: '노후화',
    complexes: ['미아 재개발(일부)', '번동 주공(노후)'],
    policy: '서울 내 학교 안전율 최하위. 신규 공급 극히 부족. 강북 균형발전 특별 사업과 연계한 주거·교육 동시 재생 필수.',
  },
]

export const PHASE_COLOR = {
  '재건축 활성': '#FF6B35',
  '재건축 진행': '#FF9A00',
  '재건축 예정': '#FFD166',
  '공급 완료': '#06D6A0',
  '개발 진행': '#4895EF',
  '재개발 진행': '#4895EF',
  '개발 예정': '#a5b4fc',
  '정체': '#8892AA',
  '노후화': '#EF476F',
  '공급 감소': '#EF476F',
  '개발 감소': '#EF476F',
}
