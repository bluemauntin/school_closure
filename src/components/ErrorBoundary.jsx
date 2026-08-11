import { Component } from 'react'

// 하위 섹션에서 발생한 렌더링/런타임 에러가 사이트 전체를 빈 화면으로 만들지 않도록 격리
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] section crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="section-wrap">
          <div className="map-error">이 섹션을 불러오지 못했습니다.</div>
        </div>
      )
    }
    return this.props.children
  }
}
