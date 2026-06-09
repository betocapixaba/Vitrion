import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

/**
 * Initialize Firebase services
 */
const app = initializeApp(firebaseConfig);

// Notice: In AI Studio, we specifically pass the firestoreDatabaseId config if specified.
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

/**
 * Connection validator as requested by security constraints
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or internet connection; client appears offline.");
    }
  }
}
testConnection();

/**
 * Handle Firestore error payload requirements
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Comprehensive Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Log administrative actions into the firestore audit logs collection
 */
import { addDoc, collection } from 'firebase/firestore';

export async function logAdminAction(action: string, target: string, details: string) {
  try {
    let admin = {
      uid: 'unknown',
      email: 'unauthenticated',
      displayName: 'Desconhecido'
    };
    
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vitrion_active_admin');
      if (saved) {
        try {
          admin = JSON.parse(saved);
        } catch (e) {
          console.warn('Error reading active admin from localStorage:', e);
        }
      }
    }
    
    if (admin.uid === 'unknown' && auth.currentUser) {
      admin = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        displayName: auth.currentUser.displayName || auth.currentUser.email || 'Administrador'
      };
    }
    
    await addDoc(collection(db, 'admin_audit_logs'), {
      adminUid: admin.uid,
      adminName: admin.displayName,
      adminEmail: admin.email,
      action,
      target,
      details,
      timestamp: new Date() // JS Date is natively parsed by Firestore as Timestamp
    });
  } catch (error) {
    console.error('Failed to write audit log in Firestore:', error);
  }
}

