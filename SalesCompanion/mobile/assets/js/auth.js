/**
 * Auth Manager pour Sales Companion Mobile
 * Gère le stockage des tokens et la persistance de session
 */

class AuthManager {
  constructor() {
    this.tokenKey = 'sc_user_token'; // Différent du token admin
    this.userKey = 'sc_user_data';
    this.serverUrlKey = 'sc_server_url';
  }

  /**
   * Récupère le token stocké
   */
  getToken() {
    try {
      const token = localStorage.getItem(this.tokenKey);
      if (!token || token === 'null' || token === 'undefined') {
        localStorage.removeItem(this.tokenKey);
        return null;
      }
      return token;
    } catch (e) {
      console.error('[Auth] Get token error:', e);
      return null;
    }
  }

  /**
   * Sauvegarde le token
   */
  setToken(token) {
    try {
      if (token) {
        localStorage.setItem(this.tokenKey, token);
      } else {
        localStorage.removeItem(this.tokenKey);
      }
    } catch (e) {
      console.error('[Auth] Set token error:', e);
    }
  }

  /**
   * Supprime le token
   */
  clearToken() {
    try {
      localStorage.removeItem(this.tokenKey);
    } catch (e) {
      console.error('[Auth] Clear token error:', e);
    }
  }

  /**
   * Vérifie si l'utilisateur est authentifié (cache synchrone)
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Récupère les données utilisateur stockées
   */
  getUser() {
    try {
      const data = localStorage.getItem(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('[Auth] Get user error:', e);
      return null;
    }
  }

  /**
   * Sauvegarde les données utilisateur
   */
  setUser(userData) {
    try {
      if (userData) {
        localStorage.setItem(this.userKey, JSON.stringify(userData));
      } else {
        localStorage.removeItem(this.userKey);
      }
    } catch (e) {
      console.error('[Auth] Set user error:', e);
    }
  }

  /**
   * Récupère l'URL du serveur
   */
  getServerUrl() {
    try {
      return localStorage.getItem(this.serverUrlKey) || 'http://localhost:3000';
    } catch (e) {
      return 'http://localhost:3000';
    }
  }

  /**
   * Sauvegarde l'URL du serveur
   */
  setServerUrl(url) {
    try {
      if (url) {
        localStorage.setItem(this.serverUrlKey, url);
      }
    } catch (e) {
      console.error('[Auth] Set server URL error:', e);
    }
  }

  /**
   * Effectue la déconnexion complète
   */
  logout() {
    this.clearToken();
    this.setUser(null);
    try {
      sessionStorage.clear();
      localStorage.removeItem('lastResults');
      localStorage.removeItem('lastFilters');
      localStorage.removeItem('lastQuery');
      localStorage.removeItem('customCities');
    } catch (e) {
      console.error('[Auth] Clear storage error:', e);
    }
  }

  /**
   * Obtient les headers d'authentification pour les requêtes API
   */
  getHeaders(additionalHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...additionalHeaders
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Effectue une requête API authentifiée
   */
  async fetchAPI(endpoint, options = {}) {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const serverUrl = this.getServerUrl();
    const url = `${serverUrl}${endpoint}`;
    const fetchOptions = {
      ...options,
      headers: this.getHeaders(options.headers)
    };

    try {
      const response = await fetch(url, fetchOptions);

      // Gération de l'expiration de session
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired');
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
      console.error(`[Auth] API error on ${endpoint}:`, error);
      throw error;
    }
  }
}

// Instance globale du gestionnaire d'authentification
const authManager = new AuthManager();

/**
 * Initialisation au chargement (vérification synchrone - PAS DE FLASH)
 */
function initAuthScreen() {
  if (authManager.isAuthenticated()) {
    // Token existe → afficher l'app directement
    hideAuthScreen();
    initApp();
  } else {
    // Pas de token → afficher la page de connexion
    showAuthScreen();
  }
}

/**
 * Affiche l'écran de connexion
 */
function showAuthScreen() {
  const authScreen = document.getElementById('auth-screen');
  const topbar = document.getElementById('topbar');
  const content = document.getElementById('content');
  
  if (authScreen) authScreen.style.display = 'flex';
  if (topbar) topbar.style.display = 'none';
  if (content) content.style.display = 'none';
}

/**
 * Masque l'écran de connexion et affiche l'app
 */
function hideAuthScreen() {
  const authScreen = document.getElementById('auth-screen');
  const topbar = document.getElementById('topbar');
  const content = document.getElementById('content');
  
  if (authScreen) authScreen.style.display = 'none';
  if (topbar) topbar.style.display = 'flex';
  if (content) content.style.display = 'flex';
}

/**
 * Initialise l'app après authentification
 */
function initApp() {
  const user = authManager.getUser();
  if (user) {
    const tbName = document.getElementById('tb-name');
    const tbPlan = document.getElementById('tb-plan');
    
    if (tbName) tbName.textContent = user.name || '—';
    if (tbPlan) {
      tbPlan.textContent = user.plan || 'free';
      const planClass = {
        free: 'pf',
        starter: 'ps_',
        pro: 'pp',
        enterprise: 'pe'
      }[user.plan] || 'pf';
      tbPlan.className = `plan-b ${planClass}`;
    }
  }
}

/**
 * Lance la redirection après déconnexion
 */
function doLogout() {
  authManager.logout();
  showAuthScreen();
  // Réinitialiser l'UI
  document.getElementById('tb-name').textContent = '—';
  document.getElementById('tb-plan').textContent = 'free';
  document.getElementById('tb-plan').className = 'plan-b pf';
}

// Initialisation au chargement de la page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthScreen);
} else {
  initAuthScreen();
}
