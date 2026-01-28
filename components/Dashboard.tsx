
import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { ActivityLog, OperationalPhase, ActivityCategory, HotspotLog, AppSettings, FireIncident, FireResponseType } from '../types';

import { Sparkles, TrendingUp, Flame, ShieldCheck, Users, Table as TableIcon, AlertTriangle, ThermometerSun, Clock, Zap, Activity, Terminal, Target, TrendingDown, CheckCircle } from 'lucide-react';

interface DashboardProps {
    activities: ActivityLog[];
    hotspotLogs: HotspotLog[];
    settings: AppSettings;
    fireIncidents?: FireIncident[];
}

// Command Center Color Palette
const COMMAND_COLORS = {
    background: '#0f172a', // Slate 900
    cardBg: 'rgba(30, 41, 59, 0.8)', // Slate 800 with transparency
    cardBorder: 'rgba(71, 85, 105, 0.3)', // Slate 600
    textPrimary: '#f1f5f9', // Slate 100
    textSecondary: '#94a3b8', // Slate 400
    accent: '#f97316', // Orange 500
    danger: '#ef4444', // Red 500
    success: '#22c55e', // Green 500
    warning: '#eab308', // Yellow 500
    glow: 'rgba(249, 115, 22, 0.3)', // Orange glow
};

const CHART_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'];

// Animated Counter Component
const AnimatedCounter: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(easeOutQuart * value));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <>{displayValue.toLocaleString()}</>;
};



