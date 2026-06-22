// ============================================
// BARADHU - COMPLETE APP WITH ACTIVITIES
// ============================================

let currentLanguage = 'english';
let currentLesson = null;
let currentCardIndex = 0;
let quizScore = 0;
let currentQuizIndex = 0;
let completedLessons = [];
let totalXP = 0;
let currentUser = null;
let currentFilter = 'all';
let currentSort = 'newest';
let selectedUserId = null;
let lockCheckInterval = null;
let confirmCallback = null;
let lessonsMinimized = false;

// Activity state
let matchingState = { selected: null, score: 0, total: 0 };
let fillBlankState = { currentIndex: 0, score: 0, questions: [] };

// Load saved data
try {
  completedLessons = JSON.parse(localStorage.getItem('baradhu_completed')) || [];
  totalXP = parseInt(localStorage.getItem('baradhu_xp')) || 0;
  currentUser = getCurrentUser();
} catch (e) {}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  if (!MASTER_LESSONS || MASTER_LESSONS.length === 0) {
    alert('Error: Lessons not loaded!');
    return;
  }
  updateXPDisplay();
  setupAdminAccess();
  
  if (localStorage.getItem('baradhu_started')) {
    showScreen('home-screen');
    renderLessonsGrid();
    updateProgressUI();
    updateUserHeader();
  }
  
  if (window.location.search.includes('admin=1')) {
    setTimeout(openAdminPanel, 500);
  }
});

// ============================================
// SCREEN MANAGEMENT
// ============================================
function selectLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('baradhu_started', 'true');
  showScreen('home-screen');
  renderLessonsGrid();
  updateProgressUI();
  updateUserHeader();
}

function changeLanguage() {
  showConfirm('Ba\'uu barbaadda?', 'Herrega kee keessaa baha.', '⚠️', () => {
    localStorage.removeItem('baradhu_started');
    setCurrentUser(null);
    currentUser = null;
    showScreen('language-screen');
  });
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
  if (screenId === 'home-screen') {
    renderLessonsGrid();
    updateProgressUI();
    updateUserHeader();
  }
}

function updateUserHeader() {
  if (currentUser) {
    const initial = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('user-avatar-display').innerText = initial;
    document.getElementById('user-greeting').innerText = `Akkam, ${currentUser.name.split(' ')[0]}!`;
    document.getElementById('user-name-display').innerText = 'Barataa';
  }
}

// ============================================
// USER MENU
// ============================================
function showUserMenu() {
  if (!currentUser) return;
  document.getElementById('menu-user-avatar').innerText = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('menu-user-name').innerText = currentUser.name;
  document.getElementById('menu-user-phone').innerText = currentUser.phone;
  document.getElementById('menu-xp').innerText = `${totalXP} XP`;
  document.getElementById('menu-lessons').innerText = `${completedLessons.length} Barnoota`;
  document.getElementById('user-menu-modal').classList.remove('hidden');
}

function closeUserMenu() {
  document.getElementById('user-menu-modal').classList.add('hidden');
}

function showProfile() {
  closeUserMenu();
  showToast('👤 Piroofiila kee: ' + currentUser.name);
}

function showAchievements() {
  closeUserMenu();
  showToast('🏆 Milkii kee: ' + completedLessons.length + ' barnoota xumurteerta!');
}

// ============================================
// MINIMIZE LESSONS
// ============================================
function toggleLessonsView() {
  lessonsMinimized = !lessonsMinimized;
  const grid = document.getElementById('lessons-grid');
  const btn = document.getElementById('minimize-btn');
  
  if (lessonsMinimized) {
    grid.classList.add('minimized');
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-expand"></i><span>Balbali</span>';
  } else {
    grid.classList.remove('minimized');
    btn.classList.remove('active');
    btn.innerHTML = '<i class="fas fa-compress"></i><span>Xiqqeessi</span>';
  }
}

// ============================================
// USER REGISTRATION
// ============================================
function showRegisterModal() {
  closeLoginModal();
  closePremiumModal();
  document.getElementById('register-modal').classList.remove('hidden');
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-phone').value = '';
  document.getElementById('reg-terms').checked = false;
}

function closeRegisterModal() {
  document.getElementById('register-modal').classList.add('hidden');
}

function registerUser() {
  const name = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const terms = document.getElementById('reg-terms').checked;
  
  if (!name || name.length < 2) {
    showToast('⚠️ Maqaa sirrii galchi!');
    return;
  }
  if (!phone || !/^09\d{8}$/.test(phone)) {
    showToast('⚠️ Lakkoofsa bilbilaa sirrii galchi (09XXXXXXXX)!');
    return;
  }
  if (!terms) {
    showToast('⚠️ Haala tajaajilaa fudhuu qabda!');
    return;
  }
  
  const existing = findUserByPhone(phone);
  if (existing) {
    showToast('⚠️ Lakkoofsi kanaan dura galmaa\'eera. Seeni.');
    setTimeout(() => {
      document.getElementById('login-phone').value = phone;
      showLoginModal();
    }, 1000);
    return;
  }
  
  const users = loadUsers();
  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name, phone,
    registeredAt: new Date().toISOString(),
    code: null, codeGeneratedAt: null,
    isActivated: false, activatedAt: null,
    failedAttempts: 0, isLocked: false,
    lockedUntil: null, lastAttemptAt: null
  };
  
  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser.id);
  currentUser = newUser;
  
  closeRegisterModal();
  showToast('✅ Galmeen kee milkaa\'eera!');
  updateUserHeader();
  setTimeout(() => openPremiumModal(), 500);
}

