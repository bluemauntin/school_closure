// 카카오 로그인(JS SDK) — 별도 백엔드가 없던 시절엔 Kakao.Auth.login() 팝업으로
// access token을 브라우저에서 직접 받았지만, 카카오가 이 방식을 폐지하고
// Kakao.Auth.authorize()(전체 페이지 리다이렉트, Authorization Code Flow)로 바꿨다.
// 이 흐름은 인가 코드(code)를 access token으로 교환할 때 REST API 키(+선택적 client
// secret)가 필요해서 브라우저에서 직접 할 수 없고, api/kakao-token.js(서버리스 함수)를
// 거친다.
// 지도(카카오맵) SDK와는 별개의 스크립트(t1.kakaocdn.net)이며, 같은 JavaScript 키를 재사용한다.

const KAKAO_SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'
const SESSION_KEY = 'kakao_comment_user'
const RETURN_STATE_KEY = 'kakao_login_return'

let loadPromise = null

function loadKakaoSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저 환경이 아닙니다.'))
  if (window.Kakao?.Auth) return Promise.resolve(window.Kakao)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = KAKAO_SDK_SRC
    script.async = true
    script.onload = () => {
      try {
        const jsKey = import.meta.env.VITE_KAKAO_JS_KEY
        if (!jsKey) throw new Error('VITE_KAKAO_JS_KEY가 설정되지 않았습니다.')
        if (!window.Kakao.isInitialized()) window.Kakao.init(jsKey)
        resolve(window.Kakao)
      } catch (e) {
        reject(e)
      }
    }
    script.onerror = () => reject(new Error('카카오 로그인 SDK를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })
  return loadPromise
}

function kakaoRedirectUri() {
  return `${window.location.origin}/`
}

export function getStoredKakaoUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function storeKakaoUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function logoutKakao() {
  localStorage.removeItem(SESSION_KEY)
  if (window.Kakao?.Auth?.getAccessToken?.()) {
    window.Kakao.Auth.setAccessToken(null)
  }
}

/**
 * 카카오 로그인 시작. 전체 페이지가 카카오 로그인 화면으로 리다이렉트되므로 이 함수는
 * 값을 반환하지 않는다(성공 시 페이지를 이탈함). pendingState(예: 선택 중이던 학교 id)를
 * sessionStorage에 남겨 두면, 돌아온 뒤 completeKakaoLoginFromUrl()이 그대로 돌려준다.
 */
export async function startKakaoLogin(pendingState) {
  const Kakao = await loadKakaoSdk()
  if (pendingState !== undefined) {
    sessionStorage.setItem(RETURN_STATE_KEY, JSON.stringify(pendingState))
  }
  Kakao.Auth.authorize({
    redirectUri: kakaoRedirectUri(),
    scope: 'profile_nickname,profile_image',
  })
}

function consumePendingKakaoLoginState() {
  try {
    const raw = sessionStorage.getItem(RETURN_STATE_KEY)
    sessionStorage.removeItem(RETURN_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * 카카오 로그인 리다이렉트로 돌아온 직후(앱 최초 마운트 시) 한 번 호출해야 한다.
 * URL에 인가 코드(code)가 있으면 서버(api/kakao-token.js)에서 access token으로
 * 교환하고, 그 토큰으로 프로필을 조회해 로그인 세션을 저장한다.
 * 처리 후에는 code/error 쿼리스트링을 URL에서 지운다(새로고침 시 재사용 방지).
 * 반환값의 pending은 startKakaoLogin에 넘겼던 상태(성공/실패와 무관하게 항상 반환).
 */
export async function completeKakaoLoginFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const kakaoError = params.get('error')
  const pending = consumePendingKakaoLoginState()

  if (!code && !kakaoError) return { pending }

  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  window.history.replaceState({}, '', url)

  if (kakaoError) {
    return { pending, error: params.get('error_description') || '카카오 로그인이 취소되었습니다.' }
  }

  try {
    const tokenRes = await fetch('/api/kakao-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: kakaoRedirectUri() }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(tokenData?.error || '카카오 로그인에 실패했습니다.')

    const Kakao = await loadKakaoSdk()
    Kakao.Auth.setAccessToken(tokenData.accessToken)

    const profile = await new Promise((resolve, reject) => {
      Kakao.API.request({
        url: '/v2/user/me',
        success: resolve,
        fail: (err) => reject(new Error(err?.msg || '카카오 프로필 조회에 실패했습니다.')),
      })
    })

    const user = {
      id: String(profile.id),
      nickname: profile.properties?.nickname || profile.kakao_account?.profile?.nickname || '카카오 사용자',
      avatar: profile.properties?.profile_image || profile.kakao_account?.profile?.profile_image_url || '',
    }
    storeKakaoUser(user)
    return { pending, user }
  } catch (e) {
    return { pending, error: e.message || '카카오 로그인에 실패했습니다.' }
  }
}

/**
 * 댓글 등록 등 서버 검증이 필요한 요청 직전에 호출해 현재 access token을 가져온다.
 * SDK 인스턴스가 메모리에 들고 있는 토큰만 반환하며(새로고침 후엔 사라짐),
 * 없으면 null — 이 경우 호출 쪽에서 재로그인을 안내해야 한다(리다이렉트 방식이라
 * 여기서 자동으로 재로그인을 시도할 수 없음).
 */
export async function getFreshKakaoAccessToken() {
  const Kakao = await loadKakaoSdk()
  return Kakao.Auth.getAccessToken() || null
}
