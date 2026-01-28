
import React, { useState, useMemo, useRef } from 'react';
import { FireIncident, FireAlertSource, FireResponseType, HotspotLog, LocationData, AppSettings } from '../types';
import {
    Flame, Plus, Trash2, Save, Clock, MapPin, Users,
    Zap, Radio, Eye, Satellite, Link2, AlertTriangle,
    CheckCircle, XCircle, ChevronDown, TreePine, Map,
    Image as ImageIcon, X, Target, FileDown
} from 'lucide-react';
import { FireStatsPdfExport } from './FireStatsPdfExport';

interface FireIncidentLogProps {
    incidents: FireIncident[];
    hotspotLogs: HotspotLog[];
    settings: AppSettings;
    onSave: (incidents: FireIncident[]) => void;
    onDelete: (id: string) => void;
}

// Dark theme constants
const CARD_BG = 'rgba(30, 41, 59, 0.8)';
const CARD_BORDER = 'rgba(71, 85, 105, 0.3)';

// Alert Source labels
const ALERT_SOURCE_OPTIONS = [
    { value: FireAlertSource.PATROL, label: 'ลาดตระเวนพบ', icon: Eye, color: 'text-blue-400' },
    { value: FireAlertSource.VILLAGER, label: 'ชาวบ้านแจ้ง', icon: Radio, color: 'text-green-400' },
    { value: FireAlertSource.SMOKE, label: 'เห็นควัน/เปลว', icon: Flame, color: 'text-orange-400' },
    { value: FireAlertSource.SATELLITE, label: 'ดาวเทียม Hotspot', icon: Satellite, color: 'text-red-400' },
];

// Empty incident template
const createEmptyIncident = (date: string, areaName: 'erawan' | 'salakpra'): Omit<FireIncident, 'id'> => ({
    date,
    areaName,
    alertSource: FireAlertSource.PATROL,
    responseType: FireResponseType.PRE_HOTSPOT,
    personnelCount: 0,
    areaDamaged: 0,
});

