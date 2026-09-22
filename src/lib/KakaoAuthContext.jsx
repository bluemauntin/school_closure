import { createContext, useContext, useEffect, useState } from 'react'
import { getStoredKakaoUser, startKakaoLogin, logoutKakao, completeKakaoLoginFromUrl } from './kakaoAuth'

// 카카오 로그인은 전체 페이지 리다이렉트 방식이라, 어느 섹션(학교 댓글 / 아이디어 보드)에서
// 로그인을 시작했든 로그인 후 돌아온 최초 마운트 시 딱 한 번만 콜백을 처리해야 한다.
// 그래서 로그인 상태를 App 최상단의 컨텍스트 하나로 모아 모든 섹션이 공유한다.
const KakaoAuthContext = createContext(null)

export function KakaoAuthProvider({ children }) {
  const [kakaoUser, setKakaoUser] = useState(() => getStoredKakaoUser())
  const [loginError, setLoginError] = useState('')
  const [pending, setPending] = useState(null)

  useEffect(() => {
    completeKakaoLoginFromUrl()
      .then(({ pending, user, error }) => {
        if (user) setKakaoUser(user)
        if (error) setLoginError(error)
        if (pending) setPending(pending)
      })
      .catch((err) => console.error('[KakaoAuthContext] login callback failed:', err))
  }, [])

  function logout() {
    logoutKakao()
    setKakaoUser(null)
  }

  const value = {
    kakaoUser,
    loginError,
    clearLoginError: () => setLoginError(''),
    pending,
    login: startKakaoLogin,
    logout,
  }

  return <KakaoAuthContext.Provider value={value}>{children}</KakaoAuthContext.Provider>
}

export function useKakaoAuth() {
  const ctx = useContext(KakaoAuthContext)
  if (!ctx) throw new Error('useKakaoAuth()는 KakaoAuthProvider 내부에서만 쓸 수 있습니다.')
  return ctx
}
