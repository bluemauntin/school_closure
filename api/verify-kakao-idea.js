// Vercel 서버리스 함수 — 아이디어 보드 제출용.
// api/verify-kakao-comment.js와 동일한 패턴: 클라이언트가 보낸 카카오 access token을
// kapi.kakao.com에 직접 검증해서 위조된 닉네임으로 아이디어를 남기지 못하게 막는다.
// Supabase insert는 service_role 키로 여기서만 수행한다.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const MAX_TITLE_LENGTH = 60
const MAX_CONTENT_LENGTH = 500
const CATEGORIES = ['문화·예술', '교육·도서관', '주거·공동체', '농업·생태', '창업·경제', '기타']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: '서버에 Supabase 설정이 되어 있지 않습니다.' })
  }

  const { accessToken, title, content, category } = req.body || {}

  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(401).json({ error: '카카오 로그인이 필요합니다.' })
  }

  const trimmedTitle = typeof title === 'string' ? title.trim() : ''
  const trimmedContent = typeof content === 'string' ? content.trim() : ''
  if (!trimmedTitle || trimmedTitle.length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: `제목은 1~${MAX_TITLE_LENGTH}자로 입력해주세요.` })
  }
  if (!trimmedContent || trimmedContent.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({ error: `내용은 1~${MAX_CONTENT_LENGTH}자로 입력해주세요.` })
  }
  const safeCategory = CATEGORIES.includes(category) ? category : '기타'

  let profile
  try {
    const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!kakaoRes.ok) {
      return res.status(401).json({ error: '카카오 로그인이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.' })
    }
    profile = await kakaoRes.json()
  } catch {
    return res.status(502).json({ error: '카카오 인증 서버 확인에 실패했습니다.' })
  }

  const kakaoUserId = profile?.id ? String(profile.id) : ''
  if (!kakaoUserId) {
    return res.status(401).json({ error: '카카오 프로필을 확인할 수 없습니다.' })
  }
  const nickname = profile.properties?.nickname || profile.kakao_account?.profile?.nickname || '카카오 사용자'

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase
    .from('ideas')
    .insert([{
      title: trimmedTitle,
      content: trimmedContent,
      category: safeCategory,
      author_name: nickname,
      kakao_user_id: kakaoUserId,
    }])
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json(data)
}