// ============================================
// USER LOGIN
// ============================================
function showLoginModal() {
  closeRegisterModal();
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('login-phone').value = '';
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.add('hidden');
}

function loginUser() {
  const phone = document.getElementById('login-phone').value.trim();
  
  if (!phone || !/^09\d{8}$/.test(phone)) {
    showToast('⚠️ Lakkoofsa bilbilaa sirrii galchi!');
    return;
  }
  
  const user = findUserByPhone(phone);
  if (!user) {
    showToast('❌ Lakkoofsi kanaan hin galmoofne. Galmeessi.');
    return;
  }
  
  setCurrentUser(user.id);
  currentUser = user;
  closeLoginModal();
  showToast(`✅ Baga nagaan dhuftan, ${user.name}!`);
  updateUserHeader();
  showScreen('home-screen');
  renderLessonsGrid();
  updateProgressUI();
}

function logoutUser() {
  showConfirm('Ba\'uu barbaadda?', 'Herrega kee keessaa baha. Namni biraa hin fayyadamu.', '👋', () => {
    setCurrentUser(null);
    currentUser = null;
    closeUserMenu();
    closePremiumModal();
    showScreen('language-screen');
    showToast('👋 Nagaatti!');
  });
}

// ============================================
// PREMIUM MODAL
// ============================================
function openPremiumModal() {
  currentUser = getCurrentUser();
  if (!currentUser) {
    showRegisterModal();
    return;
  }
  currentUser = findUserById(currentUser.id);
  
  document.getElementById('premium-modal').classList.remove('hidden');
  document.getElementById('current-user-name').innerText = currentUser.name;
  document.getElementById('current-user-phone').innerText = currentUser.phone;
  document.getElementById('activation-error').classList.add('hidden');
  document.getElementById('activation-code-input').value = '';
  
  checkUserLockStatus();
  updatePremiumModalState();
  startLockCountdown();
}

function closePremiumModal() {
  document.getElementById('premium-modal').classList.add('hidden');
  stopLockCountdown();
}

function checkUserLockStatus() {
  if (currentUser.isLocked && currentUser.lockedUntil) {
    const lockUntil = new Date(currentUser.lockedUntil);
    if (new Date() < lockUntil) return true;
    else {
      updateUser(currentUser.id, { isLocked: false, lockedUntil: null, failedAttempts: 0 });
      currentUser = findUserById(currentUser.id);
      return false;
    }
  }
  return false;
}

function updatePremiumModalState() {
  const lockWarning = document.getElementById('lock-warning');
  const alreadyActivated = document.getElementById('already-activated');
  const waitingSection = document.getElementById('waiting-for-code');
  const activationForm = document.getElementById('activation-form-section');
  const statusText = document.getElementById('premium-status-text');
  
  lockWarning.classList.add('hidden');
  alreadyActivated.classList.add('hidden');
  waitingSection.classList.add('hidden');
  activationForm.classList.add('hidden');
  
  if (currentUser.isLocked) {
    lockWarning.classList.remove('hidden');
    statusText.innerText = 'Herregni kee cufameera';
    return;
  }
  
  if (currentUser.isActivated) {
    alreadyActivated.classList.remove('hidden');
    statusText.innerText = 'Premium siif banameera ✅';
    return;
  }
  
  if (!currentUser.code) {
    waitingSection.classList.remove('hidden');
    statusText.innerText = 'Koodii eegaa jirra...';
    switchPaymentTab('telebirr');
    return;
  }
  
  const codeEntry = findCodeByValue(currentUser.code);
  if (codeEntry && isCodeExpired(codeEntry)) {
    waitingSection.classList.remove('hidden');
    statusText.innerText = 'Kodiin kee yeroo darbeera. Admin haaraa gaafadhu.';
    return;
  }
  
  activationForm.classList.remove('hidden');
  statusText.innerText = 'Koodii banumsaa galchi';
  updateAttemptsDisplay();
}

function updateAttemptsDisplay() {
  const attemptsInfo = document.getElementById('attempts-info');
  const attemptsText = document.getElementById('attempts-text');
  const remaining = PREMIUM_CONFIG.maxFailedAttempts - (currentUser.failedAttempts || 0);
  
  attemptsText.innerHTML = `Yaalii hafe: <strong>${remaining}</strong>`;
  attemptsInfo.classList.toggle('danger', remaining <= 1);
}

