import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

// 관리자 이메일 설정
const ADMIN_EMAIL = 'kumdo6335@gmail.com';

// State Variables
let isDemoMode = true;
let currentUser = null;
let playsList = [];
let activeCategory = 'all';

// Firebase Services (Initialised conditionally)
let app, auth, db;
let collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, onSnapshot;
let signInWithPopup, GoogleAuthProvider, signOut;

// Default initial data for Demo mode
const DEFAULT_PLAYS = [];

// Initialize application
async function initApp() {
  const configured = isFirebaseConfigured();
  
  if (configured) {
    try {
      // Import Firebase modules dynamically
      const { initializeApp } = await import('firebase/app');
      const { 
        getAuth, 
        signInWithPopup: authSignIn, 
        GoogleAuthProvider: authProvider, 
        signOut: authSignOut, 
        onAuthStateChanged 
      } = await import('firebase/auth');
      const { 
        getFirestore, 
        collection: fsCollection, 
        addDoc: fsAddDoc, 
        getDocs: fsGetDocs, 
        updateDoc: fsUpdateDoc, 
        deleteDoc: fsDeleteDoc, 
        doc: fsDoc,
        query: fsQuery,
        onSnapshot: fsOnSnapshot
      } = await import('firebase/firestore');

      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);

      // Store firestore operations to outer scope
      collection = fsCollection;
      addDoc = fsAddDoc;
      getDocs = fsGetDocs;
      updateDoc = fsUpdateDoc;
      deleteDoc = fsDeleteDoc;
      doc = fsDoc;
      query = fsQuery;
      onSnapshot = fsOnSnapshot;
      signInWithPopup = authSignIn;
      GoogleAuthProvider = authProvider;
      signOut = authSignOut;

      isDemoMode = false;
      document.getElementById('demo-banner').classList.add('hidden');
      console.log('Firebase가 성공적으로 로드되었습니다.');

      // Setup Firebase auth state listener
      onAuthStateChanged(auth, (user) => {
        if (user) {
          currentUser = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || '선생님',
            photoURL: user.photoURL || 'https://api.dicebear.com/7.x/adventurer/svg?seed=teacher'
          };
          updateAuthUI(true);
          showToast(`어서오세요! (로그인 계정: ${currentUser.email}) 👋`);
        } else {
          currentUser = null;
          updateAuthUI(false);
          showToast('로그아웃되었습니다.');
        }
        loadPlays();
      });

    } catch (error) {
      console.error('Firebase 초기화 실패, 데모 모드로 전환합니다:', error);
      setupDemoMode();
    }
  } else {
    setupDemoMode();
  }

  // Bind Event Listeners
  setupEventListeners();
  // Trigger initial icons parsing
  lucide.createIcons();
}

// Setup Demo Mode (Local Storage Fallback)
function setupDemoMode() {
  isDemoMode = true;
  document.getElementById('demo-banner').classList.remove('hidden');
  console.log('데모 모드로 실행 중입니다. 모든 데이터는 LocalStorage에 저장됩니다.');
  
  // Check if mock user was previously logged in
  const savedUser = localStorage.getItem('demo_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateAuthUI(true);
  } else {
    updateAuthUI(false);
  }
  
  loadPlays();
}

// Event Listeners
function setupEventListeners() {
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancel = document.getElementById('btn-cancel');
  const playForm = document.getElementById('play-form');

  // Login handler
  btnLogin.addEventListener('click', handleLogin);
  // Logout handler
  btnLogout.addEventListener('click', handleLogout);
  
  // Close modal
  btnCloseModal.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);
  
  // Form submission
  playForm.addEventListener('submit', handleFormSubmit);

  // Ethics guide gateway
  const btnEthicsAgree = document.getElementById('btn-ethics-agree');
  btnEthicsAgree.addEventListener('click', () => {
    localStorage.setItem('ethics_agreed', 'true');
    document.getElementById('ethics-gate').classList.add('hidden');
  });
  if (localStorage.getItem('ethics_agreed') === 'true') {
    document.getElementById('ethics-gate').classList.add('hidden');
  }

  // Terms & Privacy modals
  const termsModal = document.getElementById('terms-modal');
  const privacyModal = document.getElementById('privacy-modal');

  document.getElementById('link-terms-login').addEventListener('click', (e) => {
    e.preventDefault();
    termsModal.classList.remove('hidden');
  });
  document.getElementById('link-terms-footer').addEventListener('click', (e) => {
    e.preventDefault();
    termsModal.classList.remove('hidden');
  });
  document.getElementById('link-privacy-login').addEventListener('click', (e) => {
    e.preventDefault();
    privacyModal.classList.remove('hidden');
  });
  document.getElementById('link-privacy-footer').addEventListener('click', (e) => {
    e.preventDefault();
    privacyModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-terms').addEventListener('click', () => {
    termsModal.classList.add('hidden');
  });
  document.getElementById('btn-close-privacy').addEventListener('click', () => {
    privacyModal.classList.add('hidden');
  });
}

