'use client'

import { useEffect } from 'react'

/**
 * ServiceWorkerCleaner
 * 
 * This component is responsible for unregistering any active service workers
 * and clearing stale caches that might be causing issues on localhost:3000.
 */
export function ServiceWorkerCleaner() {
    useEffect(() => {
        // Unregister all service workers
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    registration.unregister().then((success) => {
                        if (success) {
                            console.log('Successfully unregistered service worker:', registration)
                        }
                    })
                }
            })
        }

        // Optional: Clear caches if you want a deeper reset
        // WARNING: This will clear all site caches. 
        if ('caches' in window) {
            caches.keys().then((names) => {
                for (const name of names) {
                    caches.delete(name).then(() => {
                        console.log('Successfully deleted cache:', name)
                    })
                }
            })
        }
    }, [])

    return null
}