function startLockCountdown() {
  stopLockCountdown();
  if (!currentUser.isLocked || !currentUser.lockedUntil) return;
  
  const updateCountdown = () => {
    const now = new Date();
    const lockUntil = new Date(currentUser.lockedUntil);
    const diff = lockUntil - now;
    
    if (diff <= 0) {
      updateUser(currentUser.id, { isLocked: false, lockedUntil: null, failedAttempts: 0 });
      currentUser = findUserById(currentUser.id);
      updatePremiumModalState();
      stopLockCountdown();
      showToast('🔓 Herregni kee banameera!');
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const el = document.getElementById('lock-countdown');
    if (el) el.innerText = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  };
  
  updateCountdown();
  lockCheckInterval = setInterval(updateCountdown, 1000);
}

function stopLockCountdown() {
  if (lockCheckInterval) { clearInterval(lockCheckInterval); lockCheckInterval = null; }
}

function switchPaymentTab(tab) {
  document.querySelectorAll('.payment-tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'telebirr' && i === 0) || (tab === 'awash' && i === 1));
  });
  
  const details = document.getElementById('payment-details');
  if (!details) return;
  const cfg = tab === 'telebirr' ? PREMIUM_CONFIG.telebirr : PREMIUM_CONFIG.awashBank;
  
  if (tab === 'telebirr') {
    details.innerHTML = `
      <div class="payment-row"><span class="label">Tajaajila:</span><span class="value">${cfg.icon} ${cfg.name}</span></div>
      <div class="payment-row"><span class="label">Maqaa:</span><span class="value">${cfg.accountName}</span></div>
      <div class="payment-row"><span class="label">Lakkoofsa:</span><span class="value">${cfg.number} <button class="copy-btn" onclick="copyText('${cfg.number}')"><i class="fas fa-copy"></i></button></span></div>
      <div class="payment-row"><span class="label">Hamilee:</span><span class="value" style="color:var(--primary-green);font-size:18px">${PREMIUM_CONFIG.premiumPrice}</span></div>
    `;
  } else {
    details.innerHTML = `
      <div class="payment-row"><span class="label">Baankii:</span><span class="value">${cfg.icon} ${cfg.name}</span></div>
      <div class="payment-row"><span class="label">Maqaa:</span><span class="value">${cfg.accountName}</span></div>
      <div class="payment-row"><span class="label">Herrega:</span><span class="value">${cfg.accountNumber} <button class="copy-btn" onclick="copyText('${cfg.accountNumber}')"><i class="fas fa-copy"></i></button></span></div>
      <div class="payment-row"><span class="label">Damee:</span><span class="value">${cfg.branch}</span></div>
      <div class="payment-row"><span class="label">Hamilee:</span><span class="value" style="color:var(--primary-green);font-size:18px">${PREMIUM_CONFIG.premiumPrice}</span></div>
    `;
  }
}

// ============================================
// ACTIVATION CODE VERIFICATION
// ============================================
function verifyActivationCode() {
  currentUser = findUserById(currentUser.id);
  
  if (checkUserLockStatus()) {
    updatePremiumModalState();
    return;
  }
  
  const input = document.getElementById('activation-code-input');
  const enteredCode = input.value.trim().toUpperCase();
  
  if (!enteredCode) {
    showActivationError('⚠️ Maaloo koodii galchi!');
    return;
  }
  
  const codeEntry = findCodeByValue(enteredCode);
  if (!codeEntry) {
    handleFailedAttempt('Kodiin kun hin jiru. Irra deebi\'i ilaali.');
    return;
  }
  
  if (codeEntry.assignedTo !== currentUser.id) {
    handleFailedAttempt('Kodiin kun fayyadamaa biraatiif kenname. Koodii dhuunfaa kee fayyadami.');
    return;
  }
  
  if (isCodeExpired(codeEntry)) {
    handleFailedAttempt(`Kodiin kun guyyaa ${PREMIUM_CONFIG.codeExpirationDays} booda yeroo darbe.`);
    return;
  }
  
  if (codeEntry.used) {
    handleFailedAttempt('Kodiin kun dura fayyadameera.');
    return;
  }
  
  // SUCCESS
  codeEntry.used = true;
  codeEntry.usedAt = new Date().toISOString();
  const codes = loadCodes();
  const idx = codes.findIndex(c => c.code === codeEntry.code);
  if (idx !== -1) codes[idx] = codeEntry;
  saveCodes(codes);
  
  updateUser(currentUser.id, {
    isActivated: true,
    activatedAt: new Date().toISOString(),
    failedAttempts: 0
  });
  currentUser = findUserById(currentUser.id);
  
  localStorage.setItem('baradhu_premium_' + currentUser.id, 'true');
  
  document.getElementById('activation-error').classList.add('hidden');
  updatePremiumModalState();
  showToast('🎉 Baga gammaddan! Premium siif banameera!');
  renderLessonsGrid();
}

function handleFailedAttempt(errorMessage) {
  const newAttempts = (currentUser.failedAttempts || 0) + 1;
  const updates = { failedAttempts: newAttempts, lastAttemptAt: new Date().toISOString() };
  
  if (newAttempts >= PREMIUM_CONFIG.maxFailedAttempts) {
    const lockUntil = new Date();
    lockUntil.setHours(lockUntil.getHours() + PREMIUM_CONFIG.lockDurationHours);
    updates.isLocked = true;
    updates.lockedUntil = lockUntil.toISOString();
    
    updateUser(currentUser.id, updates);
    currentUser = findUserById(currentUser.id);
    
    showActivationError(`🔒 Herregni kee sa'aatii ${PREMIUM_CONFIG.lockDurationHours}f cufameera!`);
    setTimeout(() => {
      updatePremiumModalState();
      startLockCountdown();
    }, 2000);
    return;
  }
  
  updateUser(currentUser.id, updates);
  currentUser = findUserById(currentUser.id);
  
  const remaining = PREMIUM_CONFIG.maxFailedAttempts - newAttempts;
  showActivationError(`${errorMessage} (Yaalii hafe: ${remaining})`);
  updateAttemptsDisplay();
}

function showActivationError(message) {
  const errorEl = document.getElementById('activation-error');
  document.getElementById('error-message').innerText = message;
  errorEl.classList.remove('hidden');
  errorEl.style.animation = 'none';
  setTimeout(() => errorEl.style.animation = 'shake 0.5s', 10);
}

