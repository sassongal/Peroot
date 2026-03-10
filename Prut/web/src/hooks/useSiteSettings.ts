/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from "@/lib/logger";

export interface SiteSettings {
  id: string;
  site_name: string;
  site_description: string;
  contact_email: string;
  support_url: string;
  max_free_prompts: number;
  default_credits: number;
  daily_free_limit: number;
  registration_bonus: number;
  theme_primary_color: string;
  theme_secondary_color: string;
  maintenance_mode: boolean;
  allow_guest_access: boolean;
  updated_at: string;
}

// REAL site defaults from actual usage
const defaultSettings: SiteSettings = {
  id: '',
  site_name: 'Peroot',
  site_description: 'מחולל פרומפטים מקצועי מבוסס AI',
  contact_email: 'gal@joya-tech.net',
  support_url: 'https://peroot.space/faq',
  max_free_prompts: 1, // Guest gets 1 free trial
  default_credits: 2, // Registration bonus credits
  daily_free_limit: 2, // Free users get 2/day
  registration_bonus: 2, // Bonus credits on registration
  theme_primary_color: '#F59E0B', // Amber/Orange from site
  theme_secondary_color: '#EAB308', // Yellow from site
  maintenance_mode: false,
  allow_guest_access: true,
  updated_at: new Date().toISOString()
};

let settingsCache: SiteSettings | null = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(settingsCache || defaultSettings);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    loadSettings();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('site_settings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        (payload: any) => {
          logger.info('[Settings] Real-time update received:', payload);
          if (payload.new) {
            const newSettings = payload.new as SiteSettings;
            setSettings(newSettings);
            settingsCache = newSettings;
            applyThemeColors(newSettings);
            
            // Show toast notification
            if (typeof window !== 'undefined' && (window as any).toast) {
              (window as any).toast.success('הגדרות האתר עודכנו מהשרת');
            }
          }
        }
      )
      .subscribe((status) => {
        logger.info('[Settings] Subscription status:', status);
      });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (data) {
        logger.info('[Settings] Loaded from DB:', data);
        setSettings(data);
        settingsCache = data;
        applyThemeColors(data);
      } else if (error) {
        logger.error('[Settings] Failed to load:', error);
        applyThemeColors(defaultSettings);
      }
    } catch (error) {
      logger.error('[Settings] Error:', error);
      applyThemeColors(defaultSettings);
    } finally {
      setLoading(false);
    }
  }

  function applyThemeColors(settings: SiteSettings) {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Apply primary color
      root.style.setProperty('--color-primary', settings.theme_primary_color);
      root.style.setProperty('--color-secondary', settings.theme_secondary_color);
      
      // Also update the glow color for yellow theme
      root.style.setProperty('--glow-color', `45 95% 65%`); // HSL for yellow glow
      
      logger.info('[Settings] Applied theme colors:', {
        primary: settings.theme_primary_color,
        secondary: settings.theme_secondary_color
      });
    }
  }

  return { settings, loading, refresh: loadSettings };
}
