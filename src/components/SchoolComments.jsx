import { useEffect, useState } from 'react'
import { getSchoolComments, createSchoolComment } from '../lib/supabase'
import { getStoredKakaoUser, loginWithKakao, logoutKakao } from '../lib/kakaoAuth'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export default function SchoolComments({ school }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [kakaoUser, setKakaoUser] = useState(() => getStoredKakaoUser())
  const [loginLoading, setLoginLoading] = useState(false)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getSchoolComments(school.id)
      .then((data) => { if (!cancelled) setComments(data) })
      .catch(() => { if (!cancelled) setComments([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [school.id])

  async function handleLogin() {
    setLoginLoading(true)
    setError('')
    try {
      const user = await loginWithKakao()
      setKakaoUser(user)
    } catch (e) {
      setError(e.message || '카카오 로그인에 실패했습니다.')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleLogout() {
    logoutKakao()
    setKakaoUser(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!content.trim()) { setError('댓글 내용을 입력해주세요.'); return }
    setSubmitting(true)
    try {
      const created = await createSchoolComment({
        schoolId: school.id,
        schoolName: school.name,
        content: content.trim(),
        kakaoUser,
      })
      setComments((prev) => [created, ...prev])
      setContent('')
    } catch (e) {
      setError(`등록 실패: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="school-comments">
      <div className="school-comments-title">💬 학교 댓글 {comments.length > 0 && `(${comments.length})`}</div>

      {kakaoUser ? (
        <form onSubmit={handleSubmit} className="school-comment-form">
          <div className="school-comment-whoami">
            {kakaoUser.avatar
              ? <img src={kakaoUser.avatar} alt="" className="school-comment-avatar" />
              : <span className="school-comment-avatar school-comment-avatar-fallback">👤</span>}
            <span>{kakaoUser.nickname}님으로 작성 중</span>
            <button type="button" className="school-comment-logout" onClick={handleLogout}>로그아웃</button>
          </div>
          <textarea
            className="form-textarea"
            placeholder={`${school.name}에 대한 의견을 남겨주세요.`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <button className="btn-primary" type="submit" disabled={submitting} style={{ marginTop: '0.6rem' }}>
            {submitting ? '등록 중…' : '댓글 등록'}
          </button>
        </form>
      ) : (
        <button className="kakao-login-btn" onClick={handleLogin} disabled={loginLoading}>
          {loginLoading ? '연결 중…' : '💬 카카오 로그인하고 댓글쓰기'}
        </button>
      )}

      {error && <div className="school-comment-error">⚠ {error}</div>}

      <div className="school-comment-list">
        {loading ? (
          <div className="school-comment-empty">불러오는 중…</div>
        ) : comments.length === 0 ? (
          <div className="school-comment-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</div>
        ) : (
          comments.map((c) => (
            <div className="school-comment-item" key={c.id}>
              {c.author_avatar
                ? <img src={c.author_avatar} alt="" className="school-comment-avatar" />
                : <span className="school-comment-avatar school-comment-avatar-fallback">👤</span>}
              <div className="school-comment-body">
                <div className="school-comment-meta">
                  <strong>{c.author_name}</strong>
                  <span>{timeAgo(c.created_at)}</span>
                </div>
                <div className="school-comment-content">{c.content}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