// ============================================
// HOME SCREEN
// ============================================
function renderLessonsGrid() {
  const grid = document.getElementById('lessons-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const hasPremium = currentUser && localStorage.getItem('baradhu_premium_' + currentUser.id) === 'true';
  
  MASTER_LESSONS.forEach(lesson => {
    const isCompleted = completedLessons.includes(lesson.id);
    const isLocked = lesson.isPremium && !hasPremium;
    
    const card = document.createElement('div');
    let cardClass = 'lesson-card';
    if (isCompleted) cardClass += ' completed';
    if (lesson.isPremium && !isLocked) cardClass += ' unlocked';
    if (isLocked) cardClass += ' premium';
    card.className = cardClass;
    
    card.onclick = () => {
      if (isLocked) openPremiumModal();
      else startLesson(lesson.id);
    };
    
    let statusIcon = '';
    if (isCompleted) statusIcon = '<i class="fas fa-check-circle"></i>';
    else if (isLocked) statusIcon = '<i class="fas fa-lock"></i>';
    else if (lesson.isPremium) statusIcon = '<i class="fas fa-crown"></i>';
    
    let badges = '';
    if (lesson.isPremium && !isLocked) badges += '<div class="premium-tag"><i class="fas fa-crown"></i> UNLOCKED</div>';
    if (isLocked) badges += '<div class="lock-badge"><i class="fas fa-lock"></i> PREMIUM</div>';
    
    card.innerHTML = `
      ${badges}
      <div class="lesson-number">${lesson.id}</div>
      <div class="lesson-icon">${lesson.icon || '📚'}</div>
      <div class="lesson-title">${lesson.title}</div>
      <div class="lesson-words">${lesson.words.length} jecha</div>
      <div class="lesson-status">${statusIcon}</div>
    `;
    grid.appendChild(card);
  });
}

function updateProgressUI() {
  const total = MASTER_LESSONS.length;
  const completed = completedLessons.length;
  const percent = total > 0 ? (completed / total) * 100 : 0;
  
  const pt = document.getElementById('progress-text');
  const pp = document.getElementById('progress-percent');
  const pr = document.getElementById('progress-ring-fill');
  
  if (pt) pt.innerText = `${completed} / ${total} Barnoota`;
  if (pp) pp.innerText = `${Math.round(percent)}%`;
  if (pr) {
    const circumference = 2 * Math.PI * 36;
    pr.style.strokeDashoffset = circumference - (percent / 100) * circumference;
  }
}

function updateXPDisplay() {
  const el = document.getElementById('total-xp');
  if (el) el.innerText = totalXP;
}

// ============================================
// LEARN SCREEN
// ============================================
function startLesson(lessonId) {
  currentLesson = MASTER_LESSONS.find(l => l.id === lessonId);
  if (!currentLesson) return;
  currentCardIndex = 0;
  showScreen('learn-screen');
  renderCard();
  renderProgressDots();
}

function renderCard() {
  const word = currentLesson.words[currentCardIndex];
  const flashcard = document.getElementById('flashcard');
  flashcard.classList.remove('flipped');
  
  document.getElementById('front-lang-label').innerText = 'Afaan Ingilizii';
  document.getElementById('word-primary').innerText = word.english;
  document.getElementById('back-lang-label').innerText = 'Afaan Oromo';
  document.getElementById('word-secondary').innerText = word.oromo;
  
  // Show first example sentence
  document.getElementById('word-example-1').innerText = `"${word.example1 || word.example}"`;
  document.getElementById('word-example-om-1').innerText = `→ "${word.exampleOromo1 || word.exampleOromo}"`;
  document.getElementById('word-explanation').innerText = word.explanation;
  
  document.getElementById('lesson-counter').innerText = `${currentCardIndex + 1}/${currentLesson.words.length}`;
  
  const nextBtn = document.getElementById('next-btn');
  if (currentCardIndex === currentLesson.words.length - 1) {
    nextBtn.innerHTML = 'Taphataa Filadhu <i class="fas fa-gamepad"></i>';
  } else {
    nextBtn.innerHTML = 'Itti Aanu <i class="fas fa-chevron-right"></i>';
  }
  
  updateProgressDots();
}

function flipCard() {
  document.getElementById('flashcard').classList.toggle('flipped');
}

function previousCard() {
  if (currentCardIndex > 0) { currentCardIndex--; renderCard(); }
}

function nextCard() {
  if (currentCardIndex < currentLesson.words.length - 1) { 
    currentCardIndex++; 
    renderCard(); 
  } else {
    // Go to activity selection
    showScreen('activity-screen');
  }
}

function renderProgressDots() {
  const container = document.getElementById('lesson-progress-dots');
  if (!container) return;
  container.innerHTML = '';
  const maxDots = Math.min(currentLesson.words.length, 10);
  for (let i = 0; i < maxDots; i++) {
    const dot = document.createElement('div');
    dot.className = 'progress-dot' + (i === currentCardIndex ? ' active' : '');
    container.appendChild(dot);
  }
}

function updateProgressDots() {
  document.querySelectorAll('.progress-dot').forEach((dot, i) => {
    dot.className = 'progress-dot' + (i === currentCardIndex ? ' active' : '');
  });
}

// ============================================
// ACTIVITY SELECTION
// ============================================
function startActivity(type) {
  if (type === 'matching') startMatchingActivity();
  else if (type === 'fillblank') startFillBlankActivity();
  else if (type === 'listening') {
    showToast('🎧 Dhageeffachuu - dhufaan jira!');
    startQuiz();
  }
}

// ============================================
// MATCHING ACTIVITY
// ============================================
function startMatchingActivity() {
  matchingState = { selected: null, score: 0, total: 0 };
  showScreen('matching-screen');
  
  // Select 6 random words from current lesson
  const words = [...currentLesson.words].sort(() => Math.random() - 0.5).slice(0, 6);
  matchingState.total = words.length;
  
  const englishCol = document.getElementById('matching-english');
  const oromoCol = document.getElementById('matching-oromo');
  englishCol.innerHTML = '';
  oromoCol.innerHTML = '';
  
  const shuffledOromo = [...words].sort(() => Math.random() - 0.5);
  
  words.forEach(word => {
    const item = document.createElement('div');
    item.className = 'matching-item';
    item.innerText = word.english;
    item.dataset.match = word.oromo;
    item.dataset.type = 'english';
    item.onclick = () => selectMatchingItem(item);
    englishCol.appendChild(item);
  });
  
  shuffledOromo.forEach(word => {
    const item = document.createElement('div');
    item.className = 'matching-item';
    item.innerText = word.oromo;
    item.dataset.match = word.english;
    item.dataset.type = 'oromo';
    item.onclick = () => selectMatchingItem(item);
    oromoCol.appendChild(item);
  });
  
  document.getElementById('matching-score').innerText = '0';
}

function selectMatchingItem(item) {
  if (item.classList.contains('matched')) return;
  
  if (!matchingState.selected) {
    // First selection
    document.querySelectorAll('.matching-item.selected').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    matchingState.selected = item;
  } else {
    // Second selection
    if (matchingState.selected === item) {
      item.classList.remove('selected');
      matchingState.selected = null;
      return;
    }
    
    // Must be different types
    if (matchingState.selected.dataset.type === item.dataset.type) {
      matchingState.selected.classList.remove('selected');
      item.classList.add('selected');
      matchingState.selected = item;
      return;
    }
    
    // Check match
    const first = matchingState.selected;
    const second = item;
    
    const isMatch = (first.dataset.match === second.innerText) || 
                    (second.dataset.match === first.innerText);
    
    if (isMatch) {
      first.classList.remove('selected');
      first.classList.add('matched');
      second.classList.add('matched');
      matchingState.score++;
      document.getElementById('matching-score').innerText = matchingState.score;
      
      // Check if complete
      if (matchingState.score === matchingState.total) {
        setTimeout(() => {
          showToast('🎉 Baay\'ee gaarii! Hunda sirriitti walsimsiisiteerta!');
          finishActivity();
        }, 500);
      }
    } else {
      first.classList.add('wrong');
      second.classList.add('wrong');
      setTimeout(() => {
        first.classList.remove('wrong', 'selected');
        second.classList.remove('wrong');
      }, 600);
    }
    
    matchingState.selected = null;
  }
}

// ============================================
// FILL BLANK ACTIVITY
// ============================================
function startFillBlankActivity() {
  fillBlankState = { currentIndex: 0, score: 0, questions: [] };
  
  // Generate 5 fill-in-blank questions
  const words = [...currentLesson.words].sort(() => Math.random() - 0.5).slice(0, 5);
  
  words.forEach(word => {
    const sentence = word.example1 || word.example;
    const answer = word.english;
    
    // Find a word to blank out (the answer word)
    const wordsInSentence = sentence.split(' ');
    let blankIndex = wordsInSentence.findIndex(w => 
      w.toLowerCase().replace(/[.,!?]/g, '') === answer.toLowerCase()
    );
    
    if (blankIndex === -1) {
      // If answer not found, blank out a random word
      blankIndex = Math.floor(Math.random() * wordsInSentence.length);
    }
    
    const blankedSentence = [...wordsInSentence];
    blankedSentence[blankIndex] = '____';
    
    fillBlankState.questions.push({
      sentence: blankedSentence.join(' '),
      answer: answer,
      hint: word.exampleOromo1 || word.exampleOromo,
      original: sentence
    });
  });
  
  showScreen('fillblank-screen');
  renderFillBlank();
}

function renderFillBlank() {
  const q = fillBlankState.questions[fillBlankState.currentIndex];
  document.getElementById('fillblank-sentence').innerText = q.sentence;
  document.getElementById('fillblank-hint').innerText = `Hiika: ${q.hint}`;
  document.getElementById('fillblank-input').value = '';
  document.getElementById('fillblank-next').classList.add('hidden');
  document.getElementById('fillblank-score').innerText = fillBlankState.score;
}

function checkFillBlank() {
  const input = document.getElementById('fillblank-input').value.trim();
  const q = fillBlankState.questions[fillBlankState.currentIndex];
  
  if (!input) {
    showToast('⚠️ Maaloo jecha barreessi!');
    return;
  }
  
  if (input.toLowerCase() === q.answer.toLowerCase()) {
    fillBlankState.score++;
    document.getElementById('fillblank-score').innerText = fillBlankState.score;
    document.getElementById('fillblank-sentence').innerHTML = 
      q.sentence.replace('____', `<span style="color:var(--light-green);font-weight:900">${q.answer}</span>`);
    showToast('✅ Sirrii!');
  } else {
    document.getElementById('fillblank-sentence').innerHTML = 
      q.sentence.replace('____', `<span style="color:var(--error);text-decoration:line-through">${input}</span> <span style="color:var(--light-green);font-weight:900">${q.answer}</span>`);
    showToast('❌ Sirrii miti. Deebiin: ' + q.answer);
  }
  
  document.getElementById('fillblank-next').classList.remove('hidden');
  document.getElementById('fillblank-input').disabled = true;
}

function nextFillBlank() {
  if (fillBlankState.currentIndex < fillBlankState.questions.length - 1) {
    fillBlankState.currentIndex++;
    document.getElementById('fillblank-input').disabled = false;
    renderFillBlank();
  } else {
    finishActivity();
  }
}

function finishActivity() {
  // Mark lesson as completed if not already
  if (!completedLessons.includes(currentLesson.id)) {
    completedLessons.push(currentLesson.id);
    totalXP += 50;
    localStorage.setItem('baradhu_completed', JSON.stringify(completedLessons));
    localStorage.setItem('baradhu_xp', totalXP);
  }
  
  // Show results
  showResults();
}

// ============================================
// QUIZ
// ============================================
function startQuiz() {
  quizScore = 0;
  currentQuizIndex = 0;
  showScreen('quiz-screen');
  renderQuestion();
}

function renderQuestion() {
  const word = currentLesson.words[currentQuizIndex];
  document.getElementById('quiz-word').innerText = word.english;
  document.getElementById('quiz-current-score').innerText = quizScore;
  document.getElementById('quiz-progress').style.width = `${(currentQuizIndex / currentLesson.words.length) * 100}%`;
  
  const container = document.getElementById('quiz-options');
  container.innerHTML = '';
  document.getElementById('quiz-next-btn').classList.add('hidden');
  
  const options = generateOptions(word.oromo);
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.innerText = opt;
    btn.onclick = () => checkAnswer(btn, opt, word.oromo);
    container.appendChild(btn);
  });
}

