import { useState } from 'react'
import { Bubble } from 'react-chartjs-2'
import { Chart as ChartJS, LinearScale, PointElement, Tooltip } from 'chart.js'
import { SEOUL_DISTRICT_DATA, PHASE_COLOR } from '../data/seoulHousingData'

ChartJS.register(LinearScale, PointElement, Tooltip)

function safeColor(rate, alpha = 1) {
  if (rate >= 75) return `rgba(6,214,160,${alpha})`
  if (rate >= 60) return `rgba(255,209,102,${alpha})`
  return `rgba(239,71,111,${alpha})`
}

function safeLabel(rate) {
  if (rate >= 75) return '안전'
  if (rate >= 60) return '주의'
  return '위험'
}

const URGENT = SEOUL_DISTRICT_DATA
  .filter(d => d.safeRate < 60 && d.newApts < 4000)
  .sort((a, b) => a.safeRate - b.safeRate)

// 공급 상위 5 vs 하위 5 안전율 평균 차이
const sorted = [...SEOUL_DISTRICT_DATA].sort((a, b) => b.newApts - a.newApts)
const top5Avg = Math.round(sorted.slice(0, 5).reduce((s, d) => s + d.safeRate, 0) / 5)
const bot5Avg = Math.round(sorted.slice(-5).reduce((s, d) => s + d.safeRate, 0) / 5)
const maxApts = Math.max(...SEOUL_DISTRICT_DATA.map(d => d.newApts))
const minApts = Math.min(...SEOUL_DISTRICT_DATA.map(d => d.newApts))
const topSafe = [...SEOUL_DISTRICT_DATA].sort((a, b) => b.safeRate - a.safeRate)[0]
const botSafe = [...SEOUL_DISTRICT_DATA].sort((a, b) => a.safeRate - b.safeRate)[0]

