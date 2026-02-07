'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Initializes Firebase with a focus on stability across both Client and Server environments.
 */
export function initializeFirebase() {
  const apps = getApps();
  if (apps.length > 0) {
    return getSdks(apps[0]);
  }

  let firebaseApp: FirebaseApp;
  try {
    // Explicitly provide config to prevent app/no-options error during SSR/Hydration
    firebaseApp = initializeApp(firebaseConfig);
  } catch (e) {
    // Fallback to project config if initialization fails to ensure SDK has options
    firebaseApp = initializeApp(firebaseConfig, "RavenOracleFallback");
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