function generateOptions(correctAnswer) {
  const allWords = MASTER_LESSONS.flatMap(l => l.words);
  let options = [correctAnswer];
  const available = [...new Set(allWords.map(w => w.oromo).filter(w => w && w !== correctAnswer))];
  
  while (options.length < 4 && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    if (!options.includes(available[idx])) options.push(available[idx]);
    available.splice(idx, 1);
  }
  while (options.length < 4) options.push('Hin beekamu');
  return options.sort(() => Math.random() - 0.5);
}

function checkAnswer(btn, selected, correct) {
  document.querySelectorAll('.quiz-option').forEach(opt => {
    opt.style.pointerEvents = 'none';
    if (opt.innerText === correct) opt.classList.add('correct');
  });
  if (selected === correct) quizScore++;
  else btn.classList.add('wrong');
  document.getElementById('quiz-next-btn').classList.remove('hidden');
}

function nextQuestion() {
  if (currentQuizIndex < currentLesson.words.length - 1) { 
    currentQuizIndex++; 
    renderQuestion(); 
  } else {
    finishActivity();
  }
}

function showResults() {
  const total = currentLesson.words.length;
  const passed = quizScore >= (total * 0.6) || matchingState.score > 0 || fillBlankState.score > 0;
  const percentage = Math.round((quizScore / Math.max(total, 1)) * 100);
  const xpGained = 50;
  
  const stars = 3;
  
  document.getElementById('result-emoji').innerText = '🏆';
  document.getElementById('result-title').innerText = 'Baga Gammaddan!';
  document.getElementById('score-percentage').innerText = `${percentage}%`;
  document.getElementById('score-detail').innerText = `${quizScore}/${total} sirrii`;
  document.getElementById('xp-gained').innerText = xpGained;
  
  const circle = document.getElementById('score-circle');
  circle.className = 'score-circle';
  if (percentage >= 90) circle.classList.add('perfect');
  else if (percentage >= 75) circle.classList.add('great');
  else if (percentage >= 60) circle.classList.add('good');
  else circle.classList.add('failed');
  
  document.querySelectorAll('.stars-rating i').forEach((star, i) => {
    star.className = i < stars ? 'fas fa-star active' : 'far fa-star';
  });
  
  document.getElementById('result-message').innerText = '🎉 Baay\'ee gaarii! Barnoota xumurteerta!';
  
  document.getElementById('retry-btn').classList.add('hidden');
  const nextBtn = document.getElementById('next-lesson-btn');
  const next = MASTER_LESSONS.find(l => l.id === currentLesson.id + 1);
  const hasPremium = currentUser && localStorage.getItem('baradhu_premium_' + currentUser.id) === 'true';
  if (next && (!next.isPremium || hasPremium)) {
    nextBtn.classList.remove('hidden');
    nextBtn.innerHTML = `Barnoota ${next.id}: ${next.title} <i class="fas fa-arrow-right"></i>`;
  } else nextBtn.classList.add('hidden');
  
  updateXPDisplay();
  showScreen('result-screen');
  createConfetti(true);
}

