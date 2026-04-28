import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** 아이디어 전체 조회 (최신순) */
export async function getIdeas() {
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
  const { data, error } = await supabase
    .from('ideas')
    .update({ likes: currentLikes + 1 })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
