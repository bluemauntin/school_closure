// 카카오 로그인(JS SDK) — 별도 백엔드가 없는 순수 프론트엔드 구조라
// Kakao.Auth.login() 팝업 플로우로 access token을 브라우저에서 직접 받는다.
// 지도(카카오맵) SDK와는 별개의 스크립트(t1.kakaocdn.net)이며, 같은 JavaScript 키를 재사용한다.

const KAKAO_SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'
const SESSION_KEY = 'kakao_comment_user'

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

/** 카카오 로그인 팝업 → 닉네임/프로필사진 조회 → 로컬에 세션 저장 후 반환 */
export async function loginWithKakao() {
  const Kakao = await loadKakaoSdk()

  await new Promise((resolve, reject) => {
    Kakao.Auth.login({
      scope: 'profile_nickname,profile_image',
      success: resolve,
      fail: (err) => reject(new Error(err?.error_description || '카카오 로그인에 실패했습니다.')),
    })
  })

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
  return user
}