function createConfetti(show) {
  const container = document.getElementById('confetti');
  container.innerHTML = '';
  if (!show) return;
  for (let i = 0; i < 30; i++) {
    const conf = document.createElement('div');
    conf.style.cssText = `
      position: absolute; width: 10px; height: 10px;
      background: ${['#FFD700', '#FF6B35', '#4CAF50', '#2196F3', '#9C27B0'][Math.floor(Math.random()*5)]};
      left: ${Math.random() * 100}%; top: -10px; border-radius: 50%;
      animation: fall ${Math.random() * 2 + 2}s linear;
    `;
    container.appendChild(conf);
  }
  setTimeout(() => container.innerHTML = '', 5000);
}

function retryLesson() { startLesson(currentLesson.id); }

function goToNextLesson() {
  const next = MASTER_LESSONS.find(l => l.id === currentLesson.id + 1);
  if (next) startLesson(next.id);
  else showScreen('home-screen');
}

// ============================================
// ADMIN PANEL
// ============================================
let adminTapCount = 0;
let adminTapTimer = null;

function setupAdminAccess() {
  const title = document.getElementById('app-title');
  if (title) {
    title.addEventListener('click', () => {
      adminTapCount++;
      clearTimeout(adminTapTimer);
      adminTapTimer = setTimeout(() => adminTapCount = 0, 2000);
      if (adminTapCount >= 5) { adminTapCount = 0; openAdminPanel(); }
    });
  }
}