// Auth Actions
async function handleLogin() {
  if (isDemoMode) {
    // Show a simple mock login
    currentUser = {
      uid: 'demo-user-123',
      email: ADMIN_EMAIL,
      name: '행복한 선생님 🍎',
      photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=happyTeacher'
    };
    localStorage.setItem('demo_user', JSON.stringify(currentUser));
    updateAuthUI(true);
    showToast('데모 모드로 로그인 되었습니다! (선생님 권한 획득)');
    loadPlays();
  } else {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('로그인 에러:', error);
      showToast('로그인에 실패했습니다. 다시 시도해 주세요.');
    }
  }
}

async function handleLogout() {
  if (isDemoMode) {
    localStorage.removeItem('demo_user');
    currentUser = null;
    updateAuthUI(false);
    showToast('로그아웃되었습니다.');
    loadPlays();
  } else {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('로그아웃 에러:', error);
      showToast('로그아웃에 실패했습니다.');
    }
  }
}

// Update the auth UI (login/logout button + user info) based on login state
function updateAuthUI(isLoggedIn) {
  const userInfo = document.getElementById('user-info');
  const loginContainer = document.getElementById('login-consent-container');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');

  if (isLoggedIn && currentUser) {
    userInfo.classList.remove('hidden');
    loginContainer.classList.add('hidden');
    userAvatar.src = currentUser.photoURL;
    userName.textContent = currentUser.name;
  } else {
    userInfo.classList.add('hidden');
    loginContainer.classList.remove('hidden');
  }
}

// Load plays list (from LocalStorage in demo mode, or Firestore in cloud mode)
async function loadPlays() {
  if (isDemoMode) {
    const saved = localStorage.getItem('classroom_plays');
    playsList = saved ? JSON.parse(saved) : [...DEFAULT_PLAYS];
    if (!saved) {
      localStorage.setItem('classroom_plays', JSON.stringify(playsList));
    }
    renderCards();
  } else {
    try {
      const q = query(collection(db, 'plays'));
      onSnapshot(q, (snapshot) => {
        playsList = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        renderCards();
      });
    } catch (error) {
      console.error('Firestore 읽기 에러:', error);
      showToast('놀이 목록을 불러오지 못했습니다.');
    }
  }
}

// Render Cards to the Cork Board
function renderCards() {
  const cardsGrid = document.getElementById('cards-grid');
  cardsGrid.innerHTML = '';

  const filteredPlays = playsList;

  // Render each play card
  filteredPlays.forEach((play, index) => {
    // Generate a slight random rotation for school board aesthetic
    const rotation = (index % 3 === 0) ? '-1.5deg' : (index % 3 === 1) ? '1deg' : '-0.5deg';
    
    const card = document.createElement('div');
    card.className = `play-card ${play.color || 'pastel-yellow'}`;
    card.style.setProperty('--rotation', rotation);

    const categoryNames = {
      quiz: '✏️ 퀴즈/학습',
      activity: '🏃 체육/활동',
      cooperation: '🤝 협동놀이',
      brain: '🧠 두뇌/보드'
    };

    // Check if the user is authorized to edit/delete
    const canManage = currentUser && currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    card.innerHTML = `
      <div class="card-header">
        <span class="card-badge">${categoryNames[play.category] || play.category}</span>
        <div class="card-icon-wrapper">
          <i data-lucide="${play.icon || 'gamepad-2'}"></i>
        </div>
      </div>
      <h3>${escapeHtml(play.name)}</h3>
      <p>${escapeHtml(play.desc)}</p>
      <div class="card-footer">
        <a href="${play.url}" target="_blank" rel="noopener noreferrer" class="btn-card-go">
          이동하기 <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
        </a>
        ${canManage ? `
          <div class="card-actions">
            <button class="btn-icon btn-edit" title="수정" data-id="${play.id}">
              <i data-lucide="edit" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="btn-icon btn-delete" title="삭제" data-id="${play.id}">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;

    cardsGrid.appendChild(card);
  });

  // If user is logged in as admin, show the "Add New Link" card at the end
  if (currentUser && currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    const addCard = document.createElement('div');
    addCard.className = 'play-card add-card-trigger';
    addCard.innerHTML = `
      <div class="add-card-content">
        <i data-lucide="plus-circle" style="width: 48px; height: 48px;"></i>
        <span>새로운 놀이 링크 추가</span>
      </div>
    `;
    addCard.addEventListener('click', () => openModal());
    cardsGrid.appendChild(addCard);
  }

  // Parse Icons
  lucide.createIcons();

  // Attach action button event listeners
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const item = playsList.find(p => p.id === id);
      if (item) openModal(item);
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      handleDelete(id);
    });
  });
}

