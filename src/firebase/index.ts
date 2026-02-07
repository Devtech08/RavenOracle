'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Initializes Firebase with a focus on stability across both Client and Server environments.
 * Prevents "app/no-options" errors by defaulting to the provided config.
 */
export function initializeFirebase() {
  const apps = getApps();
  if (apps.length > 0) {
    return getSdks(apps[0]);
  }

  let firebaseApp: FirebaseApp;
  try {
    // Attempt to use the provided config directly for maximum reliability
    firebaseApp = initializeApp(firebaseConfig);
  } catch (e) {
    // Fallback if already initialized (concurrency safety)
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
