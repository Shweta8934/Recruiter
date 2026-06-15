import 'dotenv/config';

import { prisma } from '../lib/server/prisma';
import * as admin from 'firebase-admin';
import * as readline from 'readline';

// Ensure Firebase Admin is initialized
// You must have FIREBASE_PROJECT_ID set, and depending on your setup,
// you may need GOOGLE_APPLICATION_CREDENTIALS pointing to your service account JSON file.
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('--- Super Admin Creator ---');
  
  const name = await question('Enter admin name: ');
  const email = await question('Enter admin email: ');
  const password = await question('Enter admin password (min 6 chars): ');

  if (!email || !password || !name) {
    console.error('All fields are required.');
    process.exit(1);
  }

  try {
    console.log('\n1. Creating user in Firebase Auth...');
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
      console.log('User already exists in Firebase. Updating password...');
      await admin.auth().updateUser(firebaseUser.uid, { password });
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        firebaseUser = await admin.auth().createUser({
          email,
          password,
          displayName: name,
        });
      } else {
        throw e;
      }
    }
    console.log(`Firebase User ID: ${firebaseUser.uid}`);

    console.log('\n2. Setting up Super Admin Role in Database...');
    // Upsert the system Super Admin role
    const superAdminRole = await prisma.role.upsert({
      where: { slug_organizationId: { slug: 'super-admin', organizationId: '' } }, // Assuming global system roles have no organizationId
      update: {},
      create: {
        name: 'Super Admin',
        slug: 'super-admin',
        description: 'System-wide Super Administrator',
        isSystem: true,
        permissions: ['*'], // Full permissions
      }
    }).catch(async () => {
      // Fallback if the unique constraint is different (e.g., organizationId is null instead of empty string)
      const existing = await prisma.role.findFirst({ where: { slug: 'super-admin' } });
      if (existing) return existing;
      return prisma.role.create({
        data: {
          name: 'Super Admin',
          slug: 'super-admin',
          description: 'System-wide Super Administrator',
          isSystem: true,
          permissions: ['*'],
        }
      });
    });

    console.log('\n3. Creating User Profile in Database...');
    const dbUser = await prisma.user.upsert({
      where: { email },
      update: {
        firebaseUid: firebaseUser.uid,
        roleId: superAdminRole.id,
      },
      create: {
        email,
        name,
        firebaseUid: firebaseUser.uid,
        roleId: superAdminRole.id,
        status: 'active'
      }
    });

    console.log('\n✅ Success! Super Admin created successfully.');
    console.log(`You can now log in with ${email}`);

  } catch (error) {
    console.error('\n❌ Error creating Super Admin:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