function openAdminPanel() {
  const password = prompt('🔐 Admin Password:');
  if (password !== 'jabaa2026') {
    if (password !== null) alert('❌ Password sirrii miti!');
    return;
  }
  document.getElementById('admin-panel').classList.remove('hidden');
  currentFilter = 'all';
  currentSort = 'newest';
  document.querySelectorAll('.filter-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.getElementById('admin-search-input').value = '';
  renderAdminDashboard();
}

function closeAdminPanel() {
  document.getElementById('admin-panel').classList.add('hidden');
}

function renderAdminDashboard() {
  const users = loadUsers();
  document.getElementById('stat-total-users').innerText = users.length;
  document.getElementById('stat-activated').innerText = users.filter(u => u.isActivated).length;
  document.getElementById('stat-waiting').innerText = users.filter(u => !u.isActivated && !u.isLocked).length;
  document.getElementById('stat-locked').innerText = users.filter(u => u.isLocked).length;
  renderUsersList();
}

function filterUsers(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderUsersList();
}

function sortUsers(sort) {
  currentSort = sort;
  renderUsersList();
}

function renderUsersList() {
  const list = document.getElementById('users-list');
  if (!list) return;
  
  let users = loadUsers();
  const searchTerm = (document.getElementById('admin-search-input')?.value || '').toLowerCase().trim();
  
  if (currentFilter === 'waiting') users = users.filter(u => !u.isActivated && !u.isLocked);
  else if (currentFilter === 'activated') users = users.filter(u => u.isActivated);
  else if (currentFilter === 'locked') users = users.filter(u => u.isLocked);
  
  if (searchTerm) {
    users = users.filter(u => 
      u.name.toLowerCase().includes(searchTerm) || u.phone.includes(searchTerm)
    );
  }
  
  if (currentSort === 'newest') users.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  else if (currentSort === 'oldest') users.sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt));
  else if (currentSort === 'name') users.sort((a, b) => a.name.localeCompare(b.name));
  
  if (users.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Fayyadamaan hin jiru</p></div>';
    return;
  }
  
  list.innerHTML = '';
  users.forEach(user => {
    const item = document.createElement('div');
    let statusClass = 'status-waiting';
    let statusBadge = '<span class="user-item-status status-badge-waiting">⏳ Eegaa</span>';
    
    if (user.isLocked) { statusClass = 'status-locked'; statusBadge = '<span class="user-item-status status-badge-locked">🔒 Cufame</span>'; }
    else if (user.isActivated) { statusClass = 'status-activated'; statusBadge = '<span class="user-item-status status-badge-activated">✅ Baname</span>'; }
    
    if (user.id === selectedUserId) item.classList.add('selected');
    item.className = `user-item ${statusClass}`;
    item.onclick = () => {
      selectedUserId = user.id;
      renderUsersList();
      showUserDetail(user.id);
    };
    
    const initial = user.name.charAt(0).toUpperCase();
    item.innerHTML = `
      <div class="user-item-avatar">${initial}</div>
      <div class="user-item-info">
        <h4>${user.name}</h4>
        <p>${user.phone} • ${new Date(user.registeredAt).toLocaleDateString('en-GB')}</p>
      </div>
      ${statusBadge}
    `;
    list.appendChild(item);
  });
}

function generateCodeForSelected() {
  if (!selectedUserId) {
    showToast('⚠️ Dursee fayyadamaa filadhu!');
    return;
  }
  generateCodeForUser(selectedUserId);
}

function generateCodeForUser(userId) {
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  if (user.isActivated) {
    showToast('⚠️ Fayyadamaan kanaan dura banameera!');
    return;
  }
  
  let newCode;
  const codes = loadCodes();
  do {
    newCode = `BARADHU-${randomString(4)}-${randomString(4)}`;
  } while (codes.find(c => c.code === newCode));
  
  codes.push({
    code: newCode,
    assignedTo: user.id,
    assignedToPhone: user.phone,
    assignedToName: user.name,
    used: false,
    createdAt: new Date().toISOString()
  });
  saveCodes(codes);
  
  updateUser(user.id, {
    code: newCode,
    codeGeneratedAt: new Date().toISOString(),
    failedAttempts: 0
  });
  
  showToast(`✅ Koodii: ${newCode}`);
  renderAdminDashboard();
  copyText(newCode);
  
  if (!document.getElementById('user-detail-modal').classList.contains('hidden')) {
    showUserDetail(user.id);
  }
}

