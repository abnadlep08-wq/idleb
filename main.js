// ============================================
// الملف الرئيسي - جميع وظائف الموقع
// ============================================

// تهيئة المتغيرات العامة
let currentUser = null;
let aosInitialized = false;

// انتظار تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initTheme();
    initNavbar();
    initHeroBackground();
    initAOS();
    initStatsCounter();
    initPricingCards();
    initFaq();
    initChat();
    initNewsletter();
    initSmoothScroll();
    initMobileMenu();
    checkUserStatus();
});

// ============================================
// شريط التحميل
// ============================================
function initLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    
    setTimeout(() => {
        loader.classList.add('fade-out');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }, 1000);
}

// ============================================
// نظام الوضع الليلي/النهاري
// ============================================
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    // التحقق من الوضع المحفوظ
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    });
}

// ============================================
// شريط التنقل الذكي
// ============================================
function initNavbar() {
    const header = document.getElementById('header');
    if (!header) return;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // إخفاء/إظهار الشريط حسب التمرير
        if (currentScroll > lastScroll && currentScroll > 100) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        
        lastScroll = currentScroll;
        
        // تفعيل الرابط النشط
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.nav-link');
        
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            
            if (currentScroll >= sectionTop) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// ============================================
// خلفية القسم الرئيسي
// ============================================
function initHeroBackground() {
    const heroBg = document.getElementById('heroBackground');
    if (!heroBg || !window.CONFIG?.heroBackground) return;
    
    heroBg.style.backgroundImage = `url('${window.CONFIG.heroBackground}')`;
    
    // صورة احتياطية إذا فشلت
    const img = new Image();
    img.onerror = () => {
        if (window.CONFIG?.fallbackImage) {
            heroBg.style.backgroundImage = `url('${window.CONFIG.fallbackImage}')`;
        }
    };
    img.src = window.CONFIG.heroBackground;
}

// ============================================
// تفعيل الرسوم المتحركة
// ============================================
function initAOS() {
    if (aosInitialized) return;
    
    // مراقبة العناصر
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('[data-aos]').forEach(el => {
        observer.observe(el);
    });
    
    aosInitialized = true;
}

// ============================================
// عداد الإحصائيات
// ============================================
function initStatsCounter() {
    const statVideos = document.getElementById('liveVideosCount');
    const statUsers = document.getElementById('liveUsersCount');
    
    if (!statVideos && !statUsers) return;
    
    // جلب إحصائيات حقيقية من الخادم
    fetch('/.netlify/functions/get-stats')
        .then(res => res.json())
        .then(data => {
            if (statVideos) animateNumber(statVideos, data.videos || 50000, '');
            if (statUsers) animateNumber(statUsers, data.users || 10000, '');
        })
        .catch(() => {
            // بيانات افتراضية إذا فشل الجلب
            if (statVideos) animateNumber(statVideos, 50000, '');
            if (statUsers) animateNumber(statUsers, 10000, '');
        });
}

// تحريك الأرقام
function animateNumber(element, target, suffix = '') {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + suffix;
    }, 30);
}

