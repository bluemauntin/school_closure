import { useState, useEffect } from 'react'
import { getIdeas, createIdea, likeIdea } from '../lib/supabase'

const CATEGORIES = ['전체', '문화·예술', '교육·도서관', '주거·공동체', '농업·생태', '창업·경제', '기타']
const CAT_EMOJI = { '문화·예술': '🎨', '교육·도서관': '📚', '주거·공동체': '🏡', '농업·생태': '🌱', '창업·경제': '💡', '기타': '✨' }

const SORT_OPTIONS = [
  { key: 'likes', label: '❤ 하트 많은 순' },
  { key: 'latest', label: '🕐 최신순' },
]

const SAMPLE_IDEAS = [
  { id: 'sample-1', title: '폐교를 마을 도서관으로', content: '교실을 리모델링해 지역 어르신들이 책을 읽고 쉴 수 있는 마을 도서관으로 만들면 어떨까요? 방과 후 수업도 함께 운영하면 세대를 아우를 수 있습니다.', category: '교육·도서관', author_name: '마을 주민 김씨', likes: 24, created_at: '2024-10-01T00:00:00Z' },
  { id: 'sample-2', title: '청년 창업 스튜디오로 변신', content: '도시에서 탈출한 청년들이 소규모 스튜디오·작업실로 쓸 수 있게 저렴하게 임대하면 지역 활성화에 도움이 될 것 같습니다.', category: '창업·경제', author_name: '귀촌 청년 이씨', likes: 18, created_at: '2024-09-20T00:00:00Z' },
  { id: 'sample-3', title: '스마트팜 교육 센터', content: '운동장과 교실을 활용해 도시농업·스마트팜 실습 교육 기관으로 만들면 일자리도 창출되고 지역 농업도 살릴 수 있습니다.', category: '농업·생태', author_name: '농업인 박씨', likes: 31, created_at: '2024-09-10T00:00:00Z' },
]

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function sortIdeas(ideas, sortKey) {
  return [...ideas].sort((a, b) => {
    if (sortKey === 'likes') return (b.likes || 0) - (a.likes || 0)
    return new Date(b.created_at) - new Date(a.created_at)
  })
}

