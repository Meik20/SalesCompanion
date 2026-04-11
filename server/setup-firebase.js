#!/usr/bin/env node
/**
 * Firebase Service Account Setup
 * Generates serviceAccountKey.json from environment variables on Railway
 * Then sets GOOGLE_APPLICATION_CREDENTIALS to point to it
 */

const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

async function setupFirebaseCredentials() {
  try {
    // Check if credentials file already exists
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      console.log('✅ serviceAccountKey.json already exists');
      process.env.GOOGLE_APPLICATION_CREDENTIALS = SERVICE_ACCOUNT_PATH;
      return;
    }

    // Try to create from environment variables
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY_ID',
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_CLIENT_ID'
    ];

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      console.log('⚠️  Firebase environment variables not set:', missingVars.join(', '));
      console.log('⚠️  Firestore will be unavailable unless variables are configured.');
      return;
    }

    // Build service account object
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    // Write to file
    fs.writeFileSync(
      SERVICE_ACCOUNT_PATH,
      JSON.stringify(serviceAccount, null, 2)
    );

    // Set environment variable
    process.env.GOOGLE_APPLICATION_CREDENTIALS = SERVICE_ACCOUNT_PATH;

    console.log('✅ Firebase credentials file created successfully');
    console.log(`✅ GOOGLE_APPLICATION_CREDENTIALS set to: ${SERVICE_ACCOUNT_PATH}`);

  } catch (error) {
    console.error('❌ Error setting up Firebase credentials:', error.message);
    process.exit(1);
  }
}

setupFirebaseCredentials();
