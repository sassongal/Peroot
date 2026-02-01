
"use client";

import { useState, useEffect } from "react";
import { 
    Tags, 
    Plus, 
    Save, 
    X, 
    Edit2, 
    Hash,
    Type,
    ArrowUpDown,
    LucideIcon,
    Box,
    Megaphone,
    BadgeDollarSign,
    Share2,
    Code2,
    GraduationCap,
    Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiPath } from "@/lib/api-path";
import { toast } from "sonner";

interface Category {
    id: string;
    name_en: string;
    name_he: string;
    icon: string;
    sort_order: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
    Megaphone, BadgeDollarSign, Share2, Code2, GraduationCap, Palette, Box
};

export function CategoryManager() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Category>>({});
    const [loading, setLoading] = useState(true);

    const fetchCategories = async () => {
        try {
            const res = await fetch(getApiPath("/api/admin/library/categories"));
            const data = await res.json();
            setCategories(data);
        } catch (e) {
            console.error("Failed to fetch categories", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const startEdit = (cat: Category) => {
        setEditingId(cat.id);
        setEditData(cat);
    };

    const handleSave = async () => {
        if (!editData.id || !editData.name_he) return;

        try {
            const res = await fetch(getApiPath("/api/admin/library/categories"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editData)
            });

            if (res.ok) {
                toast.success("Category updated");
                setEditingId(null);
                fetchCategories();
            }
        } catch {
            toast.error("Failed to save category");
        }
    };

    if (loading) return <div className="p-20 text-center text-zinc-500 animate-pulse">Initializing Taxonomy...</div>;

    return (
        <div className="space-y-8" dir="rtl">
            
            {/* Header / Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Tags className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight uppercase">Taxonomy Control</h3>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none mt-1">Category & Metadata Architect</p>
                    </div>
                </div>
                <button 
                    onClick={() => { setEditingId('new'); setEditData({ id: '', name_en: '', name_he: '', icon: 'Box', sort_order: 0 }); }}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-all hover:bg-white/10"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                    const isEditing = editingId === cat.id;
                    const Icon = ICON_MAP[cat.icon] || Box;

                    return (
                        <div key={cat.id} className={cn(
                            "group p-6 rounded-[32px] border transition-all duration-500",
                            isEditing ? "bg-zinc-900 border-amber-500/30" : "bg-zinc-950 border-white/5 hover:border-white/10"
                        )}>
                            <div className="flex items-start justify-between mb-6">
                                <div className={cn("p-4 rounded-2xl bg-white/5 border border-white/5", isEditing && "bg-amber-500/10 text-amber-500")}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                {!isEditing && (
                                     <button 
                                        onClick={() => startEdit(cat)}
                                        className="p-3 rounded-lg bg-white/5 text-zinc-700 hover:text-zinc-300 transition-colors"
                                     >
                                         <Edit2 className="w-4 h-4" />
                                     </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-4">
                                     <div className="relative group">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700 group-focus-within:text-amber-500 transition-colors" />
                                        <input 
                                            value={editData.id}
                                            onChange={(e) => setEditData({...editData, id: e.target.value})}
                                            placeholder="Slug (id)..."
                                            className="w-full pl-9 pr-4 py-3 bg-black border border-white/5 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500/30"
                                        />
                                     </div>
                                     <div className="relative group">
                                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700 group-focus-within:text-amber-500 transition-colors" />
                                        <input 
                                            value={editData.name_he}
                                            onChange={(e) => setEditData({...editData, name_he: e.target.value})}
                                            placeholder="שם בעברית..."
                                            className="w-full pl-9 pr-4 py-3 bg-black border border-white/5 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500/30"
                                        />
                                     </div>
                                     <div className="flex gap-2 pt-2">
                                        <button 
                                            onClick={handleSave}
                                            className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-900/20"
                                        >
                                            <Save className="w-4 h-4 mx-auto" />
                                        </button>
                                        <button 
                                            onClick={() => setEditingId(null)}
                                            className="p-3 rounded-xl bg-zinc-800 text-zinc-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                     </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="text-lg font-black text-white tracking-tight">{cat.name_he}</div>
                                    <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{cat.name_en}</div>
                                    <div className="pt-4 flex items-center gap-2 text-[9px] font-black text-zinc-800 uppercase tracking-tighter">
                                        <ArrowUpDown className="w-3 h-3" />
                                        ORD: {cat.sort_order} • ID: {cat.id}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {editingId === 'new' && (
                    <div className="group p-6 rounded-[32px] border bg-zinc-900 border-emerald-500/30 animate-in zoom-in-95 duration-500">
                         <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-6">New Prototype</div>
                         <div className="space-y-4">
                            <input 
                                value={editData.id}
                                onChange={(e) => setEditData({...editData, id: e.target.value})}
                                placeholder="Unique ID..."
                                className="w-full px-4 py-3 bg-black border border-white/5 rounded-xl text-xs font-bold"
                            />
                            <input 
                                value={editData.name_he}
                                onChange={(e) => setEditData({...editData, name_he: e.target.value})}
                                placeholder="שם בעברית..."
                                className="w-full px-4 py-3 bg-black border border-white/5 rounded-xl text-xs font-bold"
                            />
                             <div className="flex gap-2 pt-2">
                                <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest"><Save className="w-4 h-4 mx-auto" /></button>
                                <button onClick={() => setEditingId(null)} className="p-3 rounded-xl bg-zinc-800 text-zinc-500"><X className="w-4 h-4" /></button>
                             </div>
                         </div>
                    </div>
                )}
            </div>

        </div>
    );
}
