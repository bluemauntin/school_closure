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

## 💬 학교 댓글 (카카오 로그인) 서버 검증
- 댓글 작성은 `/api/verify-kakao-comment` (Vercel 서버리스 함수)를 거칩니다. 이 함수가 클라이언트가 보낸 카카오 access token을 `kapi.kakao.com`에 직접 검증한 뒤, `service_role` 키로만 Supabase에 insert합니다.
- 이 함수가 동작하려면 `SUPABASE_SERVICE_ROLE_KEY` 환경변수가 필요합니다(`.env.example` 참고). 로컬은 `.env`, 배포는 Vercel 프로젝트 환경변수에 추가하세요. **`VITE_` 접두사를 붙이면 안 됩니다** — 그러면 클라이언트 번들에 노출됩니다.
- `npm run dev`(순수 Vite dev 서버)는 `/api` 폴더를 실행하지 않습니다. 댓글 등록을 로컬에서 테스트하려면 `vercel dev`로 실행하거나 Vercel에 배포해서 확인하세요.
