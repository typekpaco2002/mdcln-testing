import admin from 'firebase-admin';

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

let firebaseAdminInitialized = false;

if (!projectId || !clientEmail || !privateKey) {
  console.warn('⚠️ Firebase Admin SDK not configured - missing credentials');
  console.warn('   Required: VITE_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
} else {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      firebaseAdminInitialized = true;
      console.log('✅ Firebase Admin SDK initialized');
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  }
}

export async function verifyFirebaseToken(idToken) {
  if (!firebaseAdminInitialized) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split('@')[0],
      picture: decodedToken.picture,
      emailVerified: decodedToken.email_verified,
    };
  } catch (error) {
    console.error('Firebase token verification failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export { firebaseAdminInitialized };
export default admin;
