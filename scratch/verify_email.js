const admin = require('firebase-admin');
const serviceAccount = require('../recruit-ff240-firebase-adminsdk-fbsvc-e4156714e7.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function verifyEmail(email) {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, {
      emailVerified: true
    });
    console.log(`Successfully verified email for user: ${userRecord.uid} (${email})`);
    process.exit(0);
  } catch (error) {
    console.error('Error verifying user:', error);
    process.exit(1);
  }
}

verifyEmail('shivesh.joshi82@gmail.com');
