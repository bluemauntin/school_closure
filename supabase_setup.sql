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

-- 10. 댓글 작성은 카카오 로그인 후 클라이언트에서만 허용(UX 단의 게이트).
--     주의: anon 키를 쓰는 순수 프론트엔드 구조라 이 INSERT 정책 자체는
--     카카오 로그인 여부를 서버에서 암호학적으로 검증하지 않습니다.
--     (이 프로젝트에 백엔드가 없어 카카오 access token을 서버에서 검증할 방법이 없음 —
--      ideas 테이블과 동일한 한계) kakao_user_id는 클라이언트가 보내는 값을 그대로 신뢰합니다.
CREATE POLICY "Anyone can insert school comments"
  ON public.school_comments FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 완료! 이제 학교별 댓글을 저장할 수 있습니다.
-- =====================================================
