/**
 * Firebase Initialization Helper
 * This file provides a universal way to initialize Firebase
 * Works with both HTTP pages and Electron
 */

window.firebaseConfig = {
  apiKey: "AIzaSyCVJxyeysHWDQ7yECTb-GApJz7u8s5l7N0",
  authDomain: "sales-companion-9cf56.firebaseapp.com",
  projectId: "sales-companion-9cf56",
  storageBucket: "sales-companion-9cf56.firebasestorage.app",
  messagingSenderId: "1058275289756",
  appId: "1:1058275289756:web:534cd79d5eb373348f5b59"
};

window.waitForFirebase = async function(timeout = 15000) {
  const startTime = Date.now();
  while (typeof firebase === 'undefined') {
    if (Date.now() - startTime > timeout) {
      throw new Error('Firebase CDN timeout - check network connection');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return firebase;
};

window.initFirebase = async function() {
  try {
    console.log('[Firebase] Waiting for CDN...');
    await window.waitForFirebase(15000);
    
    if (!firebase.apps.length) {
      console.log('[Firebase] Initializing...');
      firebase.initializeApp(window.firebaseConfig);
    }
    
    console.log('✅ Firebase ready');
    return firebase;
  } catch (error) {
    console.error('❌ Firebase init failed:', error);
    throw error;
  }
};
