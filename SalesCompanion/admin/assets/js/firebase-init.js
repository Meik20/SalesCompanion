/**
 * Firebase Integration for Sales Companion Admin Panel
 * Replaces local authentication with Firebase
 */

// Import Firebase from CDN
// Add this to admin/index.html head:
// <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js"></script>

// Firebase configuration - loaded from separate file
let firebaseConfig = null;
let auth = null;
let adminToken = null;

/**
 * Initialize Firebase Auth
 */
async function initFirebase() {
  try {
    // Dynamically load firebase config
    const script = document.createElement('script');
    script.src = './firebase-config.js';
    script.type = 'module';
    script.onload = async () => {
      // Config should be available now
      if (typeof firebaseConfig === 'undefined') {
        console.error('❌ firebase-config.js not loaded. Follow setup instructions.');
        return;
      }

      // Initialize Firebase
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();

      // Enable persistence
      firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

      // Check if already logged in
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          adminToken = user.uid;
          showApp();
        } else {
          showAuthScreen();
        }
      });
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error('[Firebase] Init error:', error);
  }
}

/**
 * Show auth screen
 */
function showAuthScreen() {
  document.getElementById('auth-page').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

/**
 * Show app after auth
 */
function showApp() {
  document.getElementById('auth-page').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadDashboard();
}

/**
 * Firebase login with email instead of username
 */
async function doLogin() {
  const btn = document.getElementById('l-btn');
  const errEl = document.getElementById('login-err');
  
  const email = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;

  if (!email || !password) {
    errEl.textContent = '❌ Saisissez email et mot de passe';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Connexion...';
  errEl.style.display = 'none';

  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    adminToken = userCredential.user.uid;
    showApp();
  } catch (error) {
    let message = '❌ Erreur de connexion';
    
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        message = '❌ Email ou mot de passe incorrect';
        break;
      case 'auth/too-many-requests':
        message = '❌ Trop de tentatives. Réessayez plus tard';
        break;
      case 'auth/invalid-email':
        message = '❌ Email invalide';
        break;
    }
    
    errEl.textContent = message;
    errEl.style.display = 'block';
    console.error('[Firebase] Login error:', error);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Accéder au panel →';
  }
}

/**
 * Logout
 */
function logout() {
  firebase.auth().signOut().then(() => {
    adminToken = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-page').style.display = 'flex';
  }).catch((error) => {
    console.error('[Firebase] Logout error:', error);
  });
}

/**
 * Get current user email
 */
function getCurrentUserEmail() {
  const user = firebase.auth().currentUser;
  return user ? user.email : 'admin';
}

/**
 * Get auth token for API calls
 */
async function getAuthToken() {
  const user = firebase.auth().currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
}

/**
 * Initialize on page load
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFirebase);
} else {
  initFirebase();
}