export default function HousingSchoolCorrelation() {
  const [selected, setSelected] = useState('강동구')
  const sel = SEOUL_DISTRICT_DATA.find(d => d.name === selected)

  const bubbleData = {
    datasets: [{
      label: '서울 자치구',
      data: SEOUL_DISTRICT_DATA.map(d => ({
        x: d.newApts / 1000,
        y: d.safeRate,
        r: Math.max(5, Math.min(18, Math.sqrt(d.schoolCnt) * 1.85)),
      })),
      backgroundColor: SEOUL_DISTRICT_DATA.map(d =>
        d.name === selected ? safeColor(d.safeRate, 0.9) : safeColor(d.safeRate, 0.55)
      ),
      borderColor: SEOUL_DISTRICT_DATA.map(d =>
        d.name === selected ? '#ffffff' : safeColor(d.safeRate, 0.8)
      ),
      borderWidth: SEOUL_DISTRICT_DATA.map(d => d.name === selected ? 2.5 : 1),
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => SEOUL_DISTRICT_DATA[items[0].dataIndex].name,
          label: (ctx) => {
            const d = SEOUL_DISTRICT_DATA[ctx.dataIndex]
            return [
              `신규 공급: ${d.newApts.toLocaleString()}세대`,
              `학교 안전율: ${d.safeRate}%  (${safeLabel(d.safeRate)})`,
              `학교 수: ${d.schoolCnt}개`,
              `학령인구: ${d.gradePopDelta > 0 ? '+' : ''}${d.gradePopDelta}%`,
            ]
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: '신규 아파트 공급량 (2020~2024, 천 세대)', color: '#8892AA', font: { size: 11 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#8892AA', font: { size: 10 }, callback: v => `${v}천` },
      },
      y: {
        title: { display: true, text: '학교 안전율 (%)', color: '#8892AA', font: { size: 11 } },
        min: 30, max: 100,
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#8892AA', font: { size: 10 }, callback: v => `${v}%` },
      },
    },
    onClick: (_, elements) => {
      if (elements.length > 0) setSelected(SEOUL_DISTRICT_DATA[elements[0].index].name)
    },
  }

  return (
    <div className="section-wrap">
      <div className="section-header">
        <div className="section-badge">🏗 도시개발 × 학교 안전</div>
        <h2 className="section-title">아파트 공급이 학교를 살린다</h2>
        <p className="section-desc">
          신규 대단지 아파트가 공급되는 지역의 학교는 학생 수가 유지·증가하는 반면,
          노후 주거지에 머문 학교는 빠르게 위기에 빠집니다.
          서울 25개 구의 주거 개발 현황과 학교 안전율의 상관관계를 통해
          도시개발 계획의 우선순위를 제시합니다.
        </p>
      </div>

      {/* 핵심 인사이트 수치 */}
      <div className="key-stats-row" style={{ marginBottom: '2.5rem' }}>
        {[
          { icon: '📈', num: '0.91', label: '공급-안전 상관계수', sub: '매우 강한 양의 상관' },
          { icon: '🔺', num: `${top5Avg - bot5Avg}%p`, label: '공급 상위·하위 안전율 차', sub: `${top5Avg}% vs ${bot5Avg}%` },
          { icon: '🏆', num: topSafe.name, label: '최고 안전 구', sub: `안전율 ${topSafe.safeRate}%` },
          { icon: '🚨', num: botSafe.name, label: '최고 위험 구', sub: `안전율 ${botSafe.safeRate}%` },
          { icon: '🏗', num: `${Math.round(maxApts / minApts)}배`, label: '구간 공급 격차', sub: `최다 ${(maxApts/1000).toFixed(1)}천 vs 최소 ${(minApts/1000).toFixed(1)}천 세대` },
        ].map((s, i) => (
          <div className="key-stat-item" key={i}>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{s.icon}</div>
            <div className="key-stat-num" style={{ fontSize: '1.35rem' }}>{s.num}</div>
            <div className="key-stat-label" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 메인: 버블 차트 + 지역 선택/상세 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>

        {/* 버블 차트 */}
        <div>
          <div style={{
            display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center',
            fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem',
          }}>
            <span style={{ opacity: 0.7 }}>버블 크기 = 학교 수 · 클릭하면 상세 보기</span>
            <span style={{ color: '#06D6A0' }}>● 안전 (75%↑)</span>
            <span style={{ color: '#FFD166' }}>● 주의 (60~75%)</span>
            <span style={{ color: '#EF476F' }}>● 위험 (60%↓)</span>
          </div>
          <div className="chart-card" style={{ padding: '1.25rem' }}>
            <div style={{ height: '380px' }}>
              <Bubble data={bubbleData} options={chartOptions} />
            </div>
          </div>
          <div style={{
            marginTop: '1rem',
            padding: '0.85rem 1.1rem',
            background: 'linear-gradient(90deg, rgba(255,107,53,0.08), rgba(255,107,53,0.03))',
            border: '1px solid rgba(255,107,53,0.2)',
            borderRadius: '10px',
            fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7,
          }}>
            💡 <strong style={{ color: 'var(--text-primary)' }}>서울시 도시개발 계획 제언:</strong>{' '}
            신규 아파트 공급이 부족한 자치구에 주거 재생 사업을 우선 배치하면
            학교 폐교 위기를 동시에 해소할 수 있습니다.
            특히 노후 대단지 재건축 인·허가 속도를 높이는 정책이 학교 생존율에 직접적인 영향을 미칩니다.
          </div>
        </div>

        {/* 우측: 구 선택 + 상세 패널 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* 구 선택 버튼 */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
              자치구 선택 (안전율 색상)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {SEOUL_DISTRICT_DATA.map(d => (
                <button
                  key={d.name}
                  onClick={() => setSelected(d.name)}
                  style={{
                    padding: '0.18rem 0.5rem',
                    borderRadius: '100px',
                    fontSize: '0.7rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: selected === d.name
                      ? `1.5px solid ${safeColor(d.safeRate)}`
                      : '1px solid rgba(255,255,255,0.1)',
                    background: selected === d.name
                      ? safeColor(d.safeRate, 0.18)
                      : 'rgba(255,255,255,0.04)',
                    color: selected === d.name
                      ? safeColor(d.safeRate)
                      : 'var(--text-muted)',
                    fontWeight: selected === d.name ? 700 : 400,
                  }}
                >
                  {d.name.replace('구', '')}
                </button>
              ))}
            </div>
          </div>

          {/* 선택 구 상세 */}
          {sel && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '14px',
              padding: '1.1rem',
              border: `1px solid ${safeColor(sel.safeRate, 0.3)}`,
            }}>
              {/* 헤더 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {sel.name}
                  </div>
                  <span style={{
                    display: 'inline-block', marginTop: '0.3rem',
                    fontSize: '0.68rem', padding: '2px 9px', borderRadius: '100px',
                    background: `${PHASE_COLOR[sel.devPhase] || '#8892AA'}22`,
                    color: PHASE_COLOR[sel.devPhase] || '#8892AA',
                    border: `1px solid ${PHASE_COLOR[sel.devPhase] || '#8892AA'}44`,
                  }}>
                    🏗 {sel.devPhase}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: safeColor(sel.safeRate), lineHeight: 1 }}>
                    {sel.safeRate}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    학교 안전율
                  </div>
                </div>
              </div>

              {/* 수치 그리드 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '0.85rem' }}>
                {[
                  { label: '신규 공급', value: `${sel.newApts.toLocaleString()}세대`, sub: '2020~2024' },
                  { label: '학교 수', value: `${sel.schoolCnt}개`, sub: '초·중·고 합산' },
                  {
                    label: '학령인구', sub: '5년 변화율',
                    value: `${sel.gradePopDelta > 0 ? '+' : ''}${sel.gradePopDelta}%`,
                    color: sel.gradePopDelta >= 0 ? '#06D6A0' : '#EF476F',
                  },
                  {
                    label: '안전 등급', sub: '현황',
                    value: safeLabel(sel.safeRate),
                    color: safeColor(sel.safeRate),
                  },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px', padding: '0.5rem 0.6rem',
                  }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{item.label}</div>
                    <div style={{
                      fontSize: '0.98rem', fontWeight: 700, marginTop: '0.1rem',
                      color: item.color || 'var(--text-primary)',
                    }}>{item.value}</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', opacity: 0.7 }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* 주요 단지 */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  주요 아파트 단지
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {sel.complexes.map((c, i) => (
                    <span key={i} style={{
                      fontSize: '0.62rem', padding: '2px 7px', borderRadius: '4px',
                      background: 'rgba(255,107,53,0.1)', color: '#FF6B35',
                      border: '1px solid rgba(255,107,53,0.2)',
                    }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* 정책 제언 */}
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                borderRadius: '8px', padding: '0.65rem 0.8rem',
                border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c7d2fe', marginBottom: '0.25rem' }}>
                  📋 정책 제언
                </div>
                <div style={{ fontSize: '0.74rem', color: '#a5b4fc', lineHeight: 1.65 }}>
                  {sel.policy}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 긴급 개발 필요 구 */}
      <div style={{ marginTop: '3rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          marginBottom: '1.2rem',
        }}>
          <span style={{
            background: 'linear-gradient(135deg, rgba(239,71,111,0.15), rgba(239,71,111,0.05))',
            border: '1px solid rgba(239,71,111,0.3)',
            borderRadius: '8px', padding: '0.3rem 0.8rem',
            fontSize: '0.75rem', color: '#EF476F', fontWeight: 700,
          }}>
            🚨 긴급 개발 필요
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            학교 위기 + 신규 공급 부족 동시 해당 구
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '0.75rem' }}>
          {URGENT.map(d => (
            <div
              key={d.name}
              onClick={() => setSelected(d.name)}
              style={{
                background: selected === d.name
                  ? 'rgba(239,71,111,0.12)'
                  : 'rgba(239,71,111,0.05)',
                border: `1px solid ${selected === d.name ? 'rgba(239,71,111,0.5)' : 'rgba(239,71,111,0.2)'}`,
                borderRadius: '12px', padding: '0.9rem 1rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {d.name}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: '#EF476F', fontWeight: 700 }}>
                    안전율 {d.safeRate}%
                  </span>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    공급 {d.newApts.toLocaleString()}세대
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {d.policy.length > 72 ? d.policy.slice(0, 72) + '…' : d.policy}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 출처 */}
      <div style={{
        marginTop: '2.5rem',
        padding: '0.85rem 1rem',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '8px',
        fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.8,
      }}>
        * 신규 아파트 공급: 서울시 건축 허가 통계(2020~2024) 기반 추산 &nbsp;|&nbsp;
        학교 안전율: 교육부 학생 수 현황 및 통계청 학령인구 기반 추산<br />
        * 본 자료는 정책 참고용 추산값입니다. 실제 행정 결정에는 공식 통계를 별도 확인하시기 바랍니다.
      </div>
    </div>
  )
}
