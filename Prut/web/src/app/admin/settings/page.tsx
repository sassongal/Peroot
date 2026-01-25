"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  Save, 
  Globe, 
  Mail, 
  Palette, 
  Shield, 
  RefreshCw, 
  Zap,
  Lock,
  Unlock,
  Check,
  Layout,
  Layers,
  Sparkles,
  LucideIcon,
  X
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SiteSettings {
  id: string;
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
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('שגיאה בטעינת הגדרות');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update(settings)
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('הגדרות האתר עודכנו בהצלחה');
      setHasChanges(false);

      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('activity_logs').insert({
        action: 'עדכון הגדרות מערכת',
        entity_type: 'settings',
        user_id: user?.id,
        details: settings
      });

    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('שגיאה בשמירת הגדרות');
    } finally {
      setSaving(false);
    }
  }

  function updateSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    if (!settings) return;
    setSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
    setHasChanges(true);
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-500/20" />
          <span className="text-slate-600 font-bold uppercase tracking-widest text-xs">Loading Settings...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!settings) return null;

  return (
    <AdminLayout>
      <div className="space-y-10 animate-in fade-in duration-700 pb-20" dir="rtl">
        {/* Header with Command Look */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tighter">
              System Configuration
            </h1>
            <p className="text-slate-400 font-medium tracking-wide">ניהול פרמטרים גלובליים, עיצוב ומודל עסקי</p>
          </div>
          
          <button
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            className={cn(
              "px-8 py-4 rounded-2xl transition-all font-black flex items-center gap-3 shadow-2xl active:scale-95 border backdrop-blur-md",
              hasChanges 
                ? 'bg-blue-600 border-blue-400 hover:bg-blue-700 text-white' 
                : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed opacity-50'
            )}
          >
            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{saving ? 'מבצע עדכון...' : 'שמור הגדרות'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* General Branding Section */}
          <SectionContainer icon={Globe} title="מיתוג וזהות" color="blue">
            <InputField
              label="שם המותג (Site Name)"
              value={settings.site_name}
              onChange={(v: string) => updateSetting('site_name', v)}
              icon={Layout}
            />
            
            <TextareaField
              label="תיאור האפליקציה (SEO Description)"
              value={settings.site_description}
              onChange={(v: string) => updateSetting('site_description', v)}
            />
          </SectionContainer>

          {/* Contact & Support Section */}
          <SectionContainer icon={Mail} title="תמיכה ויצירת קשר" color="purple">
            <InputField
              label="אימייל אדמיניסטרטיבי"
              type="email"
              value={settings.contact_email}
              onChange={(v: string) => updateSetting('contact_email', v)}
              icon={Mail}
            />
            
            <InputField
              label="קישור למרכז התמיכה"
              value={settings.support_url}
              onChange={(v: string) => updateSetting('support_url', v)}
              icon={Shield}
            />
          </SectionContainer>

          {/* Economy & Limits Section */}
          <SectionContainer icon={Zap} title="כלכלה ומגבלות" color="amber">
            <InputField
              label="בונוס קרדיטים למשתמש חדש"
              type="number"
              value={settings.default_credits.toString()}
              onChange={(v: string) => updateSetting('default_credits', parseInt(v))}
              description="כמות הקרדיטים שתינתן אוטומטית בעת רישום"
              icon={Sparkles}
            />
            
            <InputField
              label="פרומפטים חינמיים לאורחים"
              type="number"
              value={settings.max_free_prompts.toString()}
              onChange={(v: string) => updateSetting('max_free_prompts', parseInt(v))}
              description="כמות שימושים המותרת ללא התחברות (Guest access)"
              icon={Layers}
            />
          </SectionContainer>

          {/* Aesthetics Section */}
          <SectionContainer icon={Palette} title="שפה ויזואלית" color="rose">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker
                  label="צבע ראשי (Primary)"
                  value={settings.theme_primary_color}
                  onChange={(v: string) => updateSetting('theme_primary_color', v)}
                />
                
                <ColorPicker
                  label="צבע משני (Secondary)"
                  value={settings.theme_secondary_color}
                  onChange={(v: string) => updateSetting('theme_secondary_color', v)}
                />
             </div>
          </SectionContainer>

          {/* Security & Access Section */}
          <div className="lg:col-span-2">
            <SectionContainer icon={Shield} title="בקרת גישה ומערכת" color="emerald">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ToggleField
                  label="מצב תחזוקה (Maintenance Mode)"
                  description="כאשר פעיל, משתמשים לא מורשים יראו דף המתנה והגישה ל-API תיחסם"
                  value={settings.maintenance_mode}
                  onChange={(v: boolean) => updateSetting('maintenance_mode', v)}
                  icon={settings.maintenance_mode ? Lock : Unlock}
                />

                <ToggleField
                  label="אפשר גישת אורחים (Guest Mode)"
                  description="האם האתר פתוח לשימוש מוגבל ללא צורך ביצירת חשבון"
                  value={settings.allow_guest_access}
                  onChange={(v: boolean) => updateSetting('allow_guest_access', v)}
                  icon={settings.allow_guest_access ? Check : X}
                />
              </div>
            </SectionContainer>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SectionContainer({ icon: Icon, title, children, color }: { icon: LucideIcon; title: string; children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/5 border-blue-500/10 shadow-blue-500/5",
    purple: "text-purple-400 bg-purple-500/5 border-purple-500/10 shadow-purple-500/5",
    amber: "text-amber-400 bg-amber-500/5 border-amber-500/10 shadow-amber-500/5",
    rose: "text-rose-400 bg-rose-500/5 border-rose-500/10 shadow-rose-500/5",
    emerald: "text-emerald-400 bg-emerald-500/5 border-emerald-500/10 shadow-emerald-500/5",
  };

  return (
    <div className="rounded-[32px] border border-white/10 bg-zinc-900/30 backdrop-blur-xl overflow-hidden shadow-2xl group transition-all duration-500 hover:border-white/20">
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div className={cn("p-3 rounded-2xl border flex items-center justify-center", colors[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
        </div>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function InputField({ 
  label, 
  value, 
  onChange, 
  type = "text",
  description,
  icon: Icon
}: { label: string; value: string; onChange: (v: string) => void; type?: string; description?: string; icon?: LucideIcon }) {
  return (
    <div className="space-y-2 group/field">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within/field:text-blue-400 transition-colors">{label}</label>
      </div>
      <div className="relative">
        {Icon && <Icon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 transition-colors group-focus-within/field:text-white" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full bg-black/40 border border-white/5 rounded-2xl py-4 flex items-center font-bold text-slate-200 focus:outline-none focus:border-white/20 focus:bg-black/60 transition-all",
            Icon ? "pr-13 pl-6" : "px-6"
          )}
        />
      </div>
      {description && <p className="text-[10px] text-slate-600 font-medium px-2">{description}</p>}
    </div>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2 group/field">
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within/field:text-blue-400 transition-colors">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-slate-200 font-bold focus:outline-none focus:border-white/20 focus:bg-black/60 transition-all resize-none"
      />
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3 p-5 rounded-2xl bg-black/20 border border-white/5">
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
      <div className="flex items-center gap-4">
        <div 
          className="w-14 h-14 rounded-2xl border-2 border-white/10 shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer scale-150"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent border-none focus:ring-0 text-white font-mono font-bold"
        />
      </div>
    </div>
  );
}

function ToggleField({ label, description, value, onChange, icon: Icon }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void; icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-[24px] group/toggle hover:bg-black/60 transition-all">
      <div className="flex items-center gap-4">
        <div className={cn(
            "p-3 rounded-xl transition-all",
            value ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-600"
        )}>
           <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-slate-100">{label}</div>
          <div className="text-[10px] text-slate-600 font-medium mt-1 leading-relaxed max-w-xs">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative w-14 h-8 rounded-full transition-all duration-300 shadow-inner",
          value ? 'bg-emerald-600' : 'bg-white/10'
        )}
      >
        <div className={cn(
          "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 shadow-md",
          value ? 'translate-x-7' : 'translate-x-1'
        )} />
      </button>
    </div>
  );
}
