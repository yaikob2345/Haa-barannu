// ============================================
// BARADHU - MASTER LOADER (FIXED)
// ============================================

// Create empty lessons array
const MASTER_LESSONS = [];

// Safely load each lesson
function loadLesson(lessonVar, lessonName) {
  try {
    if (typeof lessonVar !== 'undefined' && lessonVar !== null) {
      MASTER_LESSONS.push(lessonVar);
      console.log(`✅ Loaded ${lessonName}`);
    } else {
      console.warn(`⚠️ ${lessonName} not found`);
    }
  } catch (e) {
    console.error(`❌ Error loading ${lessonName}:`, e);
  }
}

// Load all lessons in order
loadLesson(LESSON_1, 'Lesson 1: Greetings');
loadLesson(LESSON_2, 'Lesson 2: Numbers');
loadLesson(LESSON_3, 'Lesson 3: Family');
loadLesson(LESSON_4, 'Lesson 4: Colors');
loadLesson(LESSON_5, 'Lesson 5: Animals');
loadLesson(LESSON_6, 'Lesson 6: Days');
loadLesson(LESSON_7, 'Lesson 7: Food');
loadLesson(LESSON_8, 'Lesson 8: Body Parts');
loadLesson(LESSON_9, 'Lesson 9: Clothing');
loadLesson(LESSON_10, 'Lesson 10: House');
loadLesson(LESSON_11, 'Lesson 11: Transportation');
loadLesson(LESSON_12, 'Lesson 12: Professions');
loadLesson(LESSON_13, 'lesson 13: School Subjects & Curriculum');

// ============================================
// PREMIUM CONFIG
// ============================================
const PREMIUM_CONFIG = {
  freeLessons: [1, 2, 3, 4, 5],
  premiumPrice: "150 ETB",
  telegram: "@jabaa",
  telegramLink: "https://t.me/jabaa",
  maxFailedAttempts: 3,
  lockDurationHours: 24,
  codeExpirationDays: 7,
  telebirr: {
    name: "Telebirr",
    accountName: "YOUR NAME HERE",
    number: "0911234567",
    icon: "📱"
  },
  awashBank: {
    name: "Awash Bank",
    accountName: "YOUR NAME HERE",
    accountNumber: "0123456789000",
    branch: "Addis Ababa",
    icon: "🏦"
  }
};

// ============================================
// USER MANAGEMENT
// ============================================
function loadUsers() {
  try {
    const saved = localStorage.getItem('baradhu_users');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem('baradhu_users', JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users:', e);
  }
}

function findUserByPhone(phone) {
  return loadUsers().find(u => u.phone === phone);
}

function findUserById(userId) {
  return loadUsers().find(u => u.id === userId);
}

function getCurrentUser() {
  try {
    const userId = localStorage.getItem('baradhu_current_user');
    if (!userId) return null;
    return findUserById(userId);
  } catch (e) {
    return null;
  }
}

function setCurrentUser(userId) {
  try {
    if (userId) {
      localStorage.setItem('baradhu_current_user', userId);
    } else {
      localStorage.removeItem('baradhu_current_user');
    }
  } catch (e) {
    console.error('Error setting user:', e);
  }
}

function updateUser(userId, updates) {
  try {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      saveUsers(users);
      return users[idx];
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ============================================
// ACTIVATION CODES
// ============================================
function loadCodes() {
  try {
    const saved = localStorage.getItem('baradhu_codes');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveCodes(codes) {
  try {
    localStorage.setItem('baradhu_codes', JSON.stringify(codes));
  } catch (e) {
    console.error('Error saving codes:', e);
  }
}

function findCodeByValue(codeValue) {
  return loadCodes().find(c => c.code.toUpperCase() === codeValue.toUpperCase());
}

function isCodeExpired(codeEntry) {
  if (!codeEntry.createdAt) return false;
  try {
    const created = new Date(codeEntry.createdAt);
    const now = new Date();
    const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
    return daysDiff > PREMIUM_CONFIG.codeExpirationDays;
  } catch (e) {
    return false;
  }
}

// ============================================
// MARK PREMIUM STATUS
// ============================================
MASTER_LESSONS.forEach(lesson => {
  lesson.isPremium = !PREMIUM_CONFIG.freeLessons.includes(lesson.id);
});

// ============================================
// STARTUP LOG
// ============================================
console.log('═══════════════════════════════════════');
console.log('🚀 BARADHU APP LOADED');
console.log('═══════════════════════════════════════');
console.log(`✅ Total Lessons: ${MASTER_LESSONS.length}`);
console.log(`🆓 Free: ${PREMIUM_CONFIG.freeLessons.length}`);
console.log(`💎 Premium: ${MASTER_LESSONS.length - PREMIUM_CONFIG.freeLessons.length}`);
console.log('═══════════════════════════════════════');

// Show error if no lessons loaded
if (MASTER_LESSONS.length === 0) {
  console.error('❌ NO LESSONS LOADED! Check your lesson files.');
}