// Status Badge Component
const StatusBadge: React.FC<{ level: 'low' | 'medium' | 'high' | 'active' }> = ({ level }) => {
    const config = {
        low: { label: 'LOW RISK', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
        medium: { label: 'MODERATE', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
        high: { label: 'HIGH ALERT', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        active: { label: 'ACTIVE', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
    };

    const { label, color } = config[level];

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${color} flex items-center gap-1.5`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
            {label}
        </span>
    );
};

// Live Clock Component
const LiveClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center gap-2 text-slate-400">
            <Clock size={16} className="text-orange-500" />
            <span className="font-mono text-sm">
                {time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </div>
    );
};

import { DashboardPdfExport } from './DashboardPdfExport';

export const Dashboard: React.FC<DashboardProps> = ({ activities, hotspotLogs, settings, fireIncidents = [] }) => {
    const [showPdfExport, setShowPdfExport] = useState(false);

    const getCategoryLabel = (id: string) => settings.categories.find(c => c.id === id)?.label || id;

    // Calculate Statistics
    const stats = useMemo(() => {
        let totalFireArea = 0;
        let totalPersonnel = 0;
        const totalHotspots = hotspotLogs.reduce((sum, log) => sum + log.count, 0);

        const matrixMap: Record<string, { count: number, area: number, personnel: number }> = {};
        settings.categories.forEach(c => {
            matrixMap[c.id] = { count: 0, area: 0, personnel: 0 };
        });

        const timelineMap: Record<string, { activityCount: number, satelliteHotspots: number }> = {};

        activities.forEach(a => {
            if (a.category === 'FIREFIGHTING' && a.stats?.areaDamaged) {
                totalFireArea += a.stats.areaDamaged;
            }
            if (a.stats?.personnelCount) {
                totalPersonnel += a.stats.personnelCount;
            }

            if (!matrixMap[a.category]) {
                matrixMap[a.category] = { count: 0, area: 0, personnel: 0 };
            }
            matrixMap[a.category].count++;
            matrixMap[a.category].area += a.stats?.areaDamaged || 0;
            matrixMap[a.category].personnel += a.stats?.personnelCount || 0;

            const date = new Date(a.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!timelineMap[key]) {
                timelineMap[key] = { activityCount: 0, satelliteHotspots: 0 };
            }
            timelineMap[key].activityCount += 1;
        });

        hotspotLogs.forEach(h => {
            const date = new Date(h.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!timelineMap[key]) {
                timelineMap[key] = { activityCount: 0, satelliteHotspots: 0 };
            }
            timelineMap[key].satelliteHotspots += h.count;
        });

        const matrixData = Object.keys(matrixMap)
            .map(key => ({
                category: key,
                ...matrixMap[key]
            }))
            .filter(d => d.count > 0)
            .sort((a, b) => b.count - a.count);

        const monthlyData = Object.keys(timelineMap).sort().map(key => {
            const [year, month] = key.split('-');
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
            const thaiMonth = dateObj.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            return {
                name: thaiMonth,
                count: timelineMap[key].activityCount,
                hotspots: timelineMap[key].satelliteHotspots,
                fullDate: key
            };
        });

        const categoryData = matrixData.map(d => ({
            name: d.category,
            value: d.count
        }));

        // Determine risk level based on recent hotspots
        const recentHotspots = hotspotLogs.slice(0, 5).reduce((sum, h) => sum + h.count, 0);
        const riskLevel: 'low' | 'medium' | 'high' | 'active' =
            recentHotspots > 10 ? 'high' :
                recentHotspots > 5 ? 'medium' :
                    activities.length > 0 ? 'active' : 'low';

        return { totalFireArea, totalPersonnel, totalHotspots, matrixData, monthlyData, categoryData, riskLevel };
    }, [activities, hotspotLogs, settings.categories]);

    // KPI Stats Calculation
    const kpiStats = useMemo(() => {
        const kpi = settings.kpiSettings;

        // Fire Incident stats
        const preHotspot = fireIncidents.filter(i => i.responseType === FireResponseType.PRE_HOTSPOT).length;
        const postHotspot = fireIncidents.filter(i => i.responseType === FireResponseType.POST_HOTSPOT).length;
        const totalIncidents = fireIncidents.length;
        const preHotspotRate = totalIncidents > 0 ? Math.round((preHotspot / totalIncidents) * 100) : 0;

        // Hotspot comparison
        const previousYearHotspots = kpi?.previousYearHotspots || 0;
        const currentYearHotspots = stats.totalHotspots;
        const hotspotReductionTarget = kpi?.hotspotReductionTarget || 30;
        const targetHotspots = Math.round(previousYearHotspots * (1 - hotspotReductionTarget / 100));
        const hotspotProgress = previousYearHotspots > 0
            ? Math.round(((previousYearHotspots - currentYearHotspots) / previousYearHotspots) * 100)
            : 0;
        const hotspotOnTrack = currentYearHotspots <= targetHotspots;

        // Burn area comparison
        const previousYearBurnArea = kpi?.previousYearBurnArea || 0;
        const burnAreaReductionTarget = kpi?.burnAreaReductionTarget || 40;

        return {
            preHotspot,
            postHotspot,
            totalIncidents,
            preHotspotRate,
            previousYearHotspots,
            currentYearHotspots,
            hotspotReductionTarget,
            targetHotspots,
            hotspotProgress,
            hotspotOnTrack,
            previousYearBurnArea,
            burnAreaReductionTarget,
            fireSeasonYear: kpi?.fireSeasonYear || new Date().getFullYear() + 543
        };
    }, [fireIncidents, stats.totalHotspots, settings.kpiSettings]);



    return (
        <div className="p-6 md:p-8 min-h-screen" style={{ background: `linear-gradient(135deg, ${COMMAND_COLORS.background} 0%, #1e293b 50%, ${COMMAND_COLORS.background} 100%)` }}>

            {/* Command Center Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
                            <Flame className="text-orange-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                                FIRE COMMAND CENTER
                            </h2>
                            <p className="text-slate-400 text-sm">{settings.systemName} • {settings.subTitle}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowPdfExport(true)}
                        className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                        title="Print / Export PDF"
                    >
                        <TableIcon size={18} />
                    </button>
                    <LiveClock />
                    <StatusBadge level={stats.riskLevel} />
                </div>
            </header>

            {/* KPI Cards - Command Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Mission Count */}
                <div className="relative overflow-hidden rounded-2xl p-5 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
                    style={{
                        background: COMMAND_COLORS.cardBg,
                        borderColor: COMMAND_COLORS.cardBorder,
                        boxShadow: `0 0 30px ${COMMAND_COLORS.glow}`
                    }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">ภารกิจทั้งหมด</p>
                            <p className="text-3xl font-bold text-white font-mono">
                                <AnimatedCounter value={activities.length} />
                            </p>
                            <p className="text-slate-500 text-xs mt-1">MISSIONS</p>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                            <ShieldCheck className="text-blue-400" size={24} />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400"></div>
                </div>

                {/* Fire Area */}
                <div className="relative overflow-hidden rounded-2xl p-5 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
                    style={{ background: COMMAND_COLORS.cardBg, borderColor: COMMAND_COLORS.cardBorder }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">พื้นที่เสียหาย</p>
                            <p className="text-3xl font-bold text-white font-mono">
                                <AnimatedCounter value={stats.totalFireArea} />
                            </p>
                            <p className="text-slate-500 text-xs mt-1">RAI (ไร่)</p>
                        </div>
                        <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                            <Flame className="text-red-400" size={24} />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-400"></div>
                </div>

                {/* Hotspots */}
                <div className="relative overflow-hidden rounded-2xl p-5 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
                    style={{ background: COMMAND_COLORS.cardBg, borderColor: COMMAND_COLORS.cardBorder }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Hotspot สะสม</p>
                            <p className="text-3xl font-bold text-white font-mono">
                                <AnimatedCounter value={stats.totalHotspots} />
                            </p>
                            <p className="text-slate-500 text-xs mt-1">VIIRS SATELLITE</p>
                        </div>
                        <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30">
                            <ThermometerSun className="text-orange-400" size={24} />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-yellow-400"></div>
                </div>

                {/* Personnel */}
                <div className="relative overflow-hidden rounded-2xl p-5 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
                    style={{ background: COMMAND_COLORS.cardBg, borderColor: COMMAND_COLORS.cardBorder }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">กำลังพลสะสม</p>
                            <p className="text-3xl font-bold text-white font-mono">
                                <AnimatedCounter value={stats.totalPersonnel} />
                            </p>
                            <p className="text-slate-500 text-xs mt-1">PERSONNEL</p>
                        </div>
                        <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                            <Users className="text-emerald-400" size={24} />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
                </div>
            </div>



            {/* KPI Progress Section */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Pre-Hotspot Success Rate */}
                <div className="rounded-2xl border p-5" style={{ background: COMMAND_COLORS.cardBg, borderColor: COMMAND_COLORS.cardBorder }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Target className="text-emerald-500" size={20} />
                            <h3 className="font-bold text-white text-sm">PRE-HOTSPOT SUCCESS</h3>
                        </div>
                        <span className={`text-2xl font-bold font-mono ${kpiStats.preHotspotRate >= 70 ? 'text-emerald-400' : kpiStats.preHotspotRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            {kpiStats.preHotspotRate}%
                        </span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">🟢 Pre-Hotspot: {kpiStats.preHotspot}</span>
                            <span className="text-slate-400">🟡 Post-Hotspot: {kpiStats.postHotspot}</span>
                        </div>
                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${kpiStats.preHotspotRate >= 70 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                                    kpiStats.preHotspotRate >= 50 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                                        'bg-gradient-to-r from-red-600 to-red-400'
                                    }`}
                                style={{ width: `${kpiStats.preHotspotRate}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500">พบและดับก่อน Hotspot ขึ้นดาวเทียม</p>
                    </div>
                </div>

                {/* Hotspot vs Target */}
                <div className="rounded-2xl border p-5" style={{ background: COMMAND_COLORS.cardBg, borderColor: COMMAND_COLORS.cardBorder }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="text-orange-500" size={20} />
                            <h3 className="font-bold text-white text-sm">HOTSPOT vs ปีก่อน</h3>
                        </div>
                        <span className={`text-2xl font-bold font-mono ${kpiStats.hotspotOnTrack ? 'text-emerald-400' : 'text-red-400'}`}>
                            {kpiStats.hotspotProgress > 0 ? '▼' : kpiStats.hotspotProgress < 0 ? '▲' : '='}{Math.abs(kpiStats.hotspotProgress)}%
                        </span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400">ปีก่อน: {kpiStats.previousYearHotspots} จุด</span>
                            <span className="text-white font-bold">ปัจจุบัน: {kpiStats.currentYearHotspots} จุด</span>
                        </div>
                        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${kpiStats.hotspotOnTrack ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
                                style={{ width: `${Math.min(100, kpiStats.previousYearHotspots > 0 ? (kpiStats.currentYearHotspots / kpiStats.previousYearHotspots) * 100 : 0)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>เป้าหมาย: ลด {kpiStats.hotspotReductionTarget}%</span>
                            <span>Max: {kpiStats.targetHotspots} จุด</span>
                        </div>
                    </div>
                </div>

                {/* Fire Season Status */}
                <div className="rounded-2xl border p-5" style={{ background: COMMAND_COLORS.cardBg, borderColor: COMMAND_COLORS.cardBorder }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Flame className="text-amber-500" size={20} />
                            <h3 className="font-bold text-white text-sm">ฤดูไฟ {kpiStats.fireSeasonYear}</h3>
                        </div>
                        {kpiStats.hotspotOnTrack ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/30">
                                <CheckCircle size={12} /> ON TRACK
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
                                <AlertTriangle size={12} /> EXCEEDING
                            </span>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-xs text-slate-400">เหตุไฟทั้งหมด</span>
                            <span className="text-lg font-bold text-white font-mono">{kpiStats.totalIncidents}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-xs text-slate-400">พื้นที่เผาปีนี้</span>
                            <span className="text-lg font-bold text-white font-mono">{stats.totalFireArea.toLocaleString()} ไร่</span>
                        </div>
                        <p className="text-xs text-slate-500">เป้าลดพื้นที่เผา: {kpiStats.burnAreaReductionTarget}% (จบฤดู)</p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Timeline Chart - Area */}
                <div className="lg:col-span-2 rounded-2xl border p-5"
                    style={{ background: COMMAND_COLORS.cardBg, borderColor: COMMAND_COLORS.cardBorder }}>
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-orange-500" />
                        MISSION vs HOTSPOT TIMELINE
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.monthlyData}>
                                <defs>
                                    <linearGradient id="colorMission" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorHotspot" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        color: '#f1f5f9'
                                    }}
                                />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <Area yAxisId="left" type="monotone" dataKey="count" name="ภารกิจ" stroke="#f97316" strokeWidth={2} fill="url(#colorMission)" dot={{ fill: '#f97316', r: 4 }} />
                                <Area yAxisId="right" type="monotone" dataKey="hotspots" name="Hotspot" stroke="#ef4444" strokeWidth={2} fill="url(#colorHotspot)" dot={{ fill: '#ef4444', r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Pie - Donut */}
                <div className="rounded-2xl border p-5"
                    style={{ background: COMMAND_COLORS.cardBg, borderColor: COMMAND_COLORS.cardBorder }}>
                    <h3 className="font-bold text-white text-center mb-2">MISSION DISTRIBUTION</h3>
                    <div className="h-52 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {stats.categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: '#f1f5f9'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Number */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-3xl font-bold text-white font-mono block">{activities.length}</span>
                                <span className="text-xs text-slate-500 uppercase">Total</span>
                            </div>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {stats.categoryData.slice(0, 4).map((entry, index) => (
                            <div key={index} className="flex items-center gap-1 text-xs text-slate-400">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                                <span className="truncate max-w-[80px]">{getCategoryLabel(entry.name)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Operation Matrix Table - Dark Style */}
            <div className="rounded-2xl border overflow-hidden"
                style={{ background: COMMAND_COLORS.cardBg, borderColor: COMMAND_COLORS.cardBorder }}>
                <div className="px-5 py-4 border-b flex items-center gap-3"
                    style={{ borderColor: COMMAND_COLORS.cardBorder }}>
                    <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
                        <TableIcon className="text-orange-500" size={18} />
                    </div>
                    <h3 className="font-bold text-white">OPERATION MATRIX</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
                            <tr>
                                <th className="px-5 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider">Category</th>
                                <th className="px-5 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Count</th>
                                <th className="px-5 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Area (ไร่)</th>
                                <th className="px-5 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Personnel</th>
                                <th className="px-5 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right">Share</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: COMMAND_COLORS.cardBorder }}>
                            {stats.matrixData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors" style={{ borderColor: COMMAND_COLORS.cardBorder }}>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                                            <span className="font-medium text-slate-200 text-sm">{getCategoryLabel(row.category)}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-right font-mono text-slate-300">{row.count}</td>
                                    <td className="px-5 py-3 text-right font-mono">
                                        {row.area > 0 ? (
                                            <span className="text-red-400 bg-red-500/20 px-2 py-0.5 rounded text-sm">{row.area.toLocaleString()}</span>
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-right font-mono text-slate-300">
                                        {row.personnel > 0 ? row.personnel.toLocaleString() : <span className="text-slate-600">—</span>}
                                    </td>
                                    <td className="px-5 py-3 text-right text-sm text-slate-400">
                                        {((row.count / activities.length) * 100).toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
                            <tr>
                                <td className="px-5 py-3 font-bold text-white">TOTAL</td>
                                <td className="px-5 py-3 text-right font-bold text-white font-mono">{activities.length}</td>
                                <td className="px-5 py-3 text-right font-bold text-white font-mono">{stats.totalFireArea.toLocaleString()}</td>
                                <td className="px-5 py-3 text-right font-bold text-white font-mono">{stats.totalPersonnel.toLocaleString()}</td>
                                <td className="px-5 py-3 text-right font-bold text-white">100%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>


            {/* PDF Export Modal */}
            {
                showPdfExport && (
                    <DashboardPdfExport
                        stats={stats}
                        kpiStats={kpiStats}
                        activities={activities}
                        aiAdvice={null}
                        settings={settings}
                        onClose={() => setShowPdfExport(false)}
                    />
                )
            }
        </div >
    );
};
