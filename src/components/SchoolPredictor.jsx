import { useState, useRef, useEffect, useCallback } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  LineElement, PointElement, Filler, Tooltip,
} from 'chart.js'
import { SCHOOLS, calcRiskLevel, RISK_LABELS } from '../data/schools'
import { predictSchoolClosure } from '../lib/groqApi'
import { searchSchools } from '../lib/neisApi'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip)

const RISK_CLASS = { 고위험: 'high', 주의: 'medium', 안전: 'low', 분석불가: 'medium' }
const RISK_EMOJI = { 고위험: '🔴', 주의: '🟡', 안전: '🟢', 분석불가: '⚪' }
const TYPE_EMOJI = { '초등학교': '🏫', '중학교': '🏫', '고등학교': '🏫', '특수학교': '🏫' }

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

// 로컬 샘플 데이터를 NEIS 결과와 같은 형태로 변환
function toNeisLike(school) {
  return {
    ...school,
    _isLocal: true,
    address: school.region,
    establish: '공립',
    type: school.type,
  }
}

export default function SchoolPredictor() {
  const [query, setQuery] = useState('')
  const [filtered, setFiltered] = useState([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)

  // 디바운스 검색: NEIS API + 로컬 샘플 병합
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setFiltered([]); setOpen(false); return }

    setSearchLoading(true)
    try {
      // 로컬 샘플 필터
      const localResults = SCHOOLS.filter(
        s => s.name.includes(q) || s.region.toLowerCase().includes(q) || s.type.includes(q)
      ).slice(0, 3).map(toNeisLike)

      // NEIS API 검색
      let neisResults = []
      try {
        neisResults = await searchSchools(q)
      } catch {
        // API 실패 시 로컬만 사용
      }

      // 중복 제거 후 병합 (로컬 우선, 최대 10개)
      const localNames = new Set(localResults.map(s => s.name))
      const merged = [
        ...localResults,
        ...neisResults.filter(s => !localNames.has(s.name)),
      ].slice(0, 10)

      setFiltered(merged)
      setOpen(merged.length > 0)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setFiltered([]); setOpen(false); return }
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, doSearch])

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

    // 로컬 데이터에 enrollment가 있으면 바로 AI 분석
    if (school._isLocal && school.enrollment) {
      setLoading(true)
      try {
        const result = await predictSchoolClosure(school)
        setPrediction(result)
      } catch (e) {
        setError(e.message || 'AI 예측 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
      return
    }

    // NEIS 학교: enrollment 데이터 없이 학교 기본 정보만으로 AI 분석
    setLoading(true)
    try {
      const schoolForAI = {
        name: school.name,
        region: school.region || school.address,
        type: school.type,
        enrollment: [], // NEIS 학생수 API는 별도 호출 필요 - 빈 배열 전달
        _neisOnly: true,
      }
      const result = await predictSchoolClosure(schoolForAI)
      setPrediction(result)
    } catch (e) {
      setError(e.message || 'AI 예측 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const hasChart = selected?._isLocal && selected?.enrollment?.length > 0
  const chartData = hasChart
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

  const predRiskClass = prediction ? (RISK_CLASS[prediction.risk] || 'medium') : null

  return (
    <div className="section-wrap" style={{ background: 'rgba(255,255,255,0.012)', borderRadius: '0' }}>
      <div className="section-header">
        <div className="section-badge">🔮 AI 폐교 예측기</div>
        <h2 className="section-title">우리 학교, 얼마나 위험할까?</h2>
        <p className="section-desc">
          학교 이름을 검색하면 <strong>전국 모든 학교</strong>를 찾을 수 있습니다.
          신입생 추이와 함께 Groq AI가 폐교 예상 시기와 위험도를 분석해드립니다.
        </p>
      </div>

      {/* 전국 검색 안내 배너 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        background: 'linear-gradient(90deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '10px', padding: '0.6rem 1rem',
        fontSize: '0.82rem', color: '#a5b4fc',
        marginBottom: '1rem',
      }}>
        <span>🌐</span>
        <span>NEIS(교육정보시스템) 연동 — 전국 초·중·고등학교 실시간 검색</span>
      </div>

      <div className="search-wrap" ref={wrapRef}>
        <div className="search-box">
          <span className="search-icon">
            {searchLoading ? <span className="spinner" style={{ width: 16, height: 16, display: 'inline-block' }} /> : '🔍'}
          </span>
          <input
            id="school-search"
            className="search-input"
            type="text"
            placeholder="학교명 검색 (예: 서울고, 부산초, 세종중)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => filtered.length && setOpen(true)}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setFiltered([]); setOpen(false); setSelected(null); setPrediction(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 0.5rem', fontSize: '1rem' }}
            >✕</button>
          )}
        </div>

        {open && filtered.length > 0 && (
          <div className="search-dropdown">
            {filtered.map((s, idx) => {
              const rc = s._isLocal ? getRiskClass(s) : 'medium'
              const rl = s._isLocal ? getRiskLabel(s) : null
              return (
                <div className="dropdown-item" key={s.id || idx} onClick={() => selectSchool(s)}>
                  <div>
                    <div className="dropdown-school">
                      {TYPE_EMOJI[s.type] || '🏫'} {s.name}
                      {!s._isLocal && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: '4px', padding: '0 5px' }}>NEIS</span>}
                    </div>
                    <div className="dropdown-region">
                      {s.region || s.address} · {s.type}
                      {s.establish && <span style={{ marginLeft: '0.3rem', opacity: 0.6 }}>({s.establish})</span>}
                    </div>
                  </div>
                  {rl && <span className={`risk-badge risk-${rc}`}>{RISK_EMOJI[rl]} {rl}</span>}
                </div>
              )
            })}
            {searchLoading && (
              <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: '0.4rem' }} />
                전국 학교 검색 중…
              </div>
            )}
          </div>
        )}
      </div>

      {/* hint chips */}
      {!selected && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {['서울', '부산', '대구', '광주', '강원'].map(k => (
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
            (지역명으로도 검색 가능)
          </span>
        </div>
      )}

      {selected && (
        <div className="prediction-panel">
          {/* 상단: 학교 정보 + 위험도 게이지 */}
          <div className="pred-top">
            <div>
              <div className="pred-school-name">{selected.name}</div>
              <div className="pred-region">{selected.region || selected.address}</div>
              <span className="pred-type-tag">{selected.type}</span>
              {selected.establish && (
                <span className="pred-type-tag" style={{ marginLeft: '0.4rem', background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                  {selected.establish}
                </span>
              )}
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
                  {selected._isLocal ? RISK_EMOJI[getRiskLabel(selected)] : '🔍'}
                </div>
              )}
            </div>
          </div>

          {/* 신입생 차트 (로컬 데이터 있을 때만) */}
          {hasChart && (
            <>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                📊 연도별 신입생 수 추이
              </div>
              <div className="chart-container">
                {chartData && <Line data={chartData} options={chartOptions} />}
              </div>
            </>
          )}

          {/* NEIS 학교 안내 */}
          {!hasChart && !loading && (
            <div style={{
              background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '10px', padding: '0.85rem 1rem',
              fontSize: '0.82rem', color: '#a5b4fc', marginBottom: '1rem',
            }}>
              📡 NEIS에서 검색된 학교입니다. 신입생 추이 차트는 상세 데이터가 있는 샘플 학교에서만 표시됩니다.
              AI는 학교명·지역·유형 정보를 기반으로 분석합니다.
            </div>
          )}

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
          <p>전국 학교 이름을 검색하면 AI가 폐교 위험도를 분석해드립니다</p>
        </div>
      )}
    </div>
  )
}
