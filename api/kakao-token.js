// Vercel 서버리스 함수 — 카카오 로그인 Authorization Code를 access token으로 교환한다.
// Kakao.Auth.authorize()가 리다이렉트로 돌려준 code는 REST API 키(+콘솔에서 활성화한
// 경우 client secret)로만 토큰 교환이 가능해서, 그 키를 노출하지 않으려면 브라우저에서
// 직접 호출할 수 없다 — 그래서 서버를 거친다.

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!KAKAO_REST_API_KEY) {
    return res.status(500).json({ error: '서버에 카카오 REST API 키(KAKAO_REST_API_KEY)가 설정되어 있지 않습니다.' })
  }

  const { code, redirectUri } = req.body || {}
  if (!code || !redirectUri) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' })
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: redirectUri,
    code,
  })
  if (KAKAO_CLIENT_SECRET) params.set('client_secret', KAKAO_CLIENT_SECRET)

  let tokenRes
  try {
    tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: params.toString(),
    })
  } catch {
    return res.status(502).json({ error: '카카오 인증 서버 연결에 실패했습니다.' })
  }

  const tokenData = await tokenRes.json().catch(() => null)
  if (!tokenRes.ok || !tokenData?.access_token) {
    return res.status(401).json({ error: tokenData?.error_description || '카카오 로그인 코드가 유효하지 않습니다.' })
  }

  return res.status(200).json({ accessToken: tokenData.access_token })
}
