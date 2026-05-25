-- =============================================
-- My Own Speed - Supabase SQL Schema
-- 이 파일 전체를 복사해서
-- Supabase → SQL Editor 에 붙여넣고 Run!
-- =============================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  friend_code TEXT UNIQUE NOT NULL,
  points INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE running_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  goals JSONB NOT NULL,
  timers JSONB NOT NULL,
  total_seconds INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE manual_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  opponent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  result TEXT CHECK (result IN ('win', 'lose', 'draw', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "sessions_select" ON running_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert" ON running_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update" ON running_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "manual_select" ON manual_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "manual_insert" ON manual_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "friends_select" ON friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friends_insert" ON friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "friends_delete" ON friends FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "challenges_select" ON challenges FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "challenges_update" ON challenges FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- 회원가입 시 자동으로 profile + 친구코드 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM profiles WHERE friend_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  INSERT INTO profiles (id, email, friend_code, points)
  VALUES (NEW.id, NEW.email, new_code, 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
