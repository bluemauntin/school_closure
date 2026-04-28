import { useState, useEffect, useRef } from 'react'

const KEY_STATS = [
  { value: '3,955', label: '2024년 기준\n누적 폐교 수', source: '교육부' },
  { value: '33곳', label: '2024년\n신규 폐교', source: '교육부' },
  { value: '367곳', label: '방치된\n미활용 폐교', source: '교육부' },
  { value: '70%', label: '초등학교\n폐교 비율', source: '교육부' },
  { value: '급감', label: '향후 5년\n학령인구 전망', source: '통계청' },
]

function AnimatedNumber({ target, suffix = '' }) {
  const [display, setDisplay] = useState('0')
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          // 숫자가 아닌 경우 그냥 표시
          const num = parseInt(target.replace(/[^0-9]/g, ''), 10)
          if (isNaN(num)) { setDisplay(target); return }
          const duration = 1600
          const steps = 50
          const step = num / steps
          let current = 0
          const interval = setInterval(() => {
            current += step
            if (current >= num) {
              setDisplay(target)
              clearInterval(interval)
            } else {
              setDisplay(
                target.replace(/[0-9,]+/, Math.floor(current).toLocaleString())
              )
            }
          }, duration / steps)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref} className="stat-value">{display}{suffix}</span>
}

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />

      <div className="hero-badge">⚠ 교육 위기 리포트 2024</div>

      <h1 className="hero-title">
        학교가 <span className="hl">사라지고</span> 있습니다
      </h1>

      <p className="hero-subtitle">
        매년 수십 곳의 학교가 문을 닫습니다. 학령인구 감소로 인한 폐교 위기는
        더 이상 농촌만의 문제가 아닙니다. 데이터로 현실을 직시하고, 함께 해법을 찾습니다.
      </p>

      <div className="hero-stats">
        {KEY_STATS.map((s, i) => (
          <div className="stat-card" key={i}>
            <AnimatedNumber target={s.value} />
            <div className="stat-label" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
            <div className="stat-source">출처: {s.source}</div>
          </div>
        ))}
      </div>

      <div className="scroll-hint">
        <span>스크롤하여 자세히 보기</span>
        <span className="scroll-arrow">↓</span>
      </div>
    </section>
  )
}
