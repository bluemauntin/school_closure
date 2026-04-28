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
