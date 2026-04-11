/**
 * Firebase Users Management
 * 
 * Handles user creation, updates, and queries in Firestore
 * Collection: users
 * Document structure:
 * {
 *   uid: string (document ID)
 *   email: string
 *   name: string
 *   plan: string (free, starter, pro, enterprise)
 *   daily_limit: number
 *   daily_used: number
 *   remaining: number
 *   created_at: timestamp
 *   last_login: timestamp
 * }
 */

export async function initializeFirebaseUsers() {
  try {
    // Wait for firebase to be available
    let attempts = 0;
    while (typeof firebase === 'undefined' || !firebase.firestore) {
      if (attempts > 50) throw new Error('Firebase Firestore not loaded');
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    const db = firebase.firestore();
    
    // Test connection and create/verify collection
    const usersRef = db.collection('users');
    const testDoc = await usersRef.limit(1).get();
    
    console.log('✅ Firestore users collection ready');
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize Firestore users:', error);
    throw error;
  }
}

export async function createOrUpdateUser(uid, userData) {
  try {
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(uid);
    
    // Get existing user data to preserve fields
    const existingDoc = await userRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : {};
    
    // Merge with new data (don't overwrite everything)
    const updatedData = {
      ...existingData,
      uid: uid,
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
      plan: userData.plan || 'free',
      daily_limit: userData.daily_limit || 10,
      daily_used: userData.daily_used || 0,
      remaining: userData.remaining || 10,
      updated_at: firebase.firestore.FieldValue.serverTimestamp(),
      // Only set created_at if it's a new user
      ...(existingDoc.exists ? {} : {
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      })
    };
    
    await userRef.set(updatedData);
    console.log('✅ User created/updated:', uid);
    return updatedData;
  } catch (error) {
    console.error('❌ Failed to create/update user:', error);
    throw error;
  }
}

export async function updateUserLoginTime(uid) {
  try {
    const db = firebase.firestore();
    await db.collection('users').doc(uid).update({
      last_login: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('❌ Failed to update login time:', error);
  }
}

export async function getUserData(uid) {
  try {
    const db = firebase.firestore();
    const doc = await db.collection('users').doc(uid).get();
    
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to get user data:', error);
    return null;
  }
}

export async function incrementDailyUsage(uid) {
  try {
    const db = firebase.firestore();
    const userRef = db.collection('users').doc(uid);
    
    await userRef.update({
      daily_used: firebase.firestore.FieldValue.increment(1),
      remaining: firebase.firestore.FieldValue.increment(-1)
    });
  } catch (error) {
    console.error('❌ Failed to increment daily usage:', error);
  }
}

export async function resetDailyUsage() {
  try {
    const db = firebase.firestore();
    const snapshot = await db.collection('users').get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        daily_used: 0,
        remaining: doc.data().daily_limit || 10
      });
    });
    
    await batch.commit();
    console.log('✅ Daily usage reset for all users');
  } catch (error) {
    console.error('❌ Failed to reset daily usage:', error);
  }
}
