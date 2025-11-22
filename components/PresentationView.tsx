import React, { useState, useMemo } from 'react';
import { ActivityLog, OperationalPhase, AppSettings, HotspotLog } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ComposedChart, Line, Area
} from 'recharts';
import { LayoutDashboard, Filter, Calendar, ChevronDown, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface PresentationViewProps {
  activities: ActivityLog[];
  hotspotLogs: HotspotLog[];
  settings: AppSettings;
}

// Executive Palette
const COLORS = {
  tealDark: '#0f766e', // Teal 700
  tealLight: '#14b8a6', // Teal 500
  navy: '#1e293b', // Slate 800
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  bg: '#f8fafc', // Slate 50
  card: '#ffffff',
  text: '#334155', // Slate 700
};

const CHART_COLORS = ['#0f766e', '#14b8a6', '#0d9488', '#5eead4', '#1e293b', '#64748b'];

export const PresentationView: React.FC<PresentationViewProps> = ({ activities, hotspotLogs, settings }) => {
  // --- Filters ---
  const [selectedPhase, setSelectedPhase] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // --- Helper to get Labels ---
  const getCategoryLabel = (id: string) => settings.categories.find(c => c.id === id)?.label || id;

  // --- Derived Data ---
  const { filteredData, filteredHotspots, stats, prevStats, trends, charts } = useMemo(() => {
    // 1. Apply Filters
    const filtered = activities.filter(a => {
      const d = new Date(a.date);
      const matchPhase = selectedPhase === 'ALL' || a.phase === selectedPhase;
      const matchMonth = selectedMonth === 'ALL' || String(d.getMonth() + 1) === selectedMonth;
      const matchYear = selectedYear === 'ALL' || String(d.getFullYear()) === selectedYear;
      return matchPhase && matchMonth && matchYear;
    });

    const filteredH = hotspotLogs.filter(h => {
      const d = new Date(h.date);
      const matchMonth = selectedMonth === 'ALL' || String(d.getMonth() + 1) === selectedMonth;
      const matchYear = selectedYear === 'ALL' || String(d.getFullYear()) === selectedYear;
      return matchMonth && matchYear;
    });

    // 2. Current Period Stats
    const currentStats = {
        missions: filtered.length,
        area: filtered.reduce((sum, a) => sum + (a.stats?.areaDamaged || 0), 0),
        personnel: filtered.reduce((sum, a) => sum + (a.stats?.personnelCount || 0), 0),
        hotspots: filteredH.reduce((sum, h) => sum + h.count, 0)
    };

    // 3. Previous Period Stats (Simple Month-over-Month Logic if Month Selected)
    // If ALL time is selected, "Previous" doesn't make much sense, so we use 0 to show all growth or just hide.
    // For simplicity, let's try to find previous month data if a specific month is selected.
    let prevMissions = 0;
    let prevArea = 0;
    let prevPersonnel = 0;
    let prevHotspots = 0;

    if (selectedMonth !== 'ALL' && selectedYear !== 'ALL') {
        let prevM = parseInt(selectedMonth) - 1;
        let prevY = parseInt(selectedYear);
        if (prevM === 0) { prevM = 12; prevY -= 1; }
        
        const prevFiltered = activities.filter(a => {
             const d = new Date(a.date);
             return (d.getMonth() + 1) === prevM && d.getFullYear() === prevY;
        });
        const prevFilteredH = hotspotLogs.filter(h => {
            const d = new Date(h.date);
            return (d.getMonth() + 1) === prevM && d.getFullYear() === prevY;
        });

        prevMissions = prevFiltered.length;
        prevArea = prevFiltered.reduce((sum, a) => sum + (a.stats?.areaDamaged || 0), 0);
        prevPersonnel = prevFiltered.reduce((sum, a) => sum + (a.stats?.personnelCount || 0), 0);
        prevHotspots = prevFilteredH.reduce((sum, h) => sum + h.count, 0);
    }

    const calcTrend = (curr: number, prev: number) => {
        if (prev === 0) return { val: 100, dir: 'up' }; // Assume 100% growth if start from 0
        const diff = curr - prev;
        const pct = (diff / prev) * 100;
        return { val: Math.abs(pct), dir: diff >= 0 ? 'up' : 'down' };
    };

    // 4. Charts Data Preparation
    
    // Top Activities (Horizontal Bar)
    const catCounts: Record<string, number> = {};
    filtered.forEach(a => { catCounts[a.category] = (catCounts[a.category] || 0) + 1; });
    const topActivitiesData = Object.keys(catCounts)
        .map(k => ({ name: getCategoryLabel(k), value: catCounts[k] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // Damage Area Analysis (Bar)
    const areaCounts: Record<string, number> = {};
    filtered.forEach(a => { 
        if(a.stats?.areaDamaged) areaCounts[a.category] = (areaCounts[a.category] || 0) + a.stats.areaDamaged; 
    });
    const areaData = Object.keys(areaCounts)
        .map(k => ({ name: getCategoryLabel(k), value: areaCounts[k] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // Monthly Trend (Combo)
    // Aggregate by Month for the filtered view (or all time if no specific month)
    const timelineMap: Record<string, { missions: number, hotspots: number }> = {};
    
    // Helper to get key
    const getKey = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    };

    // We use ALL activities/hotspots for trend if no specific month selected, otherwise just that month (daily)
    // Let's show Yearly trend (Monthly) if Year selected or ALL.
    // If Month selected, show Daily trend.
    const showDaily = selectedMonth !== 'ALL';

    const trendSourceA = showDaily ? filtered : activities.filter(a => selectedYear === 'ALL' || String(new Date(a.date).getFullYear()) === selectedYear);
    const trendSourceH = showDaily ? filteredH : hotspotLogs.filter(h => selectedYear === 'ALL' || String(new Date(h.date).getFullYear()) === selectedYear);

    trendSourceA.forEach(a => {
        const d = new Date(a.date);
        const key = showDaily ? `${d.getDate()}` : getKey(a.date);
        if(!timelineMap[key]) timelineMap[key] = { missions: 0, hotspots: 0 };
        timelineMap[key].missions++;
    });
    trendSourceH.forEach(h => {
        const d = new Date(h.date);
        const key = showDaily ? `${d.getDate()}` : getKey(h.date);
        if(!timelineMap[key]) timelineMap[key] = { missions: 0, hotspots: 0 };
        timelineMap[key].hotspots += h.count;
    });

    let trendData = Object.keys(timelineMap).sort().map(k => ({
        name: k, // Day or YYYY-MM
        missions: timelineMap[k].missions,
        hotspots: timelineMap[k].hotspots
    }));
    
    // If Monthly, format name
    if (!showDaily) {
        trendData = trendData.sort((a,b) => a.name.localeCompare(b.name)).map(d => {
            const [y, m] = d.name.split('-');
            const date = new Date(parseInt(y), parseInt(m)-1, 1);
            return { ...d, name: date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }) };
        });
    } else {
         // Sort days numerically
         trendData.sort((a,b) => parseInt(a.name) - parseInt(b.name));
    }


    // Phase Breakdown (Donut)
    const phaseCounts: Record<string, number> = {};
    filtered.forEach(a => { phaseCounts[a.phase] = (phaseCounts[a.phase] || 0) + 1; });
    const phaseData = Object.keys(phaseCounts).map(k => {
        let name = 'เตรียมการ';
        if(k === OperationalPhase.FIRE_SEASON) name = 'หน้าไฟ';
        if(k === OperationalPhase.POST_SEASON) name = 'หลังหน้าไฟ';
        return { name, value: phaseCounts[k] };
    });

    return {
        filteredData: filtered,
        filteredHotspots: filteredH,
        stats: currentStats,
        prevStats: { missions: prevMissions, area: prevArea, personnel: prevPersonnel, hotspots: prevHotspots },
        trends: {
            missions: calcTrend(currentStats.missions, prevMissions),
            area: calcTrend(currentStats.area, prevArea),
            personnel: calcTrend(currentStats.personnel, prevPersonnel),
            hotspots: calcTrend(currentStats.hotspots, prevHotspots)
        },
        charts: { topActivitiesData, areaData, trendData, phaseData }
    };

  }, [activities, hotspotLogs, selectedPhase, selectedMonth, selectedYear, settings.categories]);


  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-700">
      
      {/* --- LEFT SIDEBAR (FILTERS) --- */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col p-6">
          <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <LayoutDashboard className="text-teal-600" />
                  Executive View
              </h2>
              <p className="text-xs text-slate-400 mt-1">Salakpra-Erawan FireOp</p>
          </div>

          <div className="space-y-6">
              {/* Year Filter */}
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Year</label>
                  <div className="relative">
                      <select 
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                      >
                          <option value="ALL">All Years</option>
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16}/>
                  </div>
              </div>

              {/* Month Filter */}
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Month</label>
                  <div className="relative">
                      <select 
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                      >
                          <option value="ALL">All Months</option>
                          {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                              <option key={m} value={String(m)}>{new Date(2000, m-1, 1).toLocaleDateString('th-TH', { month: 'long' })}</option>
                          ))}
                      </select>
                      <Calendar className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16}/>
                  </div>
              </div>

              {/* Phase Filter */}
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Phase</label>
                  <div className="relative">
                      <select 
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                        value={selectedPhase}
                        onChange={e => setSelectedPhase(e.target.value)}
                      >
                          <option value="ALL">All Phases</option>
                          <option value={OperationalPhase.PRE_SEASON}>เตรียมการ (Pre-Season)</option>
                          <option value={OperationalPhase.FIRE_SEASON}>หน้าไฟ (Fire Season)</option>
                          <option value={OperationalPhase.POST_SEASON}>หลังหน้าไฟ (Post-Season)</option>
                      </select>
                      <Filter className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16}/>
                  </div>
              </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100">
              <div className="bg-teal-50 p-4 rounded-xl">
                  <p className="text-xs text-teal-800 font-bold mb-1">System Status</p>
                  <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                      <span className="text-xs text-teal-600">Data Synced</span>
                  </div>
              </div>
          </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0">
          {/* Top Red Line Accent */}
          <div className="h-1.5 bg-gradient-to-r from-red-600 to-teal-700 w-full"></div>

          <div className="p-8 overflow-y-auto custom-scrollbar">
              {/* Title Header */}
              <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-900">Operational Overview</h1>
                  <p className="text-slate-500 mt-1">รายงานสรุปผลการปฏิบัติงานและสถานการณ์ไฟป่า</p>
              </div>

              {/* KPI CARDS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <KPICard 
                    title="Total Missions" 
                    value={stats.missions} 
                    unit="ภารกิจ"
                    trend={trends.missions}
                    subText="MoM Comparison"
                  />
                  <KPICard 
                    title="Burned Area" 
                    value={stats.area} 
                    unit="ไร่"
                    isRed={true}
                    trend={trends.area}
                    subText="MoM Comparison"
                  />
                  <KPICard 
                    title="Hotspots (Satellite)" 
                    value={stats.hotspots} 
                    unit="จุด"
                    isRed={true}
                    trend={trends.hotspots}
                    subText="MoM Comparison"
                  />
                  <KPICard 
                    title="Personnel Deployed" 
                    value={stats.personnel} 
                    unit="นาย"
                    trend={trends.personnel}
                    subText="Cumulative"
                  />
              </div>

              {/* CHARTS ROW 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Top Activities */}
                  <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-6 border-l-4 border-teal-600 pl-3">Top Activities (ภารกิจหลัก)</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart layout="vertical" data={charts.topActivitiesData} margin={{ left: 40 }}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                                  <XAxis type="number" hide />
                                  <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    tick={{ fontSize: 11, fill: '#475569' }} 
                                    width={100}
                                  />
                                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}/>
                                  <Bar dataKey="value" fill={COLORS.tealDark} barSize={20} radius={[0, 4, 4, 0]}>
                                      {charts.topActivitiesData.map((entry, index) => (
                                          <Cell key={index} fill={index === 0 ? COLORS.navy : COLORS.tealDark} />
                                      ))}
                                  </Bar>
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  {/* Damaged Area Analysis */}
                  <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-6 border-l-4 border-red-500 pl-3">Damage Analysis (พื้นที่เสียหายแยกตามประเภท)</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={charts.areaData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} height={40}/>
                                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}/>
                                  <Bar dataKey="value" fill={COLORS.red} barSize={40} radius={[4, 4, 0, 0]} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* CHARTS ROW 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Monthly Trend */}
                   <div className="lg:col-span-2 bg-white p-6 rounded-sm shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-slate-800 border-l-4 border-yellow-500 pl-3">Operational Trend</h3>
                          <div className="flex gap-4 text-xs">
                              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-200 rounded-sm"></span> Missions</div>
                              <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Hotspots</div>
                          </div>
                      </div>
                      <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={charts.trendData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                                  <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11, fill: '#475569' }} />
                                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#ef4444' }} />
                                  <Tooltip contentStyle={{borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}/>
                                  <Bar yAxisId="left" dataKey="missions" fill="#cbd5e1" barSize={30} radius={[4, 4, 0, 0]} />
                                  <Line yAxisId="right" type="monotone" dataKey="hotspots" stroke={COLORS.red} strokeWidth={3} dot={{r: 4, fill: COLORS.red, stroke: '#fff'}} />
                              </ComposedChart>
                          </ResponsiveContainer>
                      </div>
                   </div>

                   {/* Phase Breakdown */}
                   <div className="lg:col-span-1 bg-white p-6 rounded-sm shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-6 border-l-4 border-teal-600 pl-3">Phase Breakdown</h3>
                      <div className="h-56 relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                    data={charts.phaseData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                  >
                                      {charts.phaseData.map((entry, index) => (
                                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="text-3xl font-bold text-slate-800 block">{stats.missions}</span>
                                    <span className="text-xs text-slate-400 uppercase">Total</span>
                                </div>
                          </div>
                      </div>
                      <div className="mt-4 space-y-2">
                          {charts.phaseData.map((entry, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2">
                                      <span className="w-3 h-3 rounded-full" style={{backgroundColor: CHART_COLORS[index % CHART_COLORS.length]}}></span>
                                      <span className="text-slate-600">{entry.name}</span>
                                  </div>
                                  <span className="font-bold text-slate-800">{entry.value}</span>
                              </div>
                          ))}
                      </div>
                   </div>
              </div>
          </div>
      </div>
    </div>
  );
};

// --- KPI CARD COMPONENT ---
const KPICard = ({ title, value, unit, isRed, trend, subText }: any) => {
    const isTrendUp = trend.dir === 'up';
    const trendColor = isRed 
        ? (isTrendUp ? 'text-red-600' : 'text-green-600') // For bad things (Hotspots), Up is bad (Red)
        : (isTrendUp ? 'text-green-600' : 'text-red-600'); // For good things (Missions), Up is good (Green) - debatable for work load, but let's assume activity is good.

    return (
        <div className="bg-white p-6 rounded-sm shadow-sm border border-slate-200 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${isRed ? 'bg-red-500' : 'bg-teal-600'}`}></div>
            <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">{title}</h4>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-800">{value.toLocaleString()}</span>
                    <span className="text-xs text-slate-400 font-medium">{unit}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                {trend.val !== 0 && (
                    <span className={`flex items-center text-xs font-bold ${trendColor}`}>
                        {isTrendUp ? <ArrowUp size={12}/> : <ArrowDown size={12}/>} 
                        {trend.val.toFixed(1)}%
                    </span>
                )}
                {trend.val === 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><Minus size={12}/> 0%</span>}
                <span className="text-[10px] text-slate-400 uppercase">{subText}</span>
            </div>
        </div>
    );
};