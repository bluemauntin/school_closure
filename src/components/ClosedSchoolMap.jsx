import { useMemo, useRef, useState } from 'react'
import { Map, MapMarker, MarkerClusterer, useKakaoLoader } from 'react-kakao-maps-sdk'
import CLOSED_SCHOOLS from '../data/closedSchools.json'

// 사이트 전역 위험도 팔레트(risk-low/medium/high)와 동일한 색으로 통일:
// 자체활용(계속 쓰이는 중) = good, 대부(남에게 넘어간 상태) = 중립, 미활용(방치) = 주의
const STATUS_COLOR = {
  자체활용: '#06D6A0',
  대부: '#FFD166',
  미활용: '#EF476F',
}
// 마커·범례·상세패널에서 공통으로 쓰는 아이콘 — 색만으로 구분하지 않도록 형태로도 구분
const STATUS_ICON = {
  자체활용: '✓',
  대부: '→',
  미활용: '!',
}
const STATUS_GLYPH_SVG = {
  자체활용: '<path d="M8.7 12.6l3 3L18 8.4" stroke="#0B1120" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  대부: '<path d="M7.3 12.3h10.4m0 0l-3.6-3.6m3.6 3.6l-3.6 3.6" stroke="#0B1120" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  미활용: '<rect x="11.8" y="6.8" width="2.4" height="7.5" rx="1.2" fill="#0B1120"/><circle cx="13" cy="17.3" r="1.5" fill="#0B1120"/>',
}
const STATUS_LABELS = Object.keys(STATUS_COLOR)
const SIDO_LIST = [...new Set(CLOSED_SCHOOLS.map((s) => s.sido))].sort()