// Modal handling
function openModal(item = null) {
  const modal = document.getElementById('play-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('play-form');

  modal.classList.remove('hidden');

  if (item) {
    modalTitle.textContent = '✏️ 놀이 카드 수정하기';
    document.getElementById('play-id').value = item.id;
    document.getElementById('play-name').value = item.name;
    document.getElementById('play-category').value = item.category;
    document.getElementById('play-url').value = item.url;
    document.getElementById('play-desc').value = item.desc;
    document.getElementById('play-icon').value = item.icon || 'gamepad-2';
    
    const colorRadio = form.querySelector(`input[name="play-color"][value="${item.color}"]`);
    if (colorRadio) colorRadio.checked = true;
  } else {
    modalTitle.textContent = '📝 새로운 놀이 카드 등록';
    form.reset();
    document.getElementById('play-id').value = '';
    form.querySelector('input[name="play-color"][value="pastel-yellow"]').checked = true;
  }
  lucide.createIcons();
}

function closeModal() {
  document.getElementById('play-modal').classList.add('hidden');
}

// Form Submit Handler (Create or Update)
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!currentUser || !currentUser.email || currentUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    showToast('관리자만 작성 및 수정할 수 있습니다.');
    return;
  }

  const id = document.getElementById('play-id').value;
  const name = document.getElementById('play-name').value;
  const category = document.getElementById('play-category').value;
  const url = document.getElementById('play-url').value;
  const desc = document.getElementById('play-desc').value;
  const color = document.querySelector('input[name="play-color"]:checked').value;
  const icon = document.getElementById('play-icon').value;

  const playData = {
    name,
    category,
    url,
    desc,
    color,
    icon,
    updatedBy: currentUser.uid,
    updatedAt: new Date().toISOString()
  };

  if (isDemoMode) {
    if (id) {
      // Update
      const index = playsList.findIndex(p => p.id === id);
      if (index !== -1) {
        playsList[index] = { ...playsList[index], ...playData };
        showToast('놀이 카드가 수정되었습니다!');
      }
    } else {
      // Create
      const newPlay = {
        id: 'local-' + Date.now(),
        ...playData,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString()
      };
      playsList.push(newPlay);
      showToast('새로운 놀이 카드가 추가되었습니다! 🎈');
    }
    localStorage.setItem('classroom_plays', JSON.stringify(playsList));
    closeModal();
    renderCards();
  } else {
    // Firebase Cloud Store CRUD
    try {
      if (id) {
        // Update
        const playDocRef = doc(db, 'plays', id);
        await updateDoc(playDocRef, playData);
        showToast('카드가 성공적으로 업데이트되었습니다.');
      } else {
        // Create
        await addDoc(collection(db, 'plays'), {
          ...playData,
          createdBy: currentUser.uid,
          createdAt: new Date().toISOString()
        });
        showToast('새로운 카드가 등록되었습니다!');
      }
      closeModal();
    } catch (error) {
      console.error('Firestore 쓰기 에러:', error);
      showToast('저장에 실패했습니다. 설정을 확인해 주세요.');
    }
  }
}

// Delete Handler
async function handleDelete(id) {
  if (!confirm('정말로 이 놀이 카드를 삭제하시겠습니까? 😢')) {
    return;
  }

  if (isDemoMode) {
    playsList = playsList.filter(p => p.id !== id);
    localStorage.setItem('classroom_plays', JSON.stringify(playsList));
    showToast('놀이 카드가 삭제되었습니다.');
    renderCards();
  } else {
    try {
      const playDocRef = doc(db, 'plays', id);
      await deleteDoc(playDocRef);
      showToast('성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('Firestore 삭제 에러:', error);
      showToast('삭제에 실패했습니다.');
    }
  }
}

// Helpers
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  
  // Clear previous timeouts if fast clicking
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  
  window.toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function escapeHtml(string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(string).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Start the app when loaded
window.addEventListener('DOMContentLoaded', initApp);
