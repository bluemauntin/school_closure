// Vercel 서버리스 함수 — 학교 댓글 / 아이디어 보드 공용 "본인 글 삭제".
// 카카오 access token을 kapi.kakao.com에 직접 검증해 실제 작성자 kakao_user_id를
// 얻고, 그 값과 행의 kakao_user_id가 일치할 때만 service_role 키로 삭제한다
// (클라이언트가 보낸 사용자 정보는 신뢰하지 않음 — verify-kakao-*.js와 동일한 패턴).

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const ALLOWED_TABLES = new Set(['school_comments', 'ideas'])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: '서버에 Supabase 설정이 되어 있지 않습니다.' })
  }

  const { accessToken, table, id } = req.body || {}

  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(401).json({ error: '카카오 로그인이 필요합니다.' })
  }
  if (!ALLOWED_TABLES.has(table) || !id) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' })
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

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('kakao_user_id', kakaoUserId)
    .select()

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  if (!data || data.length === 0) {
    return res.status(403).json({ error: '본인이 작성한 글만 삭제할 수 있습니다.' })
  }

  return res.status(200).json({ success: true })
}