export default function IdeaBoard() {
  const [ideas, setIdeas] = useState(SAMPLE_IDEAS)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('전체')
  const [sortKey, setSortKey] = useState('likes')
  const [likedIds, setLikedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('liked_ideas') || '[]') } catch { return [] }
  })

  // Form state
  const [form, setForm] = useState({ title: '', content: '', category: '문화·예술', author_name: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    getIdeas()
      .then(data => setIdeas(data.length ? data : SAMPLE_IDEAS))
      .catch(() => setIdeas(SAMPLE_IDEAS))
      .finally(() => setLoading(false))
  }, [])

  const handleField = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim()) { setFormError('제목을 입력해주세요.'); return }
    if (!form.content.trim()) { setFormError('내용을 입력해주세요.'); return }
    setSubmitting(true)
    try {
      const created = await createIdea(form)
      setIdeas(prev => [created, ...prev])
      setForm({ title: '', content: '', category: '문화·예술', author_name: '' })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setFormError(`저장 실패: ${err.message}. Supabase 설정을 확인하세요.`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLike(idea) {
    if (likedIds.includes(idea.id)) return
    try {
      const updated = await likeIdea(idea.id, idea.likes || 0)
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, likes: updated.likes } : i))
      const newLiked = [...likedIds, idea.id]
      setLikedIds(newLiked)
      localStorage.setItem('liked_ideas', JSON.stringify(newLiked))
    } catch {
      // 오프라인 처리: 로컬만 갱신
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, likes: (i.likes || 0) + 1 } : i))
      const newLiked = [...likedIds, idea.id]
      setLikedIds(newLiked)
      localStorage.setItem('liked_ideas', JSON.stringify(newLiked))
    }
  }

  const filtered_ideas = filter === '전체' ? ideas : ideas.filter(i => i.category === filter)
  const displayed = sortIdeas(filtered_ideas, sortKey)

  // 하트 1위 아이디어
  const topIdea = ideas.length > 0
    ? [...ideas].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0]
    : null

  return (
    <div className="section-wrap">
      <div className="section-header">
        <div className="section-badge">💡 시민 아이디어</div>
        <h2 className="section-title">폐교 부지, 어떻게 쓸까요?</h2>
        <p className="section-desc">
          전국에 방치된 367곳의 폐교 부지를 어떻게 활용하면 좋을지
          아이디어를 자유롭게 제안해주세요. 회원가입 없이 바로 작성할 수 있어요.
        </p>
      </div>

      {/* ── 선정 기준 배너 ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,71,111,0.12), rgba(255,209,102,0.08))',
        border: '1px solid rgba(239,71,111,0.3)',
        borderRadius: '14px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>🏆</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFD166', marginBottom: '0.4rem' }}>
            아이디어 선정 기준
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <li><span style={{ color: '#EF476F', fontWeight: 600 }}>❤ 하트가 가장 많은 아이디어</span>가 최종 채택 의견으로 선정됩니다.</li>
            <li>매월 1일 기준으로 상위 3개 아이디어를 정책 제안 목록에 포함합니다.</li>
            <li>누구나 아이디어당 <strong style={{ color: '#FFD166' }}>1회</strong> 하트를 누를 수 있습니다.</li>
          </ul>
          {topIdea && (
            <div style={{
              marginTop: '0.75rem',
              background: 'rgba(255,209,102,0.1)',
              borderRadius: '8px',
              padding: '0.5rem 0.8rem',
              fontSize: '0.82rem',
              color: '#FFD166',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>🥇</span>
              <span>현재 1위: <strong>"{topIdea.title}"</strong> — ❤ {topIdea.likes || 0}개</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 제출 폼 ── */}
      <div className="idea-form-card">
        <div className="idea-form-title">✏️ 아이디어 제안하기</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="idea-title">제목 *</label>
              <input
                id="idea-title"
                name="title"
                className="form-input"
                type="text"
                placeholder="간결하고 명확한 제목을 입력하세요"
                value={form.title}
                onChange={handleField}
                maxLength={60}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="idea-category">카테고리</label>
              <select
                id="idea-category"
                name="category"
                className="form-select"
                value={form.category}
                onChange={handleField}
              >
                {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="idea-content">내용 *</label>
            <textarea
              id="idea-content"
              name="content"
              className="form-textarea"
              placeholder="폐교 부지를 어떻게 활용하면 좋을지 자유롭게 적어주세요. 구체적일수록 좋아요! ❤ 하트가 많을수록 채택 가능성이 높아집니다."
              value={form.content}
              onChange={handleField}
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="idea-author">작성자 (선택)</label>
            <input
              id="idea-author"
              name="author_name"
              className="form-input"
              type="text"
              placeholder="닉네임 또는 지역명 (비워두면 '익명'으로 표시)"
              value={form.author_name}
              onChange={handleField}
              maxLength={20}
            />
          </div>

          {formError && (
            <div style={{ color: 'var(--accent-red)', fontSize: '0.83rem', marginBottom: '0.75rem' }}>
              ⚠ {formError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button id="submit-idea-btn" className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? '제출 중…' : '💡 아이디어 제출'}
            </button>
            {success && (
              <div className="submit-success">✅ 제출 완료! 소중한 의견 감사합니다.</div>
            )}
          </div>
        </form>
      </div>

      {/* ── 필터 + 정렬 컨트롤 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        {/* 카테고리 필터 */}
        <div className="ideas-filter" style={{ marginBottom: 0 }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`filter-btn ${filter === c ? 'active' : ''}`}
              onClick={() => setFilter(c)}
            >
              {c !== '전체' && CAT_EMOJI[c] + ' '}{c}
              {c === '전체' && <span style={{ marginLeft: '0.3rem', opacity: 0.6 }}>({ideas.length})</span>}
            </button>
          ))}
        </div>

        {/* 정렬 버튼 */}
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '100px',
                fontSize: '0.78rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: sortKey === opt.key
                  ? '1px solid rgba(239,71,111,0.5)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: sortKey === opt.key
                  ? 'rgba(239,71,111,0.15)'
                  : 'rgba(255,255,255,0.04)',
                color: sortKey === opt.key ? '#EF476F' : 'var(--text-muted)',
                transition: 'all 0.2s',
                fontWeight: sortKey === opt.key ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 아이디어 목록 ── */}
      {loading ? (
        <div className="news-skeleton">
          {[1,2,3].map(i => (
            <div className="skeleton-card" key={i}>
              <div className="sk sk-tag" />
              <div className="sk sk-title" style={{ height: 18 }} />
              <div className="sk sk-title-short" style={{ height: 18 }} />
              <div className="sk sk-line" />
              <div className="sk sk-line" />
              <div className="sk sk-line-short" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💭</div>
          <p>아직 이 카테고리에 아이디어가 없습니다. 첫 번째로 제안해보세요!</p>
        </div>
      ) : (
        <div className="ideas-grid">
          {displayed.map((idea, idx) => {
            // 하트 1위 카드 강조
            const isTop = sortKey === 'likes' && idx === 0 && (idea.likes || 0) > 0
            return (
              <div
                className="idea-card"
                key={idea.id}
                style={isTop ? {
                  border: '1.5px solid rgba(239,71,111,0.5)',
                  background: 'linear-gradient(135deg, rgba(239,71,111,0.07), rgba(20,20,35,0.9))',
                  position: 'relative',
                } : {}}
              >
                {isTop && (
                  <div style={{
                    position: 'absolute', top: '-10px', right: '12px',
                    background: 'linear-gradient(90deg, #EF476F, #FFD166)',
                    color: '#0D0D1A', fontSize: '0.7rem', fontWeight: 700,
                    padding: '2px 10px', borderRadius: '100px',
                  }}>
                    🏆 현재 1위
                  </div>
                )}
                <span className="idea-cat-tag">
                  {CAT_EMOJI[idea.category] || '✨'} {idea.category || '기타'}
                </span>
                <div className="idea-title">{idea.title}</div>
                <div className="idea-body">{idea.content}</div>
                <div className="idea-footer">
                  <div className="idea-author">
                    👤 {idea.author_name || '익명'} · {timeAgo(idea.created_at)}
                  </div>
                  <button
                    className={`like-btn ${likedIds.includes(idea.id) ? 'liked' : ''}`}
                    onClick={() => handleLike(idea)}
                    disabled={likedIds.includes(idea.id)}
                    title={likedIds.includes(idea.id) ? '이미 좋아요를 눌렀어요' : '좋아요'}
                  >
                    ❤ {idea.likes || 0}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
