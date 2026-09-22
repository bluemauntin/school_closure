import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const ENABLED = !!(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co') &&
  supabaseAnonKey
)

export const supabase = ENABLED ? createClient(supabaseUrl, supabaseAnonKey) : null

/** 아이디어 전체 조회 (최신순) */
export async function getIdeas() {
  if (!ENABLED || !supabase) return []

  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}

/**
 * 아이디어 등록. 카카오 access token은 서버(/api/verify-kakao-idea)에서 직접
 * 검증되며, 작성자 닉네임도 서버가 그 검증된 프로필에서 가져와 저장한다
 * (클라이언트가 보낸 값은 신뢰하지 않음) — school_comments와 동일한 패턴.
 */
export async function createIdea({ title, content, category, accessToken }) {
  const res = await fetch('/api/verify-kakao-idea', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, category, accessToken }),
  })

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('서버 응답을 처리하지 못했습니다.')
  }

  if (!res.ok) throw new Error(data?.error || '아이디어 등록에 실패했습니다.')
  return data
}

/** 본인이 작성한 아이디어 삭제 (서버가 access token으로 작성자 본인 여부를 검증) */
export async function deleteIdea({ id, accessToken }) {
  return deleteKakaoPost({ table: 'ideas', id, accessToken })
}

/** 좋아요 +1 */
export async function likeIdea(id, currentLikes) {
  if (!ENABLED || !supabase) throw new Error('데이터베이스 연결이 설정되지 않았습니다.')

  const { data, error } = await supabase
    .from('ideas')
    .update({ likes: currentLikes + 1 })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/** 특정 학교의 댓글 전체 조회 (최신순) */
export async function getSchoolComments(schoolId) {
  if (!ENABLED || !supabase) return []

  const { data, error } = await supabase
    .from('school_comments')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * 학교 댓글 등록. 카카오 access token은 서버(/api/verify-kakao-comment)에서
 * 카카오 API로 직접 검증되며, 작성자 닉네임/프로필사진도 서버가 그 검증된
 * 프로필에서 가져와 저장한다 (클라이언트가 보낸 값은 신뢰하지 않음).
 */
export async function createSchoolComment({ schoolId, schoolName, content, accessToken }) {
  const res = await fetch('/api/verify-kakao-comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId, schoolName, content, accessToken }),
  })

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('서버 응답을 처리하지 못했습니다.')
  }

  if (!res.ok) throw new Error(data?.error || '댓글 등록에 실패했습니다.')
  return data
}

/** 본인이 작성한 학교 댓글 삭제 (서버가 access token으로 작성자 본인 여부를 검증) */
export async function deleteSchoolComment({ id, accessToken }) {
  return deleteKakaoPost({ table: 'school_comments', id, accessToken })
}

/** /api/delete-kakao-post 공용 삭제 요청 — 학교 댓글/아이디어가 함께 사용 */
async function deleteKakaoPost({ table, id, accessToken }) {
  const res = await fetch('/api/delete-kakao-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, id, accessToken }),
  })

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('서버 응답을 처리하지 못했습니다.')
  }

  if (!res.ok) throw new Error(data?.error || '삭제에 실패했습니다.')
  return data
}
