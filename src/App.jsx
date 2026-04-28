import Hero from './components/Hero'
import StatsDashboard from './components/StatsDashboard'
import SchoolPredictor from './components/SchoolPredictor'
import IdeaBoard from './components/IdeaBoard'

function App() {
  return (
    <div>
      <nav className="navbar">
        <a className="nav-brand" href="#top">
          <div className="brand-icon">🏫</div>
          <span>폐교 리포트</span>
        </a>
        <div className="nav-links">
          <a href="#stats">현황 통계</a>
          <a href="#predictor">폐교 예측</a>
          <a href="#ideas">아이디어 보드</a>
        </div>
      </nav>

      <main id="top">
        <Hero />

        <div className="stats-ticker">
          <div className="ticker-track">
            {[...Array(2)].flatMap(() => [
              <span className="ticker-item" key={Math.random()}>📊 2024년 누적 폐교 <b>3,955곳</b></span>,
              <span className="ticker-item" key={Math.random()}>📉 2024년 신규 폐교 <b>33곳</b></span>,
              <span className="ticker-item" key={Math.random()}>🏫 미활용 폐교 <b>367곳</b> (9.3%)</span>,
              <span className="ticker-item" key={Math.random()}>👶 학령인구 감소 <b>매년 가속</b></span>,
              <span className="ticker-item" key={Math.random()}>🌾 비수도권 폐교 <b>압도적 다수</b></span>,
              <span className="ticker-item" key={Math.random()}>📌 폐교의 <b>70~80%</b>가 초등학교</span>,
            ])}
          </div>
        </div>

        <section id="stats">
          <StatsDashboard />
        </section>

        <section id="predictor">
          <SchoolPredictor />
        </section>

        <section id="ideas">
          <IdeaBoard />
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-title">🏫 폐교 리포트</div>
          <p className="footer-text">
            이 사이트는 통계 데이터를 기반으로 한국의 폐교 문제를 알리기 위해 제작되었습니다.<br />
            AI 예측은 Groq API를, 커뮤니티 아이디어는 Supabase를 활용합니다.
          </p>
          <div className="footer-divider" />
          <p className="footer-sources">
            출처: 교육부 폐교재산 현황 · 지방교육재정알리미(eduinfo.go.kr) · 통계청 학령인구 추계
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
