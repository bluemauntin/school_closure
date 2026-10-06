// GTM dataLayer 푸시 헬퍼 — GTM 컨테이너가 로드되지 않아도 에러 없이 무시됨
export function pushEvent(event, params = {}) {
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event, ...params })
  } catch {
    // 분석 실패가 앱 동작에 영향을 주지 않도록 무시
  }
}
