'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * Initializes Firebase with a focus on stability across both Client and Server environments.
 * Hardened to prevent the 'app/no-options' error by always utilizing the config object.
 */
export function initializeFirebase() {
  // Check if an app is already initialized to avoid "Duplicate App" errors.
  const apps = getApps();
  if (apps.length > 0) {
    return getSdks(apps[0]);
  }

  // Explicitly initialize with the config object to satisfy Hosting detection logic.
  let firebaseApp: FirebaseApp;
  try {
    firebaseApp = initializeApp(firebaseConfig);
  } catch (e) {
    // If initialization fails but an app exists, attempt recovery.
    try {
      firebaseApp = getApp();
    } catch {
      // Final fallback if everything fails.
      firebaseApp = initializeApp(firebaseConfig);
    }
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
