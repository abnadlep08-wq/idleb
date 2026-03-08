// ============================================
// نظام المصادقة الحقيقي - يدعم البريد الإلكتروني وجوجل
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// تهيئة Supabase (يتم تعبئة المتغيرات من Netlify)
const SUPABASE_URL = window.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// تهيئة المصادقة
// ============================================
async function initAuth() {
    // التحقق من وجود مستخدم مسجل
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // مستخدم مسجل الدخول
        window.currentUser = user;
        updateUIForLoggedInUser(user);
        loadUserData(user.id);
    } else {
        // مستخدم زائر
        updateUIForGuest();
    }
    
    // استماع لتغييرات حالة المصادقة
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            window.currentUser = session.user;
            updateUIForLoggedInUser(session.user);
            loadUserData(session.user.id);
            
            // إغلاق النافذة المنبثقة
            closeModal();
            
            // توجيه إلى لوحة التحكم
            window.location.href = '/dashboard.html';
        } else if (event === 'SIGNED_OUT') {
            window.currentUser = null;
            updateUIForGuest();
            localStorage.removeItem('user');
        }
    });
}

// ============================================
// تحديث الواجهة للمستخدم المسجل
// ============================================
function updateUIForLoggedInUser(user) {
    const navButtons = document.getElementById('navButtons');
    const userStats = document.getElementById('userStats');
    
    if (!navButtons) return;
    
    // حفظ بيانات المستخدم محلياً
    localStorage.setItem('user', JSON.stringify(user));
    
    // تغيير الأزرار
    const authButtons = navButtons.querySelectorAll('.btn-outline, .btn-primary');
    authButtons.forEach(btn => btn.style.display = 'none');
    
    // إضافة صورة المستخدم واسمه
    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu';
    userMenu.innerHTML = `
        <button class="user-menu-btn" onclick="toggleUserMenu()">
            <img src="${user.user_metadata?.avatar_url || 'https://www.gravatar.com/avatar/?d=mp'}" 
                 alt="${user.user_metadata?.full_name || 'مستخدم'}"
                 class="user-avatar-small">
            <span>${user.user_metadata?.full_name || 'حسابي'}</span>
            <i class="fas fa-chevron-down"></i>
        </button>
        <div class="user-dropdown" id="userDropdown">
            <a href="/dashboard.html"><i class="fas fa-tachometer-alt"></i> لوحة التحكم</a>
            <a href="/profile.html"><i class="fas fa-user"></i> الملف الشخصي</a>
            <a href="/my-videos.html"><i class="fas fa-video"></i> فيديوهاتي</a>
            <a href="/billing.html"><i class="fas fa-credit-card"></i> الفواتير</a>
            <div class="dropdown-divider"></div>
            <a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> تسجيل خروج</a>
        </div>
    `;
    
    navButtons.appendChild(userMenu);
    
    // إظهار إحصائيات المستخدم
    if (userStats) {
        userStats.style.display = 'block';
    }
}

// ============================================
// تحديث الواجهة للزائر
// ============================================
function updateUIForGuest() {
    const navButtons = document.getElementById('navButtons');
    const userStats = document.getElementById('userStats');
    
    if (!navButtons) return;
    
    // إزالة قائمة المستخدم إذا وجدت
    const userMenu = navButtons.querySelector('.user-menu');
    if (userMenu) userMenu.remove();
    
    // إظهار أزرار المصادقة
    const authButtons = navButtons.querySelectorAll('.btn-outline, .btn-primary');
    authButtons.forEach(btn => btn.style.display = 'inline-flex');
    
    // إخفاء إحصائيات المستخدم
    if (userStats) {
        userStats.style.display = 'none';
    }
}

// ============================================
// تسجيل الدخول بالبريد الإلكتروني
// ============================================
window.handleLogin = async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe')?.checked || false;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
            options: {
                shouldCreateUser: false
            }
        });
        
        if (error) throw error;
        
        // تسجيل دخول ناجح
        showNotification('تم تسجيل الدخول بنجاح!', 'success');
        
    } catch (error) {
        showNotification('خطأ في تسجيل الدخول: ' + error.message, 'error');
    }
};

