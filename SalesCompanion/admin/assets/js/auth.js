// admin/assets/js/auth.js
class AuthManager {
  constructor() {
    this.tokenKey = 'sc_admin_token';
    this.checkingAuth = false;
  }

  getToken() {
    const token = localStorage.getItem(this.tokenKey);
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.removeItem(this.tokenKey);
      return null;
    }
    return token;
  }

  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  // Vérification synchrone - pas de flash
  checkAuthSync() {
    return this.isAuthenticated();
  }
}

const authManager = new AuthManager();