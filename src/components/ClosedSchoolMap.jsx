import { useMemo, useState } from 'react'
import { Map, MapMarker, MarkerClusterer, useKakaoLoader } from 'react-kakao-maps-sdk'
import CLOSED_SCHOOLS from '../data/closedSchools.json'

const STATUS_COLOR = {
  자체활용: '#06D6A0',
  대부: '#4895EF',
  미활용: '#EF476F',
}
const STATUS_LABELS = Object.keys(STATUS_COLOR)
const SIDO_LIST = [...new Set(CLOSED_SCHOOLS.map((s) => s.sido))].sort()

function circleMarkerImage(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><circle cx="11" cy="11" r="8" fill="${color}" stroke="#0B1120" stroke-width="2"/></svg>`
  return { src: `data:image/svg+xml;base64,${btoa(svg)}`, size: { width: 22, height: 22 } }
}
const MARKER_IMAGES = Object.fromEntries(STATUS_LABELS.map((s) => [s, circleMarkerImage(STATUS_COLOR[s])]))

export default function ClosedSchoolMap() {
  const [loading, error] = useKakaoLoader({
    appkey: import.meta.env.VITE_KAKAO_JS_KEY,
    libraries: ['clusterer'],
  })
  const [sido, setSido] = useState('전체')
  const [statusFilter, setStatusFilter] = useState(new Set(STATUS_LABELS))
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(
    () => CLOSED_SCHOOLS.filter((s) => (sido === '전체' || s.sido === sido) && statusFilter.has(s.status)),
    [sido, statusFilter]
  )

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
                ● {label}
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
                <MarkerClusterer averageCenter minLevel={6} gridSize={70}>
                  {filtered.map((s) => (
                    <MapMarker
                      key={s.id}
                      position={{ lat: s.lat, lng: s.lng }}
                      image={MARKER_IMAGES[s.status]}
                      title={s.name}
                      onClick={() => setSelected(s)}
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
                ● {selected.status}
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
