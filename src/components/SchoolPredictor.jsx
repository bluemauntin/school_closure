import { useState, useRef, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  LineElement, PointElement, Filler, Tooltip,
} from 'chart.js'
import { SCHOOLS, calcRiskLevel, RISK_LABELS } from '../data/schools'
import { predictSchoolClosure } from '../lib/groqApi'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip)

const RISK_CLASS = { 고위험: 'high', 주의: 'medium', 안전: 'low', 분석불가: 'medium' }
const RISK_EMOJI = { 고위험: '🔴', 주의: '🟡', 안전: '🟢', 분석불가: '⚪' }

function getRiskClass(school) {
  const lvl = calcRiskLevel(school)
  if (lvl === 'high') return 'high'
  if (lvl === 'medium') return 'medium'
  return 'low'
}

function getRiskLabel(school) {
  const lvl = calcRiskLevel(school)
  return RISK_LABELS[lvl]
}

export default function SchoolPredictor() {
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) { setFiltered([]); setOpen(false); return }
    const q = query.trim().toLowerCase()
    const results = SCHOOLS.filter(
      s => s.name.includes(q) || s.region.toLowerCase().includes(q) || s.type.includes(q)
    ).slice(0, 8)
    setFiltered(results)
    setOpen(results.length > 0)
  }, [query])

  useEffect(() => {
    const handleClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function selectSchool(school) {
    setSelected(school)
    setQuery(school.name)
    setOpen(false)
    setPrediction(null)
    setError('')
    setLoading(true)
    try {
      const result = await predictSchoolClosure(school)
      setPrediction(result)
    } catch (e) {
      setError(e.message || 'AI 예측 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const chartData = selected
    ? {
        labels: selected.enrollment.map(e => `${e.year}`),
        datasets: [
          {
            data: selected.enrollment.map(e => e.count),
            borderColor: '#FF6B35',
            backgroundColor: 'rgba(255,107,53,0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: selected.enrollment.map((e, i, arr) =>
              i === arr.length - 1 ? '#EF476F' : '#FF6B35'
            ),
            pointRadius: 5,
            tension: 0.35,
            fill: true,
          },
        ],
      }
    : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => ` 신입생 ${ctx.raw}명`,
        },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8892AA', font: { size: 11 } } },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#8892AA', font: { size: 11 }, callback: (v) => `${v}명` },
        beginAtZero: true,
      },
    },
  }

  const predRiskClass =
    prediction ? (RISK_CLASS[prediction.risk] || 'medium') : null

  return (
    <div className="section-wrap" style={{ background: 'rgba(255,255,255,0.012)', borderRadius: '0' }}>
      <div className="section-header">
        <div className="section-badge">🔮 AI 폐교 예측기</div>
        <h2 className="section-title">우리 학교, 얼마나 위험할까?</h2>
        <p className="section-desc">
          학교 이름 또는 지역을 검색하면 신입생 추이와 함께 Groq AI가
          폐교 예상 시기와 위험도를 분석해드립니다.
        </p>
      </div>

      <div className="search-wrap" ref={wrapRef}>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            id="school-search"
            className="search-input"
            type="text"
            placeholder="학교명 또는 지역 검색 (예: 양양, 고흥, 강원)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => filtered.length && setOpen(true)}
            autoComplete="off"
          />
        </div>

        {open && filtered.length > 0 && (
          <div className="search-dropdown">
            {filtered.map(s => {
              const rc = getRiskClass(s)
              const rl = getRiskLabel(s)
              return (
                <div className="dropdown-item" key={s.id} onClick={() => selectSchool(s)}>
                  <div>
                    <div className="dropdown-school">{s.name}</div>
                    <div className="dropdown-region">{s.region} · {s.type}</div>
                  </div>
                  <span className={`risk-badge risk-${rc}`}>{RISK_EMOJI[rl]} {rl}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* hint chips */}
      {!selected && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {['양양', '고흥', '진안', '삼척', '의성'].map(k => (
            <button
              key={k}
              onClick={() => setQuery(k)}
              style={{
                background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)',
                color: '#FF6B35', borderRadius: '100px', padding: '0.3rem 0.85rem',
                fontSize: '0.78rem', fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              {k} 검색
            </button>
          ))}
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            (샘플 검색어)
          </span>
        </div>
      )}

      {selected && (
        <div className="prediction-panel">
          {/* 상단: 학교 정보 + 위험도 게이지 */}
          <div className="pred-top">
            <div>
              <div className="pred-school-name">{selected.name}</div>
              <div className="pred-region">{selected.region}</div>
              <span className="pred-type-tag">{selected.type}</span>
            </div>
            <div className="risk-gauge">
              {loading ? (
                <div className="risk-circle" style={{ borderColor: '#4A5568', color: '#4A5568', fontSize: '1rem' }}>
                  <div className="spinner" style={{ width: 28, height: 28 }} />
                </div>
              ) : prediction ? (
                <>
                  <div className={`risk-circle risk-${predRiskClass}-circle`}>
                    {RISK_EMOJI[prediction.risk] || '⚪'}
                  </div>
                  <div className="risk-gauge-label">{prediction.risk}</div>
                </>
              ) : (
                <div className="risk-circle" style={{ borderColor: '#4A5568', color: '#4A5568' }}>
                  {RISK_EMOJI[getRiskLabel(selected)]}
                </div>
              )}
            </div>
          </div>

          {/* 신입생 차트 */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            📊 연도별 신입생 수 추이
          </div>
          <div className="chart-container">
            {chartData && <Line data={chartData} options={chartOptions} />}
          </div>

          {/* AI 예측 결과 */}
          <div className="ai-box">
            <div className="ai-box-label">✨ Groq AI 분석 결과</div>
            {loading && (
              <div className="ai-loading">
                <div className="spinner" />
                <span>AI가 데이터를 분석 중입니다…</span>
              </div>
            )}
            {error && (
              <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>
                ⚠ {error}
                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  .env 파일에 VITE_GROQ_API_KEY가 올바르게 설정되어 있는지 확인하세요.
                </div>
              </div>
            )}
            {prediction && !loading && (
              <>
                <p className="ai-text">{prediction.analysis}</p>
                {prediction.recommendation && (
                  <p className="ai-text" style={{ marginTop: '0.75rem', color: 'var(--accent-gold)' }}>
                    💡 {prediction.recommendation}
                  </p>
                )}
                <div className="ai-meta">
                  <div className="ai-meta-item">
                    <label>위험 등급</label>
                    <span className={`risk-${RISK_CLASS[prediction.risk] || 'medium'}`}
                      style={{ color: prediction.risk === '고위험' ? '#EF476F' : prediction.risk === '주의' ? '#FFD166' : '#06D6A0' }}>
                      {prediction.risk}
                    </span>
                  </div>
                  <div className="ai-meta-item">
                    <label>예상 폐교 시기</label>
                    <span>{prediction.expectedYear}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!selected && !query && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>학교를 검색하면 AI가 폐교 위험도를 분석해드립니다</p>
        </div>
      )}
    </div>
  )
}
