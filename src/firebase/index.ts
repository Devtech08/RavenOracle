'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Initializes Firebase with a focus on stability across both Client and Server environments.
 * The 'app/no-options' error is often caused by initializeApp() being called without a config
 * during server-side pre-rendering in Next.js.
 */
export function initializeFirebase() {
  // Check if an app is already initialized to avoid "Duplicate App" errors.
  const apps = getApps();
  if (apps.length > 0) {
    return getSdks(apps[0]);
  }

  // Explicitly initialize with the config object.
  // We use a try-catch as a safety measure for environments with complex lifecycle hooks.
  let firebaseApp: FirebaseApp;
  try {
    firebaseApp = initializeApp(firebaseConfig);
  } catch (e) {
    // If the default app exists but wasn't caught by getApps() (rare), return it.
    firebaseApp = getApp();
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
