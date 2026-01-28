
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, ActivityLog } from '../types';
import { Save, Lock, X, Check, Palette, Type, List, Upload, Image as ImageIcon, Trash2, Plus, AlertOctagon, AlertTriangle, Ban } from 'lucide-react';

interface SettingsViewProps {
    settings: AppSettings;
    onSave: (newSettings: AppSettings) => void;
    existingActivities: ActivityLog[];
    onFactoryReset: () => void;
}

type ModalMode = 'SAVE' | 'RESET' | null;

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave, existingActivities, onFactoryReset }) => {
    const [formData, setFormData] = useState<AppSettings>(settings);
    const [showPinModal, setShowPinModal] = useState<ModalMode>(null);
    const [pinInput, setPinInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const categoryInputRef = useRef<HTMLInputElement>(null);

    const [newCategoryLabel, setNewCategoryLabel] = useState('');
    const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

    // State for Custom Delete Modals
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, label: string } | null>(null);
    const [conflictData, setConflictData] = useState<{ count: number, label: string } | null>(null);

    // Clear highlight after 2 seconds
    useEffect(() => {
        if (recentlyAddedId) {
            const timer = setTimeout(() => setRecentlyAddedId(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [recentlyAddedId]);

    // --- Handlers ---

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                // Resize logo to decent size (e.g., max height 100px)
                const canvas = document.createElement('canvas');
                const MAX_HEIGHT = 100;
                const scaleSize = MAX_HEIGHT / img.height;
                const width = img.width * scaleSize;
                const height = MAX_HEIGHT;

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0, width, height);

                setFormData(prev => ({ ...prev, logoUrl: canvas.toDataURL('image/png') }));
            };
            img.src = readerEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleCategoryEdit = (id: string, newLabel: string) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.map(c => c.id === id ? { ...c, label: newLabel } : c)
        }));
    };

    const handleAddCategory = () => {
        const trimmedLabel = newCategoryLabel.trim();
        if (!trimmedLabel) return;

        // Check for duplicates
        if (formData.categories.some(c => c.label.toLowerCase() === trimmedLabel.toLowerCase())) {
            alert('ชื่อหมวดหมู่นี้มีอยู่แล้ว');
            return;
        }

        const newId = `CAT_${Date.now()}`; // Simple ID generation

        setFormData(prev => ({
            ...prev,
            // Add to TOP of the list so user sees it immediately
            categories: [{ id: newId, label: trimmedLabel }, ...prev.categories]
        }));

        setNewCategoryLabel('');
        setRecentlyAddedId(newId);

        // Keep focus on input for rapid entry
        setTimeout(() => categoryInputRef.current?.focus(), 100);
    };

    const initiateDeleteCategory = (id: string, label: string) => {
        // Dependency Check
        const conflictCount = existingActivities.filter(a => a.category === id).length;

        if (conflictCount > 0) {
            setConflictData({ count: conflictCount, label: label });
            return;
        }

        // Open Confirmation Modal
        setDeleteTarget({ id, label });
    };

    const confirmDeleteCategory = () => {
        if (deleteTarget) {
            setFormData(prev => ({
                ...prev,
                categories: prev.categories.filter(c => c.id !== deleteTarget.id)
            }));
            setDeleteTarget(null);
        }
    };

    const handleActionClick = (mode: ModalMode) => {
        setShowPinModal(mode);
    };

    const verifyPinAndExecute = () => {
        if (pinInput === '123457') {
            if (showPinModal === 'SAVE') {
                onSave(formData);
                alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
            } else if (showPinModal === 'RESET') {
                onFactoryReset();
            }
            setShowPinModal(null);
            setPinInput('');
        } else {
            alert('รหัสผ่านไม่ถูกต้อง');
            setPinInput('');
        }
    };

    const getThemeBtnClass = (color: string) => {
        const isSelected = formData.themeColor === color;
        return `flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${isSelected
                ? 'border-slate-800 bg-white shadow-sm ring-2 ring-offset-1 ring-slate-200'
                : 'border-transparent hover:bg-white/50'
            }`;
    };

    const getSaveBtnClass = () => {
        switch (formData.themeColor) {
            case 'blue': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-200';
            case 'green': return 'bg-green-600 hover:bg-green-700 shadow-green-200';
            case 'red': return 'bg-red-600 hover:bg-red-700 shadow-red-200';
            case 'slate': return 'bg-slate-600 hover:bg-slate-700 shadow-slate-200';
            default: return 'bg-orange-600 hover:bg-orange-700 shadow-orange-200';
        }
    }

    const getPreviewBgClass = () => {
        switch (formData.themeColor) {
            case 'blue': return 'bg-blue-50/30 border-blue-100';
            case 'green': return 'bg-green-50/30 border-green-100';
            case 'red': return 'bg-red-50/30 border-red-100';
            case 'slate': return 'bg-slate-50/30 border-slate-100';
            default: return 'bg-orange-50/30 border-orange-100';
        }
    }

    const themeColors = [
        { id: 'orange', label: 'ส้ม (Orange)', bg: 'bg-orange-600' },
        { id: 'red', label: 'แดง (Red)', bg: 'bg-red-600' },
        { id: 'blue', label: 'ฟ้า (Blue)', bg: 'bg-blue-600' },
        { id: 'green', label: 'เขียว (Green)', bg: 'bg-green-600' },
        { id: 'slate', label: 'เทา (Slate)', bg: 'bg-slate-600' },
    ];

    return (
        <div className="p-8 min-h-screen flex justify-center animate-fade-in">
            <div className={`w-full max-w-4xl rounded-3xl shadow-xl overflow-hidden border transition-colors duration-300 ${getPreviewBgClass()} bg-white`}>

                {/* Header */}
                <div className="bg-slate-900 text-white p-8 flex items-center gap-4 relative overflow-hidden">
                    {/* Decorative bg circle */}
                    <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl ${formData.themeColor === 'slate' ? 'bg-white' : getSaveBtnClass().split(' ')[0]}`}></div>

                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                        <SettingsHeaderIcon />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">ตั้งค่าระบบ (System Settings)</h2>
                        <p className="text-slate-400">ปรับแต่งข้อมูลหน่วยงาน ธีม และหมวดหมู่กิจกรรม</p>
                    </div>
                </div>

                <div className="p-8 space-y-12">

                    {/* Branding Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 text-lg font-bold text-slate-800 border-b pb-4 border-slate-100">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Type size={20} /></div>
                            ข้อมูลหน่วยงาน (Branding)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อระบบ (System Name)</label>
                                    <input
                                        type="text"
                                        value={formData.systemName}
                                        onChange={e => setFormData({ ...formData, systemName: e.target.value })}
                                        className="w-full border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white transition-colors text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อหน่วยงานย่อย (Subtitle)</label>
                                    <input
                                        type="text"
                                        value={formData.subTitle}
                                        onChange={e => setFormData({ ...formData, subTitle: e.target.value })}
                                        className="w-full border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white transition-colors text-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ตราสัญลักษณ์ (Logo)</label>
                                <div className="flex items-start gap-6">
                                    <div className="w-32 h-32 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group hover:border-indigo-400 transition-colors">
                                        {formData.logoUrl ? (
                                            <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-4" />
                                        ) : (
                                            <div className="text-center text-slate-400">
                                                <ImageIcon className="mx-auto mb-2" size={32} />
                                                <span className="text-xs">No Logo</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-3 pt-2">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                                            >
                                                <Upload size={16} /> อัปโหลด
                                            </button>
                                            {formData.logoUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                                                >
                                                    ลบรูป
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            รองรับไฟล์ .png, .jpg พื้นหลังโปร่งใส<br />ระบบจะปรับขนาดอัตโนมัติ (Max Height 100px)
                                        </p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Theme Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 text-lg font-bold text-slate-800 border-b pb-4 border-slate-100">
                            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Palette size={20} /></div>
                            ธีมสี (Theme & Background)
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                {themeColors.map((color) => (
                                    <button
                                        key={color.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, themeColor: color.id as any })}
                                        className={getThemeBtnClass(color.id)}
                                    >
                                        <div className={`w-8 h-8 rounded-full ${color.bg} shadow-md ring-2 ring-white`}></div>
                                        <span className={`font-bold ${formData.themeColor === color.id ? 'text-slate-900' : 'text-slate-500'}`}>{color.label}</span>
                                        {formData.themeColor === color.id && <Check size={20} className="text-slate-800 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                            <p className="text-center md:text-left text-sm text-slate-400 mt-4">
                                * การเปลี่ยนธีมจะส่งผลต่อสีปุ่ม เมนู และภาพพื้นหลังของระบบทั้งหมด (Live Preview)
                            </p>
                        </div>
                    </section>

                    {/* Category Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                            <div className="flex items-center gap-3 text-lg font-bold text-slate-800">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><List size={20} /></div>
                                หมวดหมู่กิจกรรม (Categories)
                            </div>
                            <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-bold">{formData.categories.length} รายการ</span>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-3">
                                <Plus size={18} className="text-slate-400" />
                                <input
                                    ref={categoryInputRef}
                                    type="text"
                                    placeholder="พิมพ์ชื่อหมวดหมู่ใหม่ แล้วกด Enter..."
                                    value={newCategoryLabel}
                                    onChange={e => setNewCategoryLabel(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 font-medium placeholder-slate-400 text-sm p-0"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCategory}
                                    disabled={!newCategoryLabel.trim()}
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm text-xs font-bold"
                                >
                                    เพิ่ม +
                                </button>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">รายชื่อหมวดหมู่</th>
                                            <th className="px-6 py-2 text-right w-24 text-xs font-bold text-slate-400 uppercase tracking-wider">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {formData.categories.map((cat) => (
                                            <tr
                                                key={cat.id}
                                                className={`transition-all duration-500 ${recentlyAddedId === cat.id ? 'bg-yellow-50' : 'hover:bg-slate-50'}`}
                                            >
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${recentlyAddedId === cat.id ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                        <input
                                                            type="text"
                                                            value={cat.label}
                                                            onChange={(e) => handleCategoryEdit(cat.id, e.target.value)}
                                                            className="w-full bg-transparent border-none focus:ring-0 text-slate-700 font-medium placeholder-slate-300 p-0"
                                                        />
                                                        {recentlyAddedId === cat.id && <span className="text-[10px] text-orange-600 font-bold px-2 py-0.5 bg-orange-100 rounded-full">ใหม่</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        onClick={() => initiateDeleteCategory(cat.id, cat.label)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="ลบหมวดหมู่"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-yellow-800 text-sm">
                            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                            <p>ข้อควรระวัง: หากหมวดหมู่ใดถูกใช้งานในบันทึกประวัติกิจกรรมแล้ว ระบบจะไม่อนุญาตให้ลบจนกว่าจะมีการแก้ไขบันทึกเหล่านั้นออกก่อน</p>
                        </div>
                    </section>

                    {/* KPI Settings Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 text-lg font-bold text-slate-800 border-b pb-4 border-slate-100">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
                            </div>
                            ตั้งค่า KPI ประจำปี (Fire Performance)
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-200 space-y-6">
                            {/* Section Header */}
                            <div className="flex items-center gap-2 text-sm text-orange-700">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                ใช้สำหรับคำนวณ Dashboard KPI เปรียบเทียบกับปีก่อน
                            </div>

                            {/* Current Fire Season Year */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">ปีฤดูไฟป่าปัจจุบัน (พ.ศ.)</label>
                                <input
                                    type="number"
                                    min="2560"
                                    max="2600"
                                    value={formData.kpiSettings?.fireSeasonYear || new Date().getFullYear() + 543}
                                    onChange={e => setFormData({
                                        ...formData,
                                        kpiSettings: {
                                            ...formData.kpiSettings || { hotspotReductionTarget: 30, burnAreaReductionTarget: 40, previousYearHotspots: 0, previousYearBurnArea: 0, fireSeasonYear: 2569 },
                                            fireSeasonYear: Number(e.target.value)
                                        }
                                    })}
                                    className="w-40 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none bg-white font-mono text-lg font-bold text-slate-900"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Hotspot Reduction Target */}
                                <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">🎯 เป้าหมายลด Hotspot (%)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.kpiSettings?.hotspotReductionTarget || 30}
                                            onChange={e => setFormData({
                                                ...formData,
                                                kpiSettings: {
                                                    ...formData.kpiSettings || { hotspotReductionTarget: 30, burnAreaReductionTarget: 40, previousYearHotspots: 0, previousYearBurnArea: 0, fireSeasonYear: 2569 },
                                                    hotspotReductionTarget: Number(e.target.value)
                                                }
                                            })}
                                            className="w-24 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none bg-slate-50 font-mono text-lg font-bold text-slate-900"
                                        />
                                        <span className="text-xl font-bold text-orange-600">%</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">ลดลงจากปีก่อน (ค่าเริ่มต้น 30%)</p>
                                </div>

                                {/* Burn Area Reduction Target */}
                                <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">🔥 เป้าหมายลดพื้นที่เผา (%)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.kpiSettings?.burnAreaReductionTarget || 40}
                                            onChange={e => setFormData({
                                                ...formData,
                                                kpiSettings: {
                                                    ...formData.kpiSettings || { hotspotReductionTarget: 30, burnAreaReductionTarget: 40, previousYearHotspots: 0, previousYearBurnArea: 0, fireSeasonYear: 2569 },
                                                    burnAreaReductionTarget: Number(e.target.value)
                                                }
                                            })}
                                            className="w-24 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none bg-slate-50 font-mono text-lg font-bold text-slate-900"
                                        />
                                        <span className="text-xl font-bold text-red-600">%</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">ลดลงจากปีก่อน (ค่าเริ่มต้น 40%)</p>
                                </div>

                                {/* Previous Year Hotspots */}
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">📊 จำนวน Hotspot ปีก่อน (จุด)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.kpiSettings?.previousYearHotspots || 0}
                                        onChange={e => setFormData({
                                            ...formData,
                                            kpiSettings: {
                                                ...formData.kpiSettings || { hotspotReductionTarget: 30, burnAreaReductionTarget: 40, previousYearHotspots: 0, previousYearBurnArea: 0, fireSeasonYear: 2569 },
                                                previousYearHotspots: Number(e.target.value)
                                            }
                                        })}
                                        className="w-full border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none bg-slate-50 font-mono text-lg font-bold text-slate-900"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">สถิติ Hotspot รวมทั้งปีก่อนหน้า</p>
                                </div>

                                {/* Previous Year Burn Area */}
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">🗺️ พื้นที่เผาปีก่อน (ไร่)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={formData.kpiSettings?.previousYearBurnArea || 0}
                                        onChange={e => setFormData({
                                            ...formData,
                                            kpiSettings: {
                                                ...formData.kpiSettings || { hotspotReductionTarget: 30, burnAreaReductionTarget: 40, previousYearHotspots: 0, previousYearBurnArea: 0, fireSeasonYear: 2569 },
                                                previousYearBurnArea: Number(e.target.value)
                                            }
                                        })}
                                        className="w-full border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 outline-none bg-slate-50 font-mono text-lg font-bold text-slate-900"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">จากการแปลภาพถ่ายทางอากาศปีก่อน</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Save Button */}
                    <div className="py-6 flex justify-end sticky bottom-0 bg-white/80 backdrop-blur-md p-4 border-t border-slate-100 -mx-8 -mb-8 z-20">
                        <button
                            type="button"
                            onClick={() => handleActionClick('SAVE')}
                            className={`${getSaveBtnClass()} text-white font-bold py-3 px-10 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3 transform hover:-translate-y-1`}
                        >
                            <Save size={20} />
                            บันทึกการตั้งค่า
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <section className="mt-16 pt-8 border-t-2 border-slate-100">
                        <div className="border border-red-200 rounded-2xl overflow-hidden bg-red-50/30">
                            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
                                <AlertOctagon size={20} className="text-red-600" />
                                <h3 className="text-red-800 font-bold">พื้นที่อันตราย (Danger Zone)</h3>
                            </div>
                            <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1">ล้างข้อมูลระบบ (Factory Reset)</h4>
                                    <p className="text-sm text-slate-500 max-w-md">
                                        การกระทำนี้จะลบข้อมูลทั้งหมด (ประวัติกิจกรรม, รายงาน Hotspot, และการตั้งค่า) ให้กลับสู่ค่าเริ่มต้น ไม่สามารถกู้คืนได้
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleActionClick('RESET')}
                                    className="bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm whitespace-nowrap"
                                >
                                    ล้างข้อมูลทั้งหมด
                                </button>
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            {/* PIN Modal */}
            {showPinModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden animate-scale-up border border-white/20">
                        <div className={`p-6 flex justify-center ${showPinModal === 'RESET' ? 'bg-red-600' : 'bg-slate-900'}`}>
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md shadow-inner">
                                <Lock size={32} />
                            </div>
                        </div>
                        <div className="p-8">
                            <h3 className={`text-center font-bold text-lg mb-2 ${showPinModal === 'RESET' ? 'text-red-600' : 'text-slate-800'}`}>
                                {showPinModal === 'RESET' ? 'ยืนยันการล้างระบบ' : 'ยืนยันรหัสผู้ดูแล'}
                            </h3>
                            <p className="text-center text-xs text-slate-500 mb-6 leading-relaxed">
                                เพื่อความปลอดภัย กรุณากรอกรหัส PIN 6 หลัก<br />เพื่อยืนยันการดำเนินการนี้
                            </p>
                            <input
                                type="password"
                                autoFocus
                                placeholder="PIN Code"
                                className="w-full text-center text-3xl tracking-[0.5em] font-bold py-3 border-b-2 border-slate-200 focus:border-slate-800 outline-none bg-transparent text-slate-900 placeholder-slate-200 mb-8"
                                value={pinInput}
                                onChange={e => setPinInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && verifyPinAndExecute()}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowPinModal(null); setPinInput(''); }}
                                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={verifyPinAndExecute}
                                    className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg transform hover:scale-105 transition-all ${showPinModal === 'RESET' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-300'}`}
                                >
                                    ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการลบหมวดหมู่?</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                คุณต้องการลบหมวดหมู่ <span className="font-bold text-slate-800">"{deleteTarget.label}"</span> ใช่หรือไม่?
                                <br />การกระทำนี้ไม่สามารถเรียกคืนได้
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmDeleteCategory}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold shadow-md transition-colors"
                            >
                                ยืนยันลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conflict Alert Modal */}
            {conflictData && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                                <Ban size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">ไม่สามารถลบได้</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-2">
                                หมวดหมู่ <span className="font-bold text-slate-800">"{conflictData.label}"</span> กำลังถูกใช้งานอยู่
                            </p>
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-orange-800 text-sm font-medium">
                                พบข้อมูลกิจกรรมจำนวน {conflictData.count} รายการ
                            </div>
                            <p className="text-slate-400 text-xs mt-3">
                                กรุณาแก้ไขรายการเหล่านี้ให้เป็นหมวดหมู่อื่นก่อนทำการลบ
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setConflictData(null)}
                                className="px-6 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-bold shadow-md transition-colors"
                            >
                                เข้าใจแล้ว
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const SettingsHeaderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);