function randomString(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function showUserDetail(userId) {
  selectedUserId = userId;
  const user = findUserById(userId);
  if (!user) return;
  
  const content = document.getElementById('user-detail-content');
  const initial = user.name.charAt(0).toUpperCase();
  
  let statusText = '⏳ Koodii Eegaa';
  let statusColor = 'var(--warning)';
  if (user.isLocked) { statusText = '🔒 Cufame'; statusColor = 'var(--error)'; }
  else if (user.isActivated) { statusText = '✅ Baname'; statusColor = 'var(--light-green)'; }
  
  content.innerHTML = `
    <div class="user-detail-header">
      <div class="user-detail-avatar">${initial}</div>
      <h3>${user.name}</h3>
      <p>${user.phone}</p>
      <p style="margin-top:8px;color:${statusColor};font-weight:800">${statusText}</p>
    </div>
    <div class="detail-row"><span class="label">Galmaa'e:</span><span class="value">${new Date(user.registeredAt).toLocaleString('en-GB')}</span></div>
    <div class="detail-row"><span class="label">Koodii:</span><span class="value" style="font-family:monospace">${user.code || '— Hin kennamef —'}</span></div>
    ${user.isActivated ? `<div class="detail-row"><span class="label">Baname:</span><span class="value">${new Date(user.activatedAt).toLocaleString('en-GB')}</span></div>` : ''}
    <div class="detail-row"><span class="label">Yaalii Dogoggoraa:</span><span class="value" style="color:${user.failedAttempts > 0 ? 'var(--error)' : 'inherit'}">${user.failedAttempts || 0} / ${PREMIUM_CONFIG.maxFailedAttempts}</span></div>
    <div class="admin-actions">
      ${!user.isActivated ? `<button class="admin-action-btn generate" onclick="generateCodeForUser('${user.id}')"><i class="fas fa-key"></i> ${user.code ? 'Koodii Haaraa' : 'Koodii Kennamef'}</button>` : ''}
      ${user.isLocked ? `<button class="admin-action-btn unlock" onclick="unlockUser('${user.id}')"><i class="fas fa-lock-open"></i> Bani</button>` : ''}
      ${!user.isLocked && !user.isActivated ? `<button class="admin-action-btn lock" onclick="lockUser('${user.id}')"><i class="fas fa-lock"></i> Cufi</button>` : ''}
      <button class="admin-action-btn delete" onclick="deleteUser('${user.id}')"><i class="fas fa-trash"></i> Haqi</button>
    </div>
  `;
  
  document.getElementById('user-detail-modal').classList.remove('hidden');
}

function closeUserDetail() {
  document.getElementById('user-detail-modal').classList.add('hidden');
}

function unlockUser(userId) {
  showConfirm('Fayyadamaa banaa?', 'Herregni fayyadamaa kana banama.', '🔓', () => {
    updateUser(userId, { isLocked: false, lockedUntil: null, failedAttempts: 0 });
    showToast('🔓 Fayyadamaan banameera!');
    renderAdminDashboard();
    showUserDetail(userId);
  });
}

function lockUser(userId) {
  showConfirm('Fayyadamaa cufaa?', 'Herregni fayyadamaa kana sa\'aatii 24f cufama.', '🔒', () => {
    const lockUntil = new Date();
    lockUntil.setHours(lockUntil.getHours() + PREMIUM_CONFIG.lockDurationHours);
    updateUser(userId, { isLocked: true, lockedUntil: lockUntil.toISOString() });
    showToast('🔒 Fayyadamaan cufameera!');
    renderAdminDashboard();
    showUserDetail(userId);
  }, true);
}

function deleteUser(userId) {
  showConfirm('Fayyadamaa haquu?', 'Kun deebi\'uu hin danda\'u!', '🗑️', () => {
    let users = loadUsers().filter(u => u.id !== userId);
    saveUsers(users);
    let codes = loadCodes().filter(c => c.assignedTo !== userId);
    saveCodes(codes);
    showToast('🗑️ Fayyadamaan haqameera!');
    closeUserDetail();
    selectedUserId = null;
    renderAdminDashboard();
  }, true);
}

function resetAllData() {
  showConfirm('Daataa hundaa haquu?', 'Fayyadamtoota hunda fi koodii hundaa haqa!', '⚠️', () => {
    localStorage.clear();
    location.reload();
  }, true);
}

function exportUsersData() {
  const users = loadUsers();
  const codes = loadCodes();
  const data = { exportedAt: new Date().toISOString(), totalUsers: users.length, totalCodes: codes.length, users, codes };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `baradhu-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Daataan export godhame!');
}

// ============================================
// CONFIRM MODAL
// ============================================
function showConfirm(title, message, icon, callback, isDanger = false) {
  document.getElementById('confirm-icon').innerText = icon;
  document.getElementById('confirm-title').innerText = title;
  document.getElementById('confirm-message').innerText = message;
  const okBtn = document.getElementById('confirm-ok-btn');
  okBtn.classList.toggle('danger', isDanger);
  okBtn.innerText = isDanger ? 'Eeyyee, Haqi' : 'Eeyyee';
  confirmCallback = callback;
  okBtn.onclick = () => {
    closeConfirmModal();
    if (confirmCallback) confirmCallback();
  };
  document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
  confirmCallback = null;
}

// ============================================
// UTILITIES
// ============================================
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ Copy godhame!');
  }).catch(() => {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('✅ Copy godhame!');
  });
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:12px 24px;border-radius:25px;font-size:14px;z-index:5000;box-shadow:0 4px 15px rgba(0,0,0,0.3);max-width:90%;text-align:center;';
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}