export const FireIncidentLog: React.FC<FireIncidentLogProps> = ({
    incidents,
    hotspotLogs,
    settings,
    onSave,
    onDelete
}) => {
    // Form state for batch entry
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedArea, setSelectedArea] = useState<'erawan' | 'salakpra'>('erawan');
    const [newIncidents, setNewIncidents] = useState<Omit<FireIncident, 'id'>[]>([
        createEmptyIncident(selectedDate, selectedArea)
    ]);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [showPdfExport, setShowPdfExport] = useState(false);

    // Get hotspots for selected date
    const hotspotsForDate = useMemo(() => {
        return hotspotLogs.filter(h => h.date === selectedDate);
    }, [hotspotLogs, selectedDate]);

    // Stats for existing incidents
    const stats = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const thisYearIncidents = incidents.filter(i => {
            const year = new Date(i.date).getFullYear();
            return year === currentYear;
        });

        const preHotspot = thisYearIncidents.filter(i => i.responseType === FireResponseType.PRE_HOTSPOT).length;
        const postHotspot = thisYearIncidents.filter(i => i.responseType === FireResponseType.POST_HOTSPOT).length;
        const total = thisYearIncidents.length;
        const preRate = total > 0 ? Math.round((preHotspot / total) * 100) : 0;
        const totalDamage = thisYearIncidents.reduce((sum, i) => sum + (i.areaDamaged || 0), 0);
        const totalPersonnel = thisYearIncidents.reduce((sum, i) => sum + (i.personnelCount || 0), 0);

        return { preHotspot, postHotspot, total, preRate, totalDamage, totalPersonnel };
    }, [incidents]);

    // Handlers
    const handleAddIncident = () => {
        setNewIncidents(prev => [...prev, createEmptyIncident(selectedDate, selectedArea)]);
    };

    const handleRemoveIncident = (index: number) => {
        setNewIncidents(prev => prev.filter((_, i) => i !== index));
    };

    const handleIncidentChange = (index: number, field: keyof Omit<FireIncident, 'id'>, value: any) => {
        setNewIncidents(prev => prev.map((inc, i) => {
            if (i !== index) return inc;

            const updated = { ...inc, [field]: value };

            // Auto-set responseType based on alertSource
            if (field === 'alertSource') {
                if (value === FireAlertSource.SATELLITE) {
                    updated.responseType = FireResponseType.POST_HOTSPOT;
                }
            }

            // Auto-set responseType if linking to hotspot
            if (field === 'linkedHotspotId' && value) {
                updated.responseType = FireResponseType.POST_HOTSPOT;
            }

            return updated;
        }));
    };

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        setNewIncidents(prev => prev.map(inc => ({ ...inc, date })));
    };

    const handleAreaChange = (area: 'erawan' | 'salakpra') => {
        setSelectedArea(area);
        setNewIncidents(prev => prev.map(inc => ({ ...inc, areaName: area })));
    };

    // Image upload handler
    const handleImageUpload = async (index: number, files: FileList | null) => {
        if (!files) return;

        const currentImages = newIncidents[index].imageUrls || [];
        const remainingSlots = 5 - currentImages.length;

        if (remainingSlots <= 0) {
            alert('สามารถอัปโหลดได้สูงสุด 5 รูป');
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        const newImages: string[] = [];

        for (const file of filesToProcess) {
            try {
                const base64 = await compressImage(file, 800, 0.7);
                newImages.push(base64);
            } catch (err) {
                console.error('Failed to process image', err);
            }
        }

        handleIncidentChange(index, 'imageUrls', [...currentImages, ...newImages]);
    };

    // Compress image to Base64
    const compressImage = (file: File, maxSize: number, quality: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', quality));
                    } else {
                        reject('Failed to get canvas context');
                    }
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Remove image
    const handleRemoveImage = (incidentIndex: number, imageIndex: number) => {
        const currentImages = newIncidents[incidentIndex].imageUrls || [];
        handleIncidentChange(incidentIndex, 'imageUrls', currentImages.filter((_, i) => i !== imageIndex));
    };

    // Handle UTM change
    const handleUtmChange = (index: number, utmValue: string) => {
        handleIncidentChange(index, 'location', { utm: utmValue } as LocationData);
    };

    const handleSaveAll = () => {
        // Generate IDs and save
        const incidentsWithIds: FireIncident[] = newIncidents.map(inc => ({
            ...inc,
            id: `FI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }));

        onSave(incidentsWithIds);

        // Reset form
        setNewIncidents([createEmptyIncident(selectedDate, selectedArea)]);
    };

    const confirmDelete = () => {
        if (deleteTargetId) {
            onDelete(deleteTargetId);
            setDeleteTargetId(null);
        }
    };

    // Sort existing incidents by date (newest first)
    const sortedIncidents = [...incidents].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Count new incidents by response type
    const newPreCount = newIncidents.filter(i => i.responseType === FireResponseType.PRE_HOTSPOT).length;
    const newPostCount = newIncidents.filter(i => i.responseType === FireResponseType.POST_HOTSPOT).length;

    return (
        <div className="p-6 md:p-8 min-h-screen space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-700/50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30">
                        <Flame size={28} className="text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">FIRE INCIDENT LOG</h2>
                        <p className="text-slate-400 text-sm">บันทึกเหตุไฟป่า • Pre-Hotspot & Post-Hotspot Response</p>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="flex gap-3">
                    <div className="text-center px-4 py-2 rounded-xl border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
                        <p className="text-2xl font-bold text-white font-mono">{stats.total}</p>
                        <p className="text-xs text-slate-400">TOTAL</p>
                    </div>
                    <div className="text-center px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                        <p className="text-2xl font-bold text-emerald-400 font-mono">{stats.preRate}%</p>
                        <p className="text-xs text-emerald-400">PRE-SPOT</p>
                    </div>
                    <button
                        onClick={() => setShowPdfExport(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                    >
                        <FileDown size={18} />
                        <span className="text-xs font-bold">PDF</span>
                    </button>
                </div>
            </div>

            {/* Batch Entry Form */}
            <div className="rounded-2xl border p-5" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="text-yellow-500" size={20} />
                    QUICK ENTRY
                </h3>

                {/* Date & Area Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">วันที่</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => handleDateChange(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none border bg-slate-800/50 border-slate-600 text-white [color-scheme:dark]"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">พื้นที่</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAreaChange('erawan')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${selectedArea === 'erawan'
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                    : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                <TreePine size={16} />
                                อช.เอราวัณ
                            </button>
                            <button
                                onClick={() => handleAreaChange('salakpra')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all ${selectedArea === 'salakpra'
                                    ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                                    : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:border-slate-500'
                                    }`}
                            >
                                <Map size={16} />
                                ขสป.สลักพระ
                            </button>
                        </div>
                    </div>
                </div>

                {/* Hotspot Info for Date */}
                {hotspotsForDate.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                        <Satellite className="text-red-400" size={20} />
                        <div className="flex-1">
                            <p className="text-sm text-red-300 font-medium">
                                พบ Hotspot วันนี้: {hotspotsForDate.reduce((sum, h) => sum + h.count, 0)} จุด
                            </p>
                            <p className="text-xs text-red-400/70">
                                รอบ 02:00: {hotspotsForDate.find(h => h.round === '02:00')?.count || 0} |
                                รอบ 14:00: {hotspotsForDate.find(h => h.round === '14:00')?.count || 0}
                            </p>
                        </div>
                    </div>
                )}

                {/* Incident Entries */}
                <div className="space-y-4 mb-6">
                    {newIncidents.map((incident, index) => (
                        <div
                            key={index}
                            className="relative p-4 rounded-xl border border-slate-700/50 bg-slate-800/30"
                        >
                            {/* Remove button */}
                            {newIncidents.length > 1 && (
                                <button
                                    onClick={() => handleRemoveIncident(index)}
                                    className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Time */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">เวลาพบ</label>
                                    <input
                                        type="time"
                                        value={incident.time || ''}
                                        onChange={e => handleIncidentChange(index, 'time', e.target.value)}
                                        className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 text-white [color-scheme:dark]"
                                    />
                                </div>

                                {/* Location Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">ตำแหน่ง/บริเวณ</label>
                                    <input
                                        type="text"
                                        placeholder="เช่น แนวกันไฟ ก.3"
                                        value={incident.locationName || ''}
                                        onChange={e => handleIncidentChange(index, 'locationName', e.target.value)}
                                        className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 text-white placeholder-slate-500"
                                    />
                                </div>

                                {/* Alert Source */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">แหล่งข่าว</label>
                                    <select
                                        value={incident.alertSource}
                                        onChange={e => handleIncidentChange(index, 'alertSource', e.target.value)}
                                        className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 text-white"
                                    >
                                        {ALERT_SOURCE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Response Type */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">สถานะ Hotspot</label>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleIncidentChange(index, 'responseType', FireResponseType.PRE_HOTSPOT)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${incident.responseType === FireResponseType.PRE_HOTSPOT
                                                ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-400'
                                                : 'bg-slate-700/50 border border-slate-600 text-slate-400'
                                                }`}
                                        >
                                            🟢 Pre
                                        </button>
                                        <button
                                            onClick={() => handleIncidentChange(index, 'responseType', FireResponseType.POST_HOTSPOT)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${incident.responseType === FireResponseType.POST_HOTSPOT
                                                ? 'bg-amber-500/30 border border-amber-500/50 text-amber-400'
                                                : 'bg-slate-700/50 border border-slate-600 text-slate-400'
                                                }`}
                                        >
                                            🟡 Post
                                        </button>
                                    </div>
                                </div>

                                {/* Link Hotspot (if post and hotspots exist) */}
                                {incident.responseType === FireResponseType.POST_HOTSPOT && hotspotsForDate.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                                            <Link2 size={12} /> Link Hotspot
                                        </label>
                                        <select
                                            value={incident.linkedHotspotId || ''}
                                            onChange={e => handleIncidentChange(index, 'linkedHotspotId', e.target.value || undefined)}
                                            className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 text-white"
                                        >
                                            <option value="">-- ไม่เลือก --</option>
                                            {hotspotsForDate.map(h => (
                                                <option key={h.id} value={h.id}>
                                                    รอบ {h.round} ({h.count} จุด)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Personnel Count */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                                        <Users size={12} /> กำลังพล
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={incident.personnelCount || ''}
                                        onChange={e => handleIncidentChange(index, 'personnelCount', Number(e.target.value))}
                                        className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 text-white"
                                    />
                                </div>

                                {/* Area Damaged */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">พื้นที่เสียหาย (ไร่)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        placeholder="0"
                                        value={incident.areaDamaged || ''}
                                        onChange={e => handleIncidentChange(index, 'areaDamaged', Number(e.target.value))}
                                        className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 text-white"
                                    />
                                </div>

                                {/* Control/Extinguished Time */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">⏱️ เวลาดับเสร็จ</label>
                                    <input
                                        type="time"
                                        value={incident.controlTime || ''}
                                        onChange={e => handleIncidentChange(index, 'controlTime', e.target.value)}
                                        className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 text-white [color-scheme:dark]"
                                    />
                                </div>

                                {/* Remark */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">หมายเหตุ</label>
                                    <input
                                        type="text"
                                        placeholder="ระบุรายละเอียดเพิ่มเติม..."
                                        value={incident.remark || ''}
                                        onChange={e => handleIncidentChange(index, 'remark', e.target.value)}
                                        className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 text-white placeholder-slate-500"
                                    />
                                </div>

                                {/* UTM Coordinates */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                                        <Target size={12} /> พิกัด UTM (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="เช่น 47P 0563210, 1578485"
                                        value={incident.location?.utm || ''}
                                        onChange={e => handleUtmChange(index, e.target.value)}
                                        className="w-full rounded-lg px-3 py-2 text-sm bg-slate-800/50 border border-slate-600 text-white placeholder-slate-500 font-mono"
                                    />
                                </div>

                                {/* Image Upload */}
                                <div className="md:col-span-4 lg:col-span-4">
                                    <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                                        <ImageIcon size={12} /> รูปภาพหลักฐาน (สูงสุด 5 รูป)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {/* Existing Images */}
                                        {(incident.imageUrls || []).map((imgUrl, imgIndex) => (
                                            <div key={imgIndex} className="relative w-20 h-20 rounded-lg overflow-hidden group border border-slate-600">
                                                <img
                                                    src={imgUrl}
                                                    alt={`ภาพ ${imgIndex + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={() => handleRemoveImage(index, imgIndex)}
                                                    className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Upload Button */}
                                        {(incident.imageUrls?.length || 0) < 5 && (
                                            <label className="w-20 h-20 rounded-lg border border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/10 transition-all">
                                                <ImageIcon size={20} className="text-slate-500" />
                                                <span className="text-[10px] text-slate-500 mt-1">เพิ่มรูป</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={e => handleImageUpload(index, e.target.files)}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Incident Button */}
                <button
                    onClick={handleAddIncident}
                    className="w-full py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:border-orange-500/50 hover:text-orange-400 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    เพิ่มเหตุการณ์
                </button>

                {/* Summary & Save */}
                <div className="mt-6 pt-4 border-t border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-400">สรุป:</span>
                        <span className="text-white font-bold">{newIncidents.length} เหตุ</span>
                        <span className="text-emerald-400">🟢 Pre: {newPreCount}</span>
                        <span className="text-amber-400">🟡 Post: {newPostCount}</span>
                    </div>
                    <button
                        onClick={handleSaveAll}
                        disabled={newIncidents.length === 0}
                        className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save size={18} />
                        บันทึกทั้งหมด
                    </button>
                </div>
            </div>

            {/* Existing Records Table */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
                <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: CARD_BORDER }}>
                    <h3 className="font-bold text-white">INCIDENT HISTORY</h3>
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full font-mono">{incidents.length} records</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
                            <tr>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase">Date</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase">Time</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase">Location</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase">Source</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase">Type</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase text-right">Area</th>
                                <th className="px-4 py-3 font-semibold text-slate-400 text-xs uppercase text-right">Personnel</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: CARD_BORDER }}>
                            {sortedIncidents.slice(0, 20).map(inc => {
                                const sourceOption = ALERT_SOURCE_OPTIONS.find(o => o.value === inc.alertSource);
                                const SourceIcon = sourceOption?.icon || Radio;

                                return (
                                    <tr key={inc.id} className="hover:bg-white/5 transition-colors" style={{ borderColor: CARD_BORDER }}>
                                        <td className="px-4 py-3 text-sm font-mono text-slate-300">
                                            {new Date(inc.date).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400">{inc.time || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{inc.locationName || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`flex items-center gap-1 text-xs ${sourceOption?.color || 'text-slate-400'}`}>
                                                <SourceIcon size={12} />
                                                {sourceOption?.label || inc.alertSource}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {inc.responseType === FireResponseType.PRE_HOTSPOT ? (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                    🟢 PRE
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                    🟡 POST
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-300">
                                            {inc.areaDamaged ? `${inc.areaDamaged} ไร่` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-300">
                                            {inc.personnelCount || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setDeleteTargetId(inc.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {incidents.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                        ยังไม่มีบันทึกเหตุไฟป่า
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTargetId && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up border"
                        style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">ยืนยันการลบ?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                คุณต้องการลบบันทึกเหตุไฟนี้ใช่หรือไม่?
                                <br />การกระทำนี้ไม่สามารถเรียกคืนได้
                            </p>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: CARD_BORDER, background: 'rgba(15, 23, 42, 0.5)' }}>
                            <button
                                onClick={() => setDeleteTargetId(null)}
                                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold shadow-md transition-colors"
                            >
                                ยืนยันลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Export Modal */}
            {showPdfExport && (
                <FireStatsPdfExport
                    fireIncidents={incidents}
                    hotspotLogs={hotspotLogs}
                    settings={settings}
                    onClose={() => setShowPdfExport(false)}
                />
            )}
        </div>
    );
};
