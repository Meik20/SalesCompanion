/**
 * Firebase Authentication Module
 * Support multi-plateforme: Admin, Mobile, Client (Electron)
 * 
 * Usage:
 * 1. Importer : import { FirebaseAuth } from './firebase-auth.js'
 * 2. Init : await FirebaseAuth.init()
 * 3. Login : await FirebaseAuth.login(email, password)
 * 4. Get token : const token = await FirebaseAuth.getToken()
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

// IMPORTANT: Créer firebase-config.js avec ta config réelle
// Pour l'instant, on charge depuis le template
let firebaseConfig = null;

try {
  // Essayer de charger la config réelle
  const { firebaseConfig: config } = await import('./firebase-config.js').catch(() => ({ firebaseConfig: null }));
  firebaseConfig = config;
} catch (e) {
  console.warn('[Firebase] Config not found - using minimal setup');
}

let app = null;
let auth = null;
let currentUser = null;
let isInitialized = false;

const FirebaseAuth = (() => {
  /**
   * Initialiser Firebase
   */
  const init = async () => {
    if (isInitialized) return true;

    try {
      if (!firebaseConfig || firebaseConfig.apiKey === 'YOUR_API_KEY_HERE') {
        console.error('[Firebase] ❌ Configuration not set up');
        console.error('Follow instructions in firebase-config.example.js');
        return false;
      }

      app = initializeApp(firebaseConfig);
      auth = getAuth(app);

      // Enable persistence (keep user logged in after page reload)
      await setPersistence(auth, browserLocalPersistence);

      // Listen to auth state changes
      onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateAuthUI(user);
      });

      isInitialized = true;
      console.log('[Firebase] ✅ Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Firebase] Init Error:', error);
      return false;
    }
  };

  /**
   * Get current user
   */
  const getCurrentUser = () => currentUser;

  /**
   * Get auth state
   */
  const isAuthenticated = () => !!currentUser;

  /**
   * Get ID token (for API requests)
   */
  const getToken = async () => {
    if (!currentUser) return null;
    try {
      return await currentUser.getIdToken();
    } catch (error) {
      console.error('[Firebase] Get token error:', error);
      return null;
    }
  };

  /**
   * Login with email/password
   */
  const login = async (email, password) => {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName
        },
        token
      };
    } catch (error) {
      console.error('[Firebase] Login error:', error);
      return {
        success: false,
        error: getFirebaseErrorMessage(error.code)
      };
    }
  };

  /**
   * Register with email/password
   */
  const register = async (email, password, displayName = '') => {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      // Update profile if displayName provided
      if (displayName) {
        await userCredential.user.updateProfile({ displayName });
      }

      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName
        },
        token
      };
    } catch (error) {
      console.error('[Firebase] Register error:', error);
      return {
        success: false,
        error: getFirebaseErrorMessage(error.code)
      };
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      currentUser = null;
      updateAuthUI(null);
      return { success: true };
    } catch (error) {
      console.error('[Firebase] Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Get headers for API requests
   */
  const getHeaders = async (additionalHeaders = {}) => {
    const token = await getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...additionalHeaders
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  };

  /**
   * Make authenticated API call
   */
  const fetchAPI = async (url, options = {}) => {
    const headers = await getHeaders(options.headers);
    const fetchOptions = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, fetchOptions);

      if (response.status === 401) {
        await logout();
        throw new Error('Session expired - please login again');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error (${response.status})`);
      }

      return {
        status: response.status,
        data: await response.json().catch(() => ({}))
      };
    } catch (error) {
      console.error('[Firebase] API call error:', error);
      throw error;
    }
  };

  return {
    init,
    isAuthenticated,
    getCurrentUser,
    getToken,
    login,
    register,
    logout,
    getHeaders,
    fetchAPI
  };
})();

/**
 * Helper: Convert Firebase error codes to user-friendly messages
 */
function getFirebaseErrorMessage(code) {
  const messages = {
    'auth/user-not-found': 'Email ou mot de passe incorrect',
    'auth/wrong-password': 'Email ou mot de passe incorrect',
    'auth/email-already-in-use': 'Cet email est déjà utilisé',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
    'auth/invalid-email': 'Email invalide',
    'auth/operation-not-allowed': 'Opération non autorisée',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard'
  };
  return messages[code] || 'Erreur d\'authentification: ' + code;
}

/**
 * Update UI based on auth state (implement in each interface)
 */
function updateAuthUI(user) {
  // This will be overridden by each interface (admin, mobile, client)
  console.log('[Firebase] Auth state changed:', user ? user.email : 'logged out');
}

/**
 * Allow interfaces to override updateAuthUI
 */
FirebaseAuth.setUIUpdater = (callback) => {
  window.updateAuthUI = callback;
};

export default FirebaseAuth;