// ============================================
// إنشاء حساب جديد
// ============================================
window.handleSignup = async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirmPassword').value;
    
    // التحقق من تطابق كلمة المرور
    if (password !== confirm) {
        showNotification('كلمة المرور غير متطابقة', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff&size=128`
                },
                emailRedirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
        if (data.user && data.user.identities?.length === 0) {
            showNotification('البريد الإلكتروني مستخدم بالفعل', 'error');
        } else {
            showNotification('تم إنشاء الحساب بنجاح! يرجى تفعيل بريدك الإلكتروني', 'success');
            setTimeout(() => switchAuthTab('login'), 3000);
        }
        
    } catch (error) {
        showNotification('خطأ في إنشاء الحساب: ' + error.message, 'error');
    }
};

// ============================================
// تسجيل الدخول بحساب Google
// ============================================
window.loginWithGoogle = async function() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard.html',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        showNotification('خطأ في تسجيل الدخول بحساب Google: ' + error.message, 'error');
    }
};

// ============================================
// تسجيل الدخول بحساب Facebook
// ============================================
window.loginWithFacebook = async function() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: window.location.origin + '/dashboard.html'
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        showNotification('خطأ في تسجيل الدخول بحساب Facebook: ' + error.message, 'error');
    }
};

// ============================================
// تسجيل الخروج
// ============================================
window.logout = async function() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        // حذف البيانات المحلية
        localStorage.removeItem('user');
        window.currentUser = null;
        
        // تحديث الواجهة
        updateUIForGuest();
        
        // توجيه إلى الصفحة الرئيسية
        window.location.href = '/';
        
        showNotification('تم تسجيل الخروج بنجاح', 'success');
        
    } catch (error) {
        showNotification('خطأ في تسجيل الخروج: ' + error.message, 'error');
    }
};

// ============================================
// استعادة كلمة المرور
// ============================================
window.handleForgotPassword = async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        
        if (error) throw error;
        
        showNotification('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني', 'success');
        
        setTimeout(() => switchAuthTab('login'), 3000);
        
    } catch (error) {
        showNotification('خطأ في إرسال رابط الاستعادة: ' + error.message, 'error');
    }
};

// ============================================
// تحديث كلمة المرور
// ============================================
window.updatePassword = async function(newPassword) {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        showNotification('تم تحديث كلمة المرور بنجاح', 'success');
        
    } catch (error) {
        showNotification('خطأ في تحديث كلمة المرور: ' + error.message, 'error');
    }
};

// ============================================
// تحديث بيانات المستخدم
// ============================================
window.updateUserProfile = async function(updates) {
    try {
        const { error } = await supabase.auth.updateUser({
            data: updates
        });
        
        if (error) throw error;
        
        showNotification('تم تحديث الملف الشخصي بنجاح', 'success');
        
        // تحديث بيانات المستخدم المحلية
        const { data: { user } } = await supabase.auth.getUser();
        window.currentUser = user;
        
    } catch (error) {
        showNotification('خطأ في تحديث الملف الشخصي: ' + error.message, 'error');
    }
};

// ============================================
// رفع صورة المستخدم
// ============================================
window.uploadAvatar = async function(file) {
    if (!file) return;
    
    try {
        // رفع الصورة إلى Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${window.currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // الحصول على الرابط العام
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        
        // تحديث صورة المستخدم
        await updateUserProfile({ avatar_url: publicUrl });
        
        showNotification('تم رفع الصورة بنجاح', 'success');
        
        return publicUrl;
        
    } catch (error) {
        showNotification('خطأ في رفع الصورة: ' + error.message, 'error');
    }
};

// ============================================
// تحميل بيانات المستخدم
// ============================================
async function loadUserData(userId) {
    try {
        // جلب بيانات المستخدم من جدول users
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            // إذا لم يكن المستخدم موجوداً، أنشئ سجلاً جديداً
            if (error.code === 'PGRST116') {
                await createUserRecord(userId);
            } else {
                throw error;
            }
        }
        
        // تحديث البيانات في الواجهة
        if (userData) {
            updateUserDisplay(userData);
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// ============================================
// إنشاء سجل مستخدم جديد
// ============================================
async function createUserRecord(userId) {
    try {
        const { error } = await supabase
            .from('users')
            .insert([
                {
                    id: userId,
                    full_name: window.currentUser.user_metadata?.full_name || 'مستخدم',
                    credits: 3, // رصيد مجاني للمستخدمين الجدد
                    created_at: new Date()
                }
            ]);
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Error creating user record:', error);
    }
}

// ============================================
// تحديث عرض المستخدم
// ============================================
function updateUserDisplay(userData) {
    // تحديث الصورة الرمزية في القائمة
    const userAvatar = document.querySelector('.user-avatar-small');
    if (userAvatar && userData.avatar_url) {
        userAvatar.src = userData.avatar_url;
    }
    
    // تحديث اسم المستخدم
    const userName = document.querySelector('.user-menu-btn span');
    if (userName && userData.full_name) {
        userName.textContent = userData.full_name;
    }
}

// ============================================
// تبديل قائمة المستخدم
// ============================================
window.toggleUserMenu = function() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
};

// ============================================
// إغلاق قائمة المستخدم عند النقر خارجها
// ============================================
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userMenuBtn = document.querySelector('.user-menu-btn');
    
    if (dropdown && userMenuBtn && !userMenuBtn.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// ============================================
// إظهار الإشعارات
// ============================================
function showNotification(message, type = 'info') {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // إظهار الإشعار
    setTimeout(() => notification.classList.add('show'), 100);
    
    // إخفاء الإشعار بعد 3 ثوان
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// التحقق من صلاحية الجلسة
// ============================================
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        // لا يوجد جلسة نشطة
        return false;
    }
    
    // التحقق من صلاحية الجلسة
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt < now) {
        // الجلسة منتهية الصلاحية
        await supabase.auth.signOut();
        return false;
    }
    
    return true;
}

// ============================================
// تحديث الجلسة تلقائياً
// ============================================
setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        
        // إذا تبقى أقل من 5 دقائق، جدد الجلسة
        if (expiresAt - now < 300) {
            await supabase.auth.refreshSession();
        }
    }
}, 60000); // تحقق كل دقيقة

// ============================================
// تهيئة النظام عند تحميل الصفحة
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
});

// ============================================
// دوال مساعدة للنوافذ المنبثقة
// ============================================
window.switchAuthTab = function(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else if (tab === 'signup') {
        tabs[1].classList.add('active');
        document.getElementById('signupForm').classList.add('active');
    } else if (tab === 'forgot') {
        document.getElementById('loginForm').classList.remove('active');
        document.getElementById('signupForm').classList.remove('active');
        document.getElementById('forgotPasswordForm').classList.add('active');
    }
};

window.showForgotPassword = function() {
    switchAuthTab('forgot');
};

window.closeModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.openLoginModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'block';
        switchAuthTab('login');
    }
};

window.openSignupModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'block';
        switchAuthTab('signup');
    }
};
