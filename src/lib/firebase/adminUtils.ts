import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from './admin';

// Initialize Firebase Admin
initAdmin();

export async function setUserRole(uid: string, role: 'admin' | 'technician') {
  try {
    await getAuth().setCustomUserClaims(uid, { role });
    return { success: true };
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
}

export async function getUserRole(uid: string) {
  try {
    const user = await getAuth().getUser(uid);
    return user.customClaims?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    throw error;
  }
}

export async function verifyAdmin(uid: string) {
  try {
    const user = await getAuth().getUser(uid);
    return user.customClaims?.role === 'admin';
  } catch (error) {
    console.error('Error verifying admin:', error);
    return false;
  }
} 