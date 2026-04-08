'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { es } from '@/i18n/es'
import { en } from '@/i18n/en'

type Language = 'es' | 'en'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
    es,
    en
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('es')

    const t = (key: string, params?: Record<string, string | number>): string => {
        const esTranslations = translations['es'] as Record<string, any>
        const enTranslations = translations['en'] as Record<string, any>
        const currentTranslations = language === 'es' ? esTranslations : enTranslations
        const translationValue = currentTranslations[key]
        let text = typeof translationValue === 'string' ? translationValue : key

        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                const regex = new RegExp(`\\{\\{${paramKey}\\}\\}|\\{${paramKey}\\}`, 'g')
                text = text.replace(regex, String(paramValue))
            })
        }
        return text
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider')
    }
    return context
}