// 지도 위 점(dot) 대신 핀 모양 + 흰 배지 안에 상태별 아이콘을 그려 넣어 구분을 더 쉽게 함
function pinMarkerImage(color, glyphSvg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
    <path d="M13 0C6.1 0 0.5 5.5 0.5 12.3c0 9 12.5 21.2 12.5 21.2s12.5-12.2 12.5-21.2C25.5 5.5 19.9 0 13 0z" fill="${color}" stroke="#0B1120" stroke-width="1.3"/>
    <circle cx="13" cy="12.3" r="7.4" fill="#F7F9FC"/>
    ${glyphSvg}
  </svg>`
  return { src: `data:image/svg+xml;base64,${btoa(svg)}`, size: { width: 26, height: 34 } }
}
const MARKER_IMAGES = Object.fromEntries(
  STATUS_LABELS.map((s) => [s, pinMarkerImage(STATUS_COLOR[s], STATUS_GLYPH_SVG[s])])
)

// 클러스터 배지 기본 스타일(브랜드 주황) — onClustered에서 다수 상태색으로 덮어씀
const CLUSTER_STYLES = [
  { size: 40, fontSize: 13, fontWeight: 700 },
  { size: 52, fontSize: 14, fontWeight: 700 },
  { size: 64, fontSize: 15, fontWeight: 800 },
].map(({ size, fontSize, fontWeight }) => ({
  width: `${size}px`, height: `${size}px`, lineHeight: `${size}px`,
  background: 'rgba(255,107,53,0.9)',
  border: '3px solid rgba(8,13,26,0.9)', borderRadius: '50%',
  color: '#fff', textAlign: 'center', fontWeight, fontSize: `${fontSize}px`,
  boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
}))

// 동률일 때는 더 눈에 띄어야 할 상태(미활용 > 대부 > 자체활용) 우선
const STATUS_TIEBREAK = ['미활용', '대부', '자체활용']

function dominantStatus(counts) {
  let best = null
  let bestCount = 0
  for (const status of STATUS_TIEBREAK) {
    const count = counts[status] || 0
    if (count > bestCount) { best = status; bestCount = count }
  }
  return best
}

export default function ClosedSchoolMap() {
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_JS_KEY,
    libraries: ['clusterer'],
  })
  const [sido, setSido] = useState('전체')
  const [statusFilter, setStatusFilter] = useState(new Set(STATUS_LABELS))
  const [selected, setSelected] = useState(null)
  const markerStatusRef = useRef(new Map())

  const filtered = useMemo(
    () => CLOSED_SCHOOLS.filter((s) => (sido === '전체' || s.sido === sido) && statusFilter.has(s.status)),
    [sido, statusFilter]
  )

  const recolorClusters = (_target, clusters) => {
    clusters.forEach((cluster) => {
      const counts = {}
      cluster.getMarkers().forEach((marker) => {
        const status = markerStatusRef.current.get(marker)
        if (status) counts[status] = (counts[status] || 0) + 1
      })
      const dominant = dominantStatus(counts)
      if (!dominant) return
      const content = cluster.getClusterMarker().getContent()
      if (content && typeof content !== 'string') {
        content.style.background = STATUS_COLOR[dominant]
      }
    })
  }

  const toggleStatus = (label) => {
    setStatusFilter((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <div className="section-wrap">
      <div className="section-header">
        <div className="section-badge">🗺 전국 폐교 지도</div>
        <h2 className="section-title">폐교, 어디에 있을까</h2>
        <p className="section-desc">
          교육부 폐교재산 현황 데이터를 기반으로 전국 {CLOSED_SCHOOLS.length.toLocaleString()}곳
          폐교의 위치와 활용 현황을 지도에서 확인할 수 있습니다.
        </p>
      </div>

      <div className="map-filter-row">
        <select className="form-select map-sido-select" value={sido} onChange={(e) => setSido(e.target.value)}>
          <option value="전체">전체 시도</option>
          {SIDO_LIST.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {STATUS_LABELS.map((label) => {
            const active = statusFilter.has(label)
            return (
              <button
                key={label}
                className="filter-btn"
                onClick={() => toggleStatus(label)}
                style={active ? {
                  borderColor: STATUS_COLOR[label], color: STATUS_COLOR[label],
                  background: `${STATUS_COLOR[label]}18`,
                } : undefined}
              >
                {STATUS_ICON[label]} {label}
              </button>
            )
          })}
        </div>
        <div className="map-count">{filtered.length.toLocaleString()}곳 표시 중</div>
      </div>

      <div className="map-layout">
        <div className="chart-card map-card">
          {error ? (
            <div className="map-error">지도를 불러오지 못했습니다. 카카오맵 키 설정을 확인해 주세요.</div>
          ) : (
            <Map center={{ lat: 36.2, lng: 127.9 }} level={12} style={{ width: '100%', height: '520px' }}>
              {!loading && (
                <MarkerClusterer
                  averageCenter minLevel={6} gridSize={70}
                  styles={CLUSTER_STYLES} calculator={[10, 100]}
                  onClustered={recolorClusters}
                >
                  {filtered.map((s) => (
                    <MapMarker
                      key={s.id}
                      position={{ lat: s.lat, lng: s.lng }}
                      image={MARKER_IMAGES[s.status]}
                      title={s.name}
                      onClick={() => setSelected(s)}
                      onCreate={(marker) => markerStatusRef.current.set(marker, s.status)}
                    />
                  ))}
                </MarkerClusterer>
              )}
            </Map>
          )}
        </div>

        <div>
          {selected ? (
            <div className="map-detail-card" style={{ borderColor: `${STATUS_COLOR[selected.status]}44` }}>
              <div className="map-detail-name">{selected.name}</div>
              <span
                className="map-detail-badge"
                style={{
                  background: `${STATUS_COLOR[selected.status]}22`,
                  color: STATUS_COLOR[selected.status],
                  border: `1px solid ${STATUS_COLOR[selected.status]}44`,
                }}
              >
                {STATUS_ICON[selected.status]} {selected.status}
              </span>
              <div className="map-detail-info">
                <div>📍 {selected.address}</div>
                <div>🏫 {selected.level} · {selected.closedYear}년 폐교</div>
                <div>🗺 {selected.sido} {selected.sigungu}</div>
              </div>
            </div>
          ) : (
            <div className="map-detail-placeholder">
              지도의 마커를 클릭하면<br />상세 정보가 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