// ============================================
// بطاقات الباقات
// ============================================
function initPricingCards() {
    const pricingGrid = document.getElementById('pricingGrid');
    const pricingToggle = document.getElementById('pricingToggle');
    
    if (!pricingGrid) return;
    
    // بيانات الباقات
    const plans = {
        monthly: [
            {
                name: 'مجاني',
                price: '0',
                features: [
                    '3 معالجات في الشهر',
                    'مدة فيديو حتى 3 دقائق',
                    'حجم ملف حتى 50 ميجابايت',
                    'تأثيرات أساسية',
                    'دعم عبر البريد الإلكتروني'
                ],
                disabled: ['معالجة أولوية', 'دعم فني متميز', 'تصدير بدون علامة مائية']
            },
            {
                name: 'احترافي',
                price: '19',
                features: [
                    '50 معالجة في الشهر',
                    'مدة فيديو حتى 15 دقيقة',
                    'حجم ملف حتى 500 ميجابايت',
                    'جميع التأثيرات المتاحة',
                    'معالجة أولوية',
                    'دعم فني عبر الدردشة'
                ],
                disabled: ['دعم فني متميز VIP'],
                popular: true
            },
            {
                name: 'غير محدود',
                price: '49',
                features: [
                    'معالجة غير محدودة',
                    'مدة فيديو حتى 60 دقيقة',
                    'حجم ملف حتى 2 جيجابايت',
                    'جميع التأثيرات المتاحة',
                    'معالجة أولوية VIP',
                    'دعم فني متميز 24/7',
                    'تصدير بدون علامة مائية'
                ],
                disabled: []
            }
        ],
        yearly: [
            {
                name: 'مجاني',
                price: '0',
                yearlyPrice: '0',
                features: [
                    '3 معالجات في الشهر',
                    'مدة فيديو حتى 3 دقائق',
                    'حجم ملف حتى 50 ميجابايت',
                    'تأثيرات أساسية'
                ],
                disabled: ['معالجة أولوية', 'دعم فني متميز']
            },
            {
                name: 'احترافي',
                price: '15',
                yearlyPrice: '180',
                features: [
                    '50 معالجة في الشهر',
                    'مدة فيديو حتى 15 دقيقة',
                    'حجم ملف حتى 500 ميجابايت',
                    'جميع التأثيرات المتاحة',
                    'معالجة أولوية',
                    'دعم فني عبر الدردشة'
                ],
                disabled: [],
                popular: true
            },
            {
                name: 'غير محدود',
                price: '39',
                yearlyPrice: '468',
                features: [
                    'معالجة غير محدودة',
                    'مدة فيديو حتى 60 دقيقة',
                    'حجم ملف حتى 2 جيجابايت',
                    'جميع التأثيرات المتاحة',
                    'معالجة أولوية VIP',
                    'دعم فني متميز 24/7'
                ],
                disabled: []
            }
        ]
    };
    
    // عرض الباقات
    function renderPricing(isYearly) {
        const currentPlans = isYearly ? plans.yearly : plans.monthly;
        
        pricingGrid.innerHTML = currentPlans.map(plan => `
            <div class="pricing-card ${plan.popular ? 'popular' : ''}">
                ${plan.popular ? '<div class="popular-badge">الأكثر شهرة</div>' : ''}
                <div class="pricing-header">
                    <h3>${plan.name}</h3>
                    <div class="price">
                        $${plan.price}<span>/${isYearly ? 'سنة' : 'شهر'}</span>
                    </div>
                    ${isYearly && plan.yearlyPrice ? `<small>$${plan.yearlyPrice} سنوياً</small>` : ''}
                </div>
                <div class="pricing-features">
                    <ul>
                        ${plan.features.map(f => `
                            <li><i class="fas fa-check"></i> ${f}</li>
                        `).join('')}
                        ${plan.disabled.map(f => `
                            <li class="disabled"><i class="fas fa-times"></i> ${f}</li>
                        `).join('')}
                    </ul>
                </div>
                <button class="btn ${plan.popular ? 'btn-primary' : 'btn-outline'} btn-block" 
                        onclick="window.location.href='signup?plan=${plan.name.toLowerCase()}'">
                    اختر الخطة
                </button>
            </div>
        `).join('');
    }
    
    // التبديل بين شهري/سنوي
    if (pricingToggle) {
        pricingToggle.addEventListener('change', (e) => {
            renderPricing(e.target.checked);
        });
    }
    
    // العرض الأولي
    renderPricing(false);
}

// ============================================
// الأسئلة الشائعة
// ============================================
function initFaq() {
    window.toggleFaq = function(element) {
        const faqItem = element.closest('.faq-item');
        faqItem.classList.toggle('active');
    };
}

// ============================================
// الدردشة المباشرة
// ============================================
function initChat() {
    window.toggleChat = function() {
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow) {
            if (chatWindow.style.display === 'none') {
                chatWindow.style.display = 'block';
                // تقليل الإشعار
                document.querySelector('.chat-notification').style.display = 'none';
            } else {
                chatWindow.style.display = 'none';
            }
        }
    };
    
    window.sendMessage = function() {
        const input = document.getElementById('chatInput');
        const messages = document.getElementById('chatMessages');
        
        if (!input.value.trim()) return;
        
        // إضافة رسالة المستخدم
        const userMsg = document.createElement('div');
        userMsg.className = 'message user';
        userMsg.innerHTML = `
            <p>${input.value}</p>
            <span>الآن</span>
        `;
        messages.appendChild(userMsg);
        
        // محاكاة رد الدعم
        setTimeout(() => {
            const supportMsg = document.createElement('div');
            supportMsg.className = 'message support';
            supportMsg.innerHTML = `
                <p>شكراً لتواصلك. أحد ممثلي الدعم سيرد عليك قريباً.</p>
                <span>منذ لحظة</span>
            `;
            messages.appendChild(supportMsg);
            messages.scrollTop = messages.scrollHeight;
        }, 1000);
        
        input.value = '';
        messages.scrollTop = messages.scrollHeight;
    };
}

// ============================================
// النشرة البريدية
// ============================================
function initNewsletter() {
    const newsletterForm = document.querySelector('.newsletter-form');
    if (!newsletterForm) return;
    
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = newsletterForm.querySelector('input').value;
        
        // إرسال إلى الخادم
        fetch('/.netlify/functions/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('تم الاشتراك في النشرة البريدية بنجاح!');
                newsletterForm.reset();
            }
        })
        .catch(() => {
            alert('حدث خطأ، الرجاء المحاولة لاحقاً');
        });
    });
}

// ============================================
// التمرير السلس
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ============================================
// القائمة في الجوال
// ============================================
function initMobileMenu() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');
    
    if (!mobileBtn || !navMenu) return;
    
    mobileBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        
        // تغيير الأيقونة
        const icon = mobileBtn.querySelector('i');
        if (navMenu.classList.contains('active')) {
            icon.className = 'fas fa-times';
        } else {
            icon.className = 'fas fa-bars';
        }
    });
    
    // إغلاق القائمة عند النقر على رابط
    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            mobileBtn.querySelector('i').className = 'fas fa-bars';
        });
    });
}

