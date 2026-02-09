'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', {
            username: formData.get('username'),
            password: formData.get('password'),
            redirect: false,
        })

        // If we get here, login was successful
        // Return success indicator so the client can redirect
        return 'success'
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.'
                default:
                    return 'Something went wrong.'
            }
        }
        throw error
    }
}
export async function switchAccount(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', {
            username: formData.get('username'),
            password: formData.get('password'),
            redirect: false,
        })
        return 'success'
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.'
                default:
                    return 'Something went wrong.'
            }
        }
        throw error
    }
}



export async function googleAuthenticate(redirectTo?: string) {
    try {
        await signIn('google', { redirectTo: redirectTo || '/admin/dashboard' })
    } catch (error) {
        if (error instanceof AuthError) {
            return 'Google Sign In failed.'
        }
        throw error
    }
}

export async function logoutAction(redirectTo?: string) {
    await signOut({ redirectTo: redirectTo || '/login', redirect: true })
}
