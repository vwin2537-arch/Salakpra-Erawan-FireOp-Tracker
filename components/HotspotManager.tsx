
import React, { useState, useMemo } from 'react';
import { HotspotLog } from '../types';
import { Save, Satellite, Clock, Trash2, Flame, Calendar, TrendingUp, AlertTriangle, Map, TreePine, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

interface HotspotManagerProps {
    logs: HotspotLog[];
    onSave: (log: HotspotLog) => void;
    onDelete: (id: string) => void;
}

// Dark Theme Colors
const DARK_THEME = {
    cardBg: 'rgba(30, 41, 59, 0.8)',
    cardBorder: 'rgba(71, 85, 105, 0.3)',
};

export const HotspotManager: React.FC<HotspotManagerProps> = ({ logs, onSave, onDelete }) => {
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [formData, setFormData] = useState<{
        date: string;
        round: string;
        erawanCount: number;
        salakpraCount: number;
        remark: string;
    }>({
        date: new Date().toISOString().split('T')[0],
        round: '14:00',
        erawanCount: 0,
        salakpraCount: 0,
        remark: ''
    });

    const totalInput = formData.erawanCount + formData.salakpraCount;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newLog: HotspotLog = {
            id: Date.now().toString(),
            date: formData.date,
            round: formData.round as '02:00' | '14:00',
            erawanCount: Number(formData.erawanCount),
            salakpraCount: Number(formData.salakpraCount),
            count: Number(formData.erawanCount) + Number(formData.salakpraCount),
            remark: formData.remark
        };
        onSave(newLog);
        setFormData(prev => ({ ...prev, erawanCount: 0, salakpraCount: 0, remark: '' }));
    };

    const confirmDelete = () => {
        if (deleteTargetId) {
            onDelete(deleteTargetId);
            setDeleteTargetId(null);
        }
    };

    const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const normalizeRound = (val: any) => {
        const str = String(val);
        if (str.includes('14') || str.includes('PM') || str.includes('บ่าย')) return '14:00';
        if (str.includes('02') || str.includes('AM') || str.includes('เช้า') || str.includes('2:')) return '02:00';
        return str;
    };

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        let todayCount = 0;
        let monthCount = 0;
        let totalCount = 0;

        const dailyMap: Record<string, { erawan: number, salakpra: number }> = {};
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dailyMap[key] = { erawan: 0, salakpra: 0 };
        }

        logs.forEach(log => {
            const logTotal = (log.erawanCount || 0) + (log.salakpraCount || 0) || log.count;

            totalCount += logTotal;
            if (log.date === today) todayCount += logTotal;

            const logDate = new Date(log.date);
            if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                monthCount += logTotal;
            }

            if (dailyMap[log.date]) {
                dailyMap[log.date].erawan += (log.erawanCount || 0);
                dailyMap[log.date].salakpra += (log.salakpraCount || 0);
                if (!log.erawanCount && !log.salakpraCount && log.count > 0) {
                    dailyMap[log.date].salakpra += log.count;
                }
            }
        });

        const chartData = Object.keys(dailyMap).sort().map(date => {
            const d = new Date(date);
            return {
                date,
                name: d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
                erawan: dailyMap[date].erawan,
                salakpra: dailyMap[date].salakpra,
                total: dailyMap[date].erawan + dailyMap[date].salakpra
            };
        });

        return { todayCount, monthCount, totalCount, chartData };
    }, [logs]);

    return (
        <div className="p-6 md:p-8 min-h-screen space-y-6 animate-fade-in">

            {/* Header - Command Center Style */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-700/50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                        <Satellite size={28} className="text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">HOTSPOT MONITORING</h2>
                        <p className="text-slate-400 text-sm">VIIRS Satellite Data • เอราวัณ - สลักพระ</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase">Last Update</p>
                    <p className="font-mono text-sm text-slate-300">{new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
                </div>
            </div>

            {/* Dashboard Cards - Dark Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl p-5 border backdrop-blur-sm"
                    style={{ background: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">พบวันนี้</p>
                            <p className="text-3xl font-bold text-white font-mono">{stats.todayCount}</p>
                            <p className="text-slate-500 text-xs mt-1">TODAY</p>
                        </div>
                        <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                            <Flame className="text-red-400" size={24} />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-400"></div>
                </div>

                <div className="relative overflow-hidden rounded-2xl p-5 border backdrop-blur-sm"
                    style={{ background: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">เดือนนี้</p>
                            <p className="text-3xl font-bold text-white font-mono">{stats.monthCount}</p>
                            <p className="text-slate-500 text-xs mt-1">THIS MONTH</p>
                        </div>
                        <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30">
                            <Calendar className="text-orange-400" size={24} />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-400"></div>
                </div>

                <div className="relative overflow-hidden rounded-2xl p-5 border backdrop-blur-sm"
                    style={{ background: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">รวมทั้งปี</p>
                            <p className="text-3xl font-bold text-white font-mono">{stats.totalCount}</p>
                            <p className="text-slate-500 text-xs mt-1">TOTAL ANNUAL</p>
                        </div>
                        <div className="p-3 bg-slate-500/20 rounded-xl border border-slate-500/30">
                            <TrendingUp className="text-slate-400" size={24} />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-500 to-slate-400"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section - Dark */}
                <div className="lg:col-span-2 rounded-2xl p-5 border"
                    style={{ background: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder }}>
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-orange-500" />
                        DAILY HOTSPOT TREND (14 DAYS)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData}>
                                <defs>
                                    <linearGradient id="colorErawan" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSalakpra" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                                />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <Area type="monotone" dataKey="erawan" name="อช.เอราวัณ" stroke="#10b981" strokeWidth={2} fill="url(#colorErawan)" dot={{ fill: '#10b981', r: 3 }} />
                                <Area type="monotone" dataKey="salakpra" name="ขสป.สลักพระ" stroke="#f97316" strokeWidth={2} fill="url(#colorSalakpra)" dot={{ fill: '#f97316', r: 3 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Form Section - Dark */}
                <div className="rounded-2xl p-5 border"
                    style={{ background: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder }}>
                    <div className="mb-4 flex items-center gap-2 text-red-400 font-bold border-b border-slate-700/50 pb-3">
                        <Zap size={18} /> NEW REPORT
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">วันที่รายงาน</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none border bg-slate-800/50 border-slate-600 text-white [color-scheme:dark]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">รอบเวลา</label>
                            <select
                                value={formData.round}
                                onChange={e => setFormData({ ...formData, round: e.target.value })}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none border bg-slate-800/50 border-slate-600 text-white"
                            >
                                <option value="02:00">รอบเช้า (02.00 น.)</option>
                                <option value="14:00">รอบบ่าย (14.00 น.)</option>
                            </select>
                        </div>

                        {/* Area Split Inputs - Dark */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                                <label className="block text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1">
                                    <TreePine size={12} /> อช.เอราวัณ
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.erawanCount || ''}
                                    onChange={e => setFormData({ ...formData, erawanCount: Number(e.target.value) })}
                                    placeholder="0"
                                    className="w-full rounded-md px-2 py-1.5 text-center font-bold text-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none border bg-slate-800/50 border-emerald-500/30"
                                />
                            </div>
                            <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/30">
                                <label className="block text-xs font-bold text-orange-400 mb-2 flex items-center gap-1">
                                    <Map size={12} /> ขสป.สลักพระ
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.salakpraCount || ''}
                                    onChange={e => setFormData({ ...formData, salakpraCount: Number(e.target.value) })}
                                    placeholder="0"
                                    className="w-full rounded-md px-2 py-1.5 text-center font-bold text-orange-400 focus:ring-1 focus:ring-orange-500 outline-none border bg-slate-800/50 border-orange-500/30"
                                />
                            </div>
                        </div>

                        {/* Total Display */}
                        <div className="flex justify-between items-center bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-600">
                            <span className="text-xs font-semibold text-slate-400">รวมทั้งสิ้น</span>
                            <span className="text-lg font-bold text-white font-mono">{totalInput} จุด</span>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase">หมายเหตุ</label>
                            <input
                                type="text"
                                placeholder="ระบุรายละเอียด..."
                                value={formData.remark}
                                onChange={e => setFormData({ ...formData, remark: e.target.value })}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none border bg-slate-800/50 border-slate-600 text-white placeholder-slate-500"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-2.5 rounded-lg shadow-lg hover:shadow-red-500/25 transition-all flex justify-center items-center gap-2 mt-2 text-sm hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Save size={18} /> SAVE REPORT
                        </button>
                    </form>
                </div>
            </div>

            {/* History Table - Dark */}
            <div className="rounded-2xl border overflow-hidden"
                style={{ background: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder }}>
                <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: DARK_THEME.cardBorder }}>
                    <h3 className="font-bold text-white">REPORT HISTORY</h3>
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full font-mono">{logs.length} records</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
                            <tr>
                                <th className="px-5 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Date</th>
                                <th className="px-5 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Round</th>
                                <th className="px-5 py-3 font-semibold text-emerald-400 text-xs uppercase tracking-wider text-right">Erawan</th>
                                <th className="px-5 py-3 font-semibold text-orange-400 text-xs uppercase tracking-wider text-right">Salakpra</th>
                                <th className="px-5 py-3 font-semibold text-white text-xs uppercase tracking-wider text-right">Total</th>
                                <th className="px-5 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Remark</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: DARK_THEME.cardBorder }}>
                            {sortedLogs.map(log => (
                                <tr key={log.id} className="hover:bg-white/5 transition-colors" style={{ borderColor: DARK_THEME.cardBorder }}>
                                    <td className="px-5 py-3 text-sm font-mono text-slate-300">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                                    <td className="px-5 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 ${normalizeRound(log.round) === '02:00' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                                            <Clock size={10} /> {normalizeRound(log.round)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right font-mono text-emerald-400">
                                        {log.erawanCount > 0 ? log.erawanCount : '-'}
                                    </td>
                                    <td className="px-5 py-3 text-right font-mono text-orange-400">
                                        {log.salakpraCount > 0 ? log.salakpraCount : '-'}
                                    </td>
                                    <td className="px-5 py-3 text-right font-bold text-white font-mono">
                                        {log.count}
                                    </td>
                                    <td className="px-5 py-3 text-slate-400 text-sm truncate max-w-[200px]">{log.remark || '-'}</td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => setDeleteTargetId(log.id)}
                                            className="text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-red-500/20 rounded-lg"
                                            title="ลบรายการ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sortedLogs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No data available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal - Dark */}
            {deleteTargetId && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up border"
                        style={{ background: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder }}>
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Confirm Delete?</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                คุณต้องการลบรายงาน Hotspot นี้ใช่หรือไม่?
                                <br />การกระทำนี้ไม่สามารถเรียกคืนได้
                            </p>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3" style={{ borderColor: DARK_THEME.cardBorder, background: 'rgba(15, 23, 42, 0.5)' }}>
                            <button
                                onClick={() => setDeleteTargetId(null)}
                                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold shadow-md transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
