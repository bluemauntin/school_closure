// Vercel 서버리스 함수 — 학교 댓글 작성용.
// 클라이언트가 보낸 카카오 access token을 카카오 서버(kapi.kakao.com)에 직접 검증해서
// 위조된 kakao_user_id/닉네임으로 댓글을 남기지 못하게 막는다.
// Supabase insert는 service_role 키로 여기서만 수행하며, 그 키는 VITE_ 접두사가 없어
// 클라이언트 번들에는 절대 포함되지 않는다.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const MAX_CONTENT_LENGTH = 500

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: '서버에 Supabase 설정이 되어 있지 않습니다.' })
  }

  const { accessToken, schoolId, schoolName, content } = req.body || {}

  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(401).json({ error: '카카오 로그인이 필요합니다.' })
  }
  if (schoolId === undefined || schoolId === null || !schoolName || typeof content !== 'string') {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' })
  }
  const trimmed = content.trim()
  if (!trimmed || trimmed.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({ error: `댓글은 1~${MAX_CONTENT_LENGTH}자로 입력해주세요.` })
  }

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
  const avatar = profile.properties?.profile_image || profile.kakao_account?.profile?.profile_image_url || null

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase
    .from('school_comments')
    .insert([{
      school_id: schoolId,
      school_name: schoolName,
      content: trimmed,
      kakao_user_id: kakaoUserId,
      author_name: nickname,
      author_avatar: avatar,
    }])
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json(data)
}
