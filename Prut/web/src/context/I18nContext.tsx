"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo } from 'react';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import { createClient } from '@/lib/supabase/client';

const I18nContext = createContext<Dictionary | null>(null);

/**
 * Deep merge DB overrides into the static dictionary
 */
function mergeTranslations(base: any, overrides: Record<string, string>) {
  const result = JSON.parse(JSON.stringify(base)); // Deep clone

  Object.entries(overrides).forEach(([key, value]) => {
    const parts = key.split('.');
    let current = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    
    const lastPart = parts[parts.length - 1];
    if (typeof current === 'object' && current !== null) {
        current[lastPart] = value;
    }
  });

  return result;
}

export function I18nProvider({ 
  dictionary: initialDictionary, 
  children,
  lang = 'he'
}: { 
  dictionary: Dictionary; 
  children: ReactNode;
  lang?: string;
}) {
  const [dictionary, setDictionary] = useState<Dictionary>(initialDictionary);
  const supabase = createClient();

  useEffect(() => {
    async function loadOverrides() {
        const { data, error } = await supabase
            .from('translations')
            .select('key, value')
            .eq('lang', lang);
        
        if (data && data.length > 0) {
            const overridesMap = data.reduce((acc: any, row: any) => {
                acc[row.key] = row.value;
                return acc;
            }, {});
            
            setDictionary(prev => mergeTranslations(prev, overridesMap));
        }
    }
    
    loadOverrides();
    
    // Subscribe to dynamic updates
    const subscription = supabase
        .channel('translation_updates')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'translations',
            filter: `lang=eq.${lang}`
        }, () => {
            loadOverrides();
        })
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
  }, [lang, supabase]);

  return (
    <I18nContext.Provider value={dictionary}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
