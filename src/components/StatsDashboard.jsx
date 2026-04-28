import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { generateNewsSummaries } from '../lib/groqApi'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
)

// 연도별 신규 폐교 수
const YEARLY_CLOSURES = {
  labels: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
  data:   [43,     38,     35,     41,     39,     33,     24,     25,     22,     33],
}

// 누적 폐교 수
const CUMULATIVE = {
  labels: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
  data:   [3680, 3718, 3753, 3794, 3833, 3866, 3890, 3915, 3937, 3970],
}

// 학교급별 현황
const BY_TYPE = {
  labels: ['초등학교', '중학교', '고등학교', '기타'],
  data: [74, 14, 9, 3],
}

// 지역별 현황 (%)
const BY_REGION = {
  labels: ['전라남도', '경상북도', '강원도', '충청남도', '경상남도', '전라북도', '기타'],
  data: [22, 18, 14, 10, 9, 8, 19],
}

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892AA', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892AA', font: { size: 11 } } },
  },
}

const DONUT_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { color: '#8892AA', font: { size: 11 }, padding: 12, boxWidth: 12 },
    },
  },
}

const ORANGE_PALETTE = ['#FF6B35', '#FF9A00', '#FFD166', '#06D6A0', '#4895EF', '#EF476F', '#9B5DE5']

// 기본 뉴스 (Grok 로딩 전 혹은 실패 시)
const FALLBACK_NEWS = [
  {
    tag: '통계',
    title: '2024년 폐교 33곳… 5년 만에 최다',
    summary: '교육부 자료에 따르면 2024년 한 해 동안 33곳의 학교가 문을 닫아 최근 5년 중 가장 많은 수치를 기록했습니다. 학령인구 감소가 가속화되면서 폐교 속도도 빨라질 전망입니다.',
    date: '2024.09.12',
  },
  {
    tag: '사례',
    title: '서울도 안전지대 아니다…수도권 첫 초교 폐교',
    summary: '인구 감소 가속으로 그간 농촌에 집중됐던 폐교가 서울·경기 등 수도권으로도 확산되고 있습니다. 저출생 충격이 도시까지 번지는 신호로 해석됩니다.',
    date: '2024.05.03',
  },
  {
    tag: '정책',
    title: '폐교 활용 활성화법 국회 통과…지자체 권한 확대',
    summary: '방치 폐교를 지역사회 시설로 전환할 수 있도록 지방자치단체의 활용 권한을 넓히는 법안이 국회를 통과했습니다. 문화·복지·창업 공간으로 재탄생하는 폐교가 늘 것으로 기대됩니다.',
    date: '2024.03.18',
  },
  {
    tag: '교육',
    title: '2030년 초등 입학생 30만 명 붕괴 전망',
    summary: '통계청은 2030년 초등학교 입학 아동 수가 30만 명 아래로 떨어질 것으로 예측했습니다. 이는 2024년 대비 20% 추가 감소로, 폐교 가속화가 불가피할 것으로 분석됩니다.',
    date: '2024.02.07',
  },
]

