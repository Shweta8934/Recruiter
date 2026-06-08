import * as admin from 'firebase-admin';

import fs from 'fs';
import path from 'path';

// Force cleanup in development to avoid HMR issues with invalid configs
if (process.env.NODE_ENV === 'development' && admin.apps.length > 0) {
  try {
    admin.apps.forEach(app => {
      if (app) admin.app(app.name).delete();
    });
  } catch (e) { }
}

if (!admin.apps.length) {
  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
    } else {
      // Local development fallback
      const serviceAccountPath = path.join(process.cwd(), 'recruit-ff240-firebase-adminsdk-fbsvc-e4156714e7.json');

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        credential = admin.credential.cert(serviceAccount);
      } else {
        throw new Error(`Service account file not found at ${serviceAccountPath}`);
      }
    }

    admin.initializeApp({
      credential: credential,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('FIREBASE ADMIN INIT ERROR:', error);
    // Throw so the API route fails immediately with a clear error
    throw error;
  }
}

export { admin };