// ============================================
// التحقق من حالة المستخدم
// ============================================
function checkUserStatus() {
    // التحقق من وجود مستخدم مسجل
    const user = localStorage.getItem('user');
    if (user) {
        try {
            currentUser = JSON.parse(user);
            updateUIForLoggedInUser();
        } catch (e) {
            console.error('خطأ في قراءة بيانات المستخدم');
        }
    }
}

// تحديث الواجهة للمستخدم المسجل
function updateUIForLoggedInUser() {
    const navButtons = document.getElementById('navButtons');
    const userStats = document.getElementById('userStats');
    
    if (navButtons && currentUser) {
        // تغيير الأزرار
        const authButtons = navButtons.querySelectorAll('.btn-outline, .btn-primary');
        authButtons.forEach(btn => btn.style.display = 'none');
        
        // إضافة زر حسابي
        const userBtn = document.createElement('a');
        userBtn.href = 'dashboard.html';
        userBtn.className = 'btn btn-outline';
        userBtn.innerHTML = `<i class="fas fa-user"></i> ${currentUser.user_metadata?.full_name || 'حسابي'}`;
        navButtons.appendChild(userBtn);
    }
    
    // إظهار إحصائيات المستخدم
    if (userStats && currentUser) {
        userStats.style.display = 'block';
        loadUserStats();
    }
}

// تحميل إحصائيات المستخدم
function loadUserStats() {
    const statsGrid = document.getElementById('dashboardStats');
    if (!statsGrid || !currentUser) return;
    
    // جلب الإحصائيات من الخادم
    fetch(`/.netlify/functions/user-stats?userId=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${data.videosCount || 0}</div>
                    <div class="stat-label">فيديوهات معالجة</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.credits || 3}</div>
                    <div class="stat-label">الرصيد المتبقي</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.storageUsed || 0} MB</div>
                    <div class="stat-label">مساحة مستخدمة</div>
                </div>
            `;
        })
        .catch(err => {
            console.error('فشل في تحميل الإحصائيات:', err);
        });
}

// ============================================
// دوال المصادقة (سيتم استدعاؤها من auth.js)
// ============================================
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

window.closeModal = function() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.switchAuthTab = function(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('signupForm').classList.add('active');
    }
};

window.showForgotPassword = function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotPasswordForm');
    
    if (loginForm) loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.remove('active');
    if (forgotForm) forgotForm.classList.add('active');
};

// إغلاق النافذة عند النقر خارجها
window.addEventListener('click', (e) => {
    const modal = document.getElementById('authModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// منع إغلاق النافذة عند النقر داخلها
document.querySelector('.modal-content')?.addEventListener('click', (e) => {
    e.stopPropagation();
});

// ============================================
// دوال مساعدة
// ============================================
window.openLiveChat = function() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
        chatWindow.style.display = 'block';
        document.querySelector('.chat-notification').style.display = 'none';
    }
};

// تهيئة AOS للعناصر الديناميكية
window.refreshAOS = function() {
    aosInitialized = false;
    initAOS();
};

// تحديث إحصائيات المستخدم
window.refreshUserStats = function() {
    if (currentUser) {
        loadUserStats();
    }
};

// ============================================
// حفظ بيانات المستخدم بعد تسجيل الدخول
// ============================================
window.handleLogin = async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        // محاكاة تسجيل دخول - استبدلها بـ API حقيقي
        if (email && password) {
            const mockUser = {
                id: '123',
                email: email,
                user_metadata: { full_name: 'مستخدم' }
            };
            
            localStorage.setItem('user', JSON.stringify(mockUser));
            currentUser = mockUser;
            
            closeModal();
            updateUIForLoggedInUser();
            
            alert('تم تسجيل الدخول بنجاح!');
            window.location.href = 'dashboard.html';
        } else {
            alert('الرجاء إدخال البريد وكلمة المرور');
        }
    } catch (error) {
        alert('فشل تسجيل الدخول: ' + error.message);
    }
};

window.handleSignup = async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirm) {
        alert('كلمة المرور غير متطابقة');
        return;
    }
    
    try {
        // محاكاة إنشاء حساب - استبدلها بـ API حقيقي
        alert('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن');
        switchAuthTab('login');
    } catch (error) {
        alert('فشل إنشاء الحساب: ' + error.message);
    }
};

window.handleForgotPassword = async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    
    try {
        // محاكاة إرسال رابط - استبدلها بـ API حقيقي
        alert(`تم إرسال رابط استعادة كلمة المرور إلى ${email}`);
        switchAuthTab('login');
    } catch (error) {
        alert('فشل إرسال رابط الاستعادة: ' + error.message);
    }
};

window.loginWithGoogle = function() {
    alert('جاري التوجيه إلى تسجيل الدخول بحساب Google...');
    // استبدلها بتسجيل دخول حقيقي عبر Google
};
