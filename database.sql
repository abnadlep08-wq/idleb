-- ============================================
-- إنشاء قاعدة بيانات Supabase
-- ============================================

-- تمكين الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- جدول المستخدمين
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    plan TEXT DEFAULT 'free',
    credits INTEGER DEFAULT 3,
    total_credits INTEGER DEFAULT 3,
    max_duration INTEGER DEFAULT 180,
    max_size BIGINT DEFAULT 104857600,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE
);

-- ============================================
-- جدول الفيديوهات
-- ============================================
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER DEFAULT 0,
    size BIGINT DEFAULT 0,
    options JSONB DEFAULT '{}',
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0
);

-- ============================================
-- جدول المعاملات المالية
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    is_yearly BOOLEAN DEFAULT FALSE,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- جدول رسائل الاتصال
-- ============================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    type TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    response TEXT
);

-- ============================================
-- جدول النشرة البريدية
-- ============================================
CREATE TABLE newsletter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- إنشاء الفهارس
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_created_at ON videos(created_at);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_newsletter_email ON newsletter(email);

-- ============================================
-- إنشاء المشغلات
-- ============================================

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- إنشاء سياسات الأمان RLS
-- ============================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;

-- سياسات المستخدمين
CREATE POLICY "Users can view own data"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- سياسات الفيديوهات
CREATE POLICY "Users can view own videos"
    ON videos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos"
    ON videos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
    ON videos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
    ON videos FOR DELETE
    USING (auth.uid() = user_id);

-- سياسات المعاملات
CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

-- سياسات رسائل الاتصال
CREATE POLICY "Anyone can insert contact messages"
    ON contacts FOR INSERT
    WITH CHECK (true);

-- ============================================
-- إنشاء دوال مساعدة
-- ============================================

-- دالة تسجيل دخول المستخدم
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- مشغل إنشاء مستخدم جديد
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- دالة تحديث آخر دخول
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET last_login = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION update_last_login();