export default function StatsDashboard() {
  const [news, setNews] = useState(null)
  const [newsLoading, setNewsLoading] = useState(true)

  useEffect(() => {
    generateNewsSummaries()
      .then((items) => setNews(items.length ? items : FALLBACK_NEWS))
      .catch(() => setNews(FALLBACK_NEWS))
      .finally(() => setNewsLoading(false))
  }, [])

  return (
    <div className="section-wrap">
      <div className="section-header">
        <div className="section-badge">📊 현황 통계</div>
        <h2 className="section-title">숫자로 보는 폐교 현실</h2>
        <p className="section-desc">
          교육부·통계청 공식 데이터를 기반으로 연도별 폐교 추이, 학교급별 비율,
          지역별 분포를 시각화했습니다.
        </p>
      </div>

      {/* 핵심 수치 */}
      <div className="key-stats-row">
        {[
          { num: '3,955', label: '누적 폐교\n(2024 기준)' },
          { num: '33', label: '2024년\n신규 폐교' },
          { num: '367', label: '미활용\n방치 폐교' },
          { num: '9.3%', label: '미활용률' },
          { num: '70~80%', label: '초등학교\n집중도' },
        ].map((s, i) => (
          <div className="key-stat-item" key={i}>
            <div className="key-stat-num">{s.num}</div>
            <div className="key-stat-label" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 차트 */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>📉 연도별 신규 폐교 수</h3>
          <div className="chart-inner">
            <Bar
              data={{
                labels: YEARLY_CLOSURES.labels,
                datasets: [{
                  data: YEARLY_CLOSURES.data,
                  backgroundColor: YEARLY_CLOSURES.data.map(v =>
                    v >= 35 ? 'rgba(239,71,111,0.75)' : v >= 28 ? 'rgba(255,107,53,0.75)' : 'rgba(255,209,102,0.65)'
                  ),
                  borderColor: 'transparent',
                  borderRadius: 5,
                }],
              }}
              options={{
                ...CHART_OPTS,
                plugins: {
                  ...CHART_OPTS.plugins,
                  tooltip: {
                    callbacks: { label: (ctx) => ` ${ctx.raw}곳 폐교` },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <h3>📈 누적 폐교 추이</h3>
          <div className="chart-inner">
            <Line
              data={{
                labels: CUMULATIVE.labels,
                datasets: [{
                  data: CUMULATIVE.data,
                  borderColor: '#FF6B35',
                  backgroundColor: 'rgba(255,107,53,0.08)',
                  borderWidth: 2.5,
                  pointBackgroundColor: '#FF6B35',
                  pointRadius: 4,
                  tension: 0.4,
                  fill: true,
                }],
              }}
              options={{
                ...CHART_OPTS,
                plugins: {
                  ...CHART_OPTS.plugins,
                  tooltip: { callbacks: { label: (ctx) => ` 누적 ${ctx.raw.toLocaleString()}곳` } },
                },
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <h3>🏫 학교급별 폐교 비율</h3>
          <div className="chart-inner">
            <Doughnut
              data={{
                labels: BY_TYPE.labels,
                datasets: [{
                  data: BY_TYPE.data,
                  backgroundColor: ['#FF6B35', '#FFD166', '#4895EF', '#06D6A0'],
                  borderColor: '#141D35',
                  borderWidth: 2,
                }],
              }}
              options={DONUT_OPTS}
            />
          </div>
        </div>

        <div className="chart-card">
          <h3>🗺 지역별 폐교 비율 (%)</h3>
          <div className="chart-inner">
            <Doughnut
              data={{
                labels: BY_REGION.labels,
                datasets: [{
                  data: BY_REGION.data,
                  backgroundColor: ORANGE_PALETTE,
                  borderColor: '#141D35',
                  borderWidth: 2,
                }],
              }}
              options={DONUT_OPTS}
            />
          </div>
        </div>
      </div>

      {/* 뉴스 */}
      <div className="section-header" style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>
        <div className="section-badge">📰 관련 뉴스</div>
        <h2 className="section-title">폐교 관련 주요 뉴스</h2>
      </div>

      {newsLoading ? (
        <div className="news-skeleton">
          {[1,2,3,4].map(i => (
            <div className="skeleton-card" key={i}>
              <div className="sk sk-tag" />
              <div className="sk sk-title" />
              <div className="sk sk-title-short" />
              <div className="sk sk-line" />
              <div className="sk sk-line" />
              <div className="sk sk-line-short" />
            </div>
          ))}
        </div>
      ) : (
        <div className="news-grid">
          {(news || FALLBACK_NEWS).map((n, i) => (
            <div className="news-card" key={i}>
              <span className="news-tag">{n.tag}</span>
              <div className="news-title">{n.title}</div>
              <div className="news-summary">{n.summary}</div>
              <div className="news-date">📅 {n.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
