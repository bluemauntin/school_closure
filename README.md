# 🏫 폐교 리포트 — 사라지는 학교들

학령인구 감소로 인한 한국의 폐교 문제를 데이터 기반으로 분석하고 시각화하는 웹사이트입니다.

## 🔗 주요 기능
- **📊 통계 대시보드**: 교육부 데이터를 시각화하여 연도별 폐교 현황 및 지역별 분포 제공
- **🔮 AI 폐교 예측기**: Groq AI를 활용하여 학교별 신입생 추이 분석 및 폐교 위험도 예측
- **💡 아이디어 보드**: 폐교 부지 활용을 위한 시민 참여형 아이디어 제안 게시판

## 🛠 기술 스택
- **Frontend**: React, Vite, Chart.js, Vanilla CSS
- **AI/Backend**: Groq API (Model: llama-3.3-70b-versatile), Supabase
- **Deployment**: Vercel

## 🚀 설치 및 시작 방법
1. **의존성 설치**:
   ```bash
   npm install
   ```
2. **환경 변수 설정**:
   `.env` 파일을 생성하고 아래 항목을 입력합니다. (가이드는 `.env.example` 참고)
   - `VITE_GROQ_API_KEY`: Groq API 키
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase 익명 공개 키

3. **실행**:
   ```bash
   npm run dev
   ```

## 🗄 데이터베이스 설정
- Supabase 프로젝트의 SQL Editor에서 `supabase_setup.sql` 파일의 쿼리를 실행하여 테이블을 생성해야 합니다.

## 💬 학교 댓글 · 아이디어 보드 (카카오 로그인) 서버 검증
- 카카오가 JS SDK의 팝업 로그인(`Kakao.Auth.login()`)을 폐지하고 리다이렉트 방식(`Kakao.Auth.authorize()`, Authorization Code Flow)으로 바꿨습니다. 그래서 "로그인하고 댓글쓰기"를 누르면 카카오 로그인 화면으로 페이지 전체가 이동했다가, 로그인 후 이 사이트로 돌아옵니다(팝업 아님).
- 이 인가 코드(code)는 REST API 키로만 access token으로 교환할 수 있어, `/api/kakao-token` (Vercel 서버리스 함수)이 그 교환을 대신합니다. 그 후 `/api/verify-kakao-comment`(학교 댓글) 또는 `/api/verify-kakao-idea`(아이디어 보드)가 이 access token을 `kapi.kakao.com`에 직접 검증한 뒤, `service_role` 키로만 Supabase에 insert합니다.
- 로그인 상태는 `src/lib/KakaoAuthContext.jsx`(`App.jsx` 최상단에 적용)가 한 곳에서 관리합니다 — 어느 섹션(학교 댓글 / 아이디어 보드)에서 로그인을 시작했든, 리다이렉트로 돌아온 뒤 양쪽 다 로그인 상태를 바로 인식합니다.
- 필요한 환경변수(`.env.example` 참고, 로컬은 `.env`, 배포는 Vercel 프로젝트 환경변수):
  - `SUPABASE_SERVICE_ROLE_KEY` — `VITE_` 접두사 금지(클라이언트 번들에 노출되어 RLS가 무력화됨)
  - `KAKAO_REST_API_KEY` — JS 키와 다른 키. `VITE_` 접두사 금지
  - `KAKAO_CLIENT_SECRET` — 카카오 콘솔에서 Client Secret을 켠 경우에만
- 카카오 개발자 콘솔 → 카카오 로그인 → Redirect URI에 `https://<배포 도메인>/`, `http://localhost:5173/`을 (끝 슬래시까지 정확히) 등록해야 합니다.
- `npm run dev`(순수 Vite dev 서버)는 `/api` 폴더를 실행하지 않습니다. 댓글 등록을 로컬에서 테스트하려면 `vercel dev`로 실행하거나 Vercel에 배포해서 확인하세요.
