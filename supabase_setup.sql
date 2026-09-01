-- =====================================================
-- 폐교 리포트 — Supabase 테이블 설정 SQL
-- Supabase → SQL Editor에서 실행하세요
-- =====================================================

-- 1. ideas 테이블 생성
CREATE TABLE IF NOT EXISTS public.ideas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  content     text NOT NULL,
  category    text DEFAULT '기타',
  author_name text DEFAULT '익명',
  likes       integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- 2. RLS(Row Level Security) 활성화
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

-- 3. 모든 사용자 읽기 허용 (비회원 조회 가능)
CREATE POLICY "Anyone can read ideas"
  ON public.ideas FOR SELECT
  USING (true);

-- 4. 모든 사용자 쓰기 허용 (비회원 제출 가능)
CREATE POLICY "Anyone can insert ideas"
  ON public.ideas FOR INSERT
  WITH CHECK (true);

-- 5. 모든 사용자 좋아요 업데이트 허용
CREATE POLICY "Anyone can update likes"
  ON public.ideas FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 완료! 이제 앱에서 아이디어를 저장할 수 있습니다.
-- =====================================================


-- =====================================================
-- 전국 폐교 지도 — 학교별 댓글(카카오 로그인 연동) 테이블
-- =====================================================

-- 6. school_comments 테이블 생성
CREATE TABLE IF NOT EXISTS public.school_comments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      integer NOT NULL,
  school_name    text NOT NULL,
  content        text NOT NULL,
  kakao_user_id  text NOT NULL,
  author_name    text NOT NULL,
  author_avatar  text,
  created_at     timestamptz DEFAULT now()
);

-- 7. 조회 성능을 위한 인덱스 (학교별 댓글 조회가 주 쿼리 패턴)
CREATE INDEX IF NOT EXISTS school_comments_school_id_idx ON public.school_comments (school_id);

-- 8. RLS 활성화
ALTER TABLE public.school_comments ENABLE ROW LEVEL SECURITY;

-- 9. 누구나 댓글 조회 가능 (비회원도 읽기는 가능)
CREATE POLICY "Anyone can read school comments"
  ON public.school_comments FOR SELECT
  USING (true);

-- 10. 댓글 작성(INSERT)은 anon/authenticated 어느 쪽에도 허용하지 않습니다.
--     대신 /api/verify-kakao-comment (Vercel 서버리스 함수)가 카카오 access
--     token을 kapi.kakao.com에 직접 검증한 뒤, service_role 키로만 insert합니다.
--     service_role은 RLS를 우회하므로 이 테이블에는 INSERT 정책이 없어도(=기본
--     거부) 서버 함수의 insert는 정상 동작하며, anon 키로 직접 insert를
--     시도하면 차단됩니다.
--     ※ 기존에 "Anyone can insert school comments" 정책(WITH CHECK (true))이
--        있었다면 아래 DROP으로 제거하세요 — 남아있으면 여전히 우회 가능합니다.
DROP POLICY IF EXISTS "Anyone can insert school comments" ON public.school_comments;

-- =====================================================
-- 완료! 이제 학교별 댓글을 저장할 수 있습니다.
-- (댓글 작성은 반드시 /api/verify-kakao-comment를 거쳐야 하며, 이 서버리스
--  함수를 배포하려면 Vercel 프로젝트 환경변수에 SUPABASE_SERVICE_ROLE_KEY를
--  추가해야 합니다 — .env.example 참고)
-- =====================================================
