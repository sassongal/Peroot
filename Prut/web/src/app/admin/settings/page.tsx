"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { Save, Globe, Mail, MessageSquare, Palette } from "lucide-react";
import { toast } from "sonner";

interface SiteSettings {
  site_name: string;
  site_description: string;
  contact_email: string;
  support_url: string;
  max_free_prompts: number;
  default_credits: number;
  theme_primary_color: string;
  theme_secondary_color: string;
  maintenance_mode: boolean;
  allow_guest_access: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: "Peroot",
    site_description: "מחולל פרומפטים מקצועי מבוסס AI",
    contact_email: "gal@joya-tech.net",
    support_url: "https://peroot.ai/faq",
    max_free_prompts: 3,
    default_credits: 20,
    theme_primary_color: "#F59E0B",
    theme_secondary_color: "#EAB308",
    maintenance_mode: false,
    allow_guest_access: true,
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (data) {
        setSettings(data);
      } else {
        console.error('No settings found:', error);
        // If no settings exist, use current defaults
        // These should match the actual site configuration
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async function saveSettings() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert(settings);

      if (error) throw error;

      toast.success('הגדרות נשמרו בהצלחה');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('שגיאה בשמירת הגדרות');
    } finally {
      setLoading(false);
    }
  }

  function updateSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  return (
    <AdminLayout>
      <div className="space-y-8" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">הגדרות אתר</h1>
            <p className="text-slate-400">נהל את הגדרות האתר והפרמטרים הגלובליים</p>
          </div>
          <button
            onClick={saveSettings}
            disabled={!hasChanges || loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
              hasChanges 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-white/10 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-5 h-5" />
            {loading ? 'שומר...' : 'שמור שינויים'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold">כללי</h2>
            </div>

            <InputField
              label="שם האתר"
              value={settings.site_name}
              onChange={(v) => updateSetting('site_name', v)}
            />
            
            <TextareaField
              label="תיאור האתר"
              value={settings.site_description}
              onChange={(v) => updateSetting('site_description', v)}
            />
          </div>

          {/* Contact Settings */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold">יצירת קשר</h2>
            </div>

            <InputField
              label="אימייל ליצירת קשר"
              type="email"
              value={settings.contact_email}
              onChange={(v) => updateSetting('contact_email', v)}
            />
            
            <InputField
              label="קישור לתמיכה"
              value={settings.support_url}
              onChange={(v) => updateSetting('support_url', v)}
            />
          </div>

          {/* Credits & Limits */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/20">
                <MessageSquare className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold">קרדיטים ומגבלות</h2>
            </div>

            <InputField
              label="מספר פרומפטים חינמיים"
              type="number"
              value={settings.max_free_prompts.toString()}
              onChange={(v) => updateSetting('max_free_prompts', parseInt(v))}
              description="כמה פרומפטים אורח יכול ליצור לפני שצריך להתחבר"
            />
            
            <InputField
              label="קרדיטים ראשוניים"
              type="number"
              value={settings.default_credits.toString()}
              onChange={(v) => updateSetting('default_credits', parseInt(v))}
              description="כמה קרדיטים משתמש חדש מקבל"
            />
          </div>

          {/* Theme Settings */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Palette className="w-5 h-5 text-pink-400" />
              </div>
              <h2 className="text-xl font-semibold">עיצוב</h2>
            </div>

            <ColorPicker
              label="צבע ראשי"
              value={settings.theme_primary_color}
              onChange={(v) => updateSetting('theme_primary_color', v)}
            />
            
            <ColorPicker
              label="צבע משני"
              value={settings.theme_secondary_color}
              onChange={(v) => updateSetting('theme_secondary_color', v)}
            />
          </div>

          {/* System Settings */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">הגדרות מערכת</h2>

            <ToggleField
              label="מצב תחזוקה"
              description="כאשר פעיל, המערכת תציג הודעה וממשק מוגבל"
              value={settings.maintenance_mode}
              onChange={(v) => updateSetting('maintenance_mode', v)}
            />

            <ToggleField
              label="אפשר גישת אורחים"
              description="האם להציע למשתמשים להשתמש במערכת ללא התחברות"
              value={settings.allow_guest_access}
              onChange={(v) => updateSetting('allow_guest_access', v)}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function InputField({ 
  label, 
  value, 
  onChange, 
  type = "text",
  description 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  type?: string;
  description?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/20"
      />
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

function TextareaField({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/20 resize-none"
      />
    </div>
  );
}

function ColorPicker({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-lg cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/20"
        />
      </div>
    </div>
  );
}

function ToggleField({ 
  label, 
  description, 
  value, 
  onChange 
}: { 
  label: string; 
  description: string;
  value: boolean; 
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-slate-400">{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-14 h-7 rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-white/20'
        }`}
      >
        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
          value ? 'translate-x-8' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}
