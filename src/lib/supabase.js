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

/** 아이디어 등록 */
export async function createIdea({ title, content, category, author_name }) {
  if (!ENABLED || !supabase) throw new Error('데이터베이스 연결이 설정되지 않았습니다. Supabase 설정을 확인하세요.')

  const { data, error } = await supabase
    .from('ideas')
    .insert([{ title, content, category, author_name: author_name || '익명' }])
    .select()
    .single()

  if (error) throw error
  return data
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

/** 학교 댓글 등록 (카카오 로그인 사용자만 호출) */
export async function createSchoolComment({ schoolId, schoolName, content, kakaoUser }) {
  if (!ENABLED || !supabase) throw new Error('데이터베이스 연결이 설정되지 않았습니다. Supabase 설정을 확인하세요.')

  const { data, error } = await supabase
    .from('school_comments')
    .insert([{
      school_id: schoolId,
      school_name: schoolName,
      content,
      kakao_user_id: kakaoUser.id,
      author_name: kakaoUser.nickname,
      author_avatar: kakaoUser.avatar || null,
    }])
    .select()
    .single()

  if (error) throw error
  return data
}
