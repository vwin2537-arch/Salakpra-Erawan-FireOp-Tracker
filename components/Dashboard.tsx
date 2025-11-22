
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { ActivityLog, OperationalPhase, ActivityCategory, HotspotLog, AppSettings } from '../types';
import { generateStrategicAdvice } from '../services/geminiService';
import { Sparkles, TrendingUp, Flame, ShieldCheck, Users, Table as TableIcon, AlertTriangle, ThermometerSun } from 'lucide-react';

interface DashboardProps {
  activities: ActivityLog[];
  hotspotLogs: HotspotLog[]; // Add Hotspot Data
  settings: AppSettings;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#8884d8', '#82ca9d'];

export const Dashboard: React.FC<DashboardProps> = ({ activities, hotspotLogs, settings }) => {
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const getCategoryLabel = (id: string) => settings.categories.find(c => c.id === id)?.label || id;

  // Calculate Statistics
  const stats = useMemo(() => {
    let totalFireArea = 0;
    let totalPersonnel = 0;
    
    // Total Satellite Hotspots
    const totalHotspots = hotspotLogs.reduce((sum, log) => sum + log.count, 0);

    // Initialize Matrix Map
    const matrixMap: Record<string, { count: number, area: number, personnel: number }> = {};
    settings.categories.forEach(c => {
        matrixMap[c.id] = { count: 0, area: 0, personnel: 0 };
    });

    // Initialize Monthly Map
    // We need to merge activity dates and hotspot dates
    const timelineMap: Record<string, { activityCount: number, satelliteHotspots: number }> = {};

    // Process Activities
    activities.forEach(a => {
      // Global Stats
      if (a.category === 'FIREFIGHTING' && a.stats?.areaDamaged) {
        totalFireArea += a.stats.areaDamaged;
      }
      if (a.stats?.personnelCount) {
        totalPersonnel += a.stats.personnelCount;
      }

      // Matrix Stats
      if (!matrixMap[a.category]) {
         matrixMap[a.category] = { count: 0, area: 0, personnel: 0 };
      }
      matrixMap[a.category].count++;
      matrixMap[a.category].area += a.stats?.areaDamaged || 0;
      matrixMap[a.category].personnel += a.stats?.personnelCount || 0;

      // Timeline - Activity Count
      const date = new Date(a.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; 
      
      if (!timelineMap[key]) {
          timelineMap[key] = { activityCount: 0, satelliteHotspots: 0 };
      }
      timelineMap[key].activityCount += 1;
    });

    // Process Hotspots
    hotspotLogs.forEach(h => {
        const date = new Date(h.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; 
        
        if (!timelineMap[key]) {
            timelineMap[key] = { activityCount: 0, satelliteHotspots: 0 };
        }
        timelineMap[key].satelliteHotspots += h.count;
    });

    // Format Matrix Data
    const matrixData = Object.keys(matrixMap)
        .map(key => ({
            category: key,
            ...matrixMap[key]
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

    // Format Monthly Data (Timeline)
    const monthlyData = Object.keys(timelineMap).sort().map(key => {
        const [year, month] = key.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const thaiMonth = dateObj.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
        return {
            name: thaiMonth,
            count: timelineMap[key].activityCount, // "ภารกิจ"
            hotspots: timelineMap[key].satelliteHotspots, // "ดาวเทียม"
            fullDate: key
        };
    });

    // Category Pie Data
    const categoryData = matrixData.map(d => ({
      name: d.category,
      value: d.count
    }));

    return { totalFireArea, totalPersonnel, totalHotspots, matrixData, monthlyData, categoryData };
  }, [activities, hotspotLogs, settings.categories]);

  const handleGetAdvice = async () => {
    setLoadingAi(true);
    const advice = await generateStrategicAdvice(activities);
    setAiAdvice(advice);
    setLoadingAi(false);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen animate-fade-in">
      {/* Header Section */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h2 className="text-3xl font-bold text-slate-800">Dashboard ภาพรวม</h2>
            <p className="text-slate-500 mt-1">สรุปสถานการณ์และผลการปฏิบัติงานประจำปีงบประมาณ</p>
        </div>
        <button 
            onClick={handleGetAdvice}
            disabled={loadingAi}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
        >
            <Sparkles size={18} />
            {loadingAi ? 'กำลังวิเคราะห์...' : 'วิเคราะห์กลยุทธ์ด้วย AI'}
        </button>
      </header>

      {/* AI Advice Card */}
      {aiAdvice && (
        <div className="mb-8 bg-white border-l-4 border-indigo-500 p-6 rounded-r-xl shadow-sm animate-slide-up">
            <h3 className="font-bold text-indigo-800 flex items-center gap-2 mb-3">
                <Sparkles size={20} className="text-indigo-500"/> 
                ข้อแนะนำเชิงกลยุทธ์ (AI Strategic Insight)
            </h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{aiAdvice}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                <ShieldCheck size={32} />
            </div>
            <div>
                <p className="text-sm text-slate-500 mb-1">ภารกิจทั้งหมด</p>
                <p className="text-2xl font-bold text-slate-800">{activities.length}</p>
                <p className="text-xs text-slate-400">ครั้ง</p>
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-red-50 text-red-600 rounded-xl">
                <Flame size={32} />
            </div>
            <div>
                <p className="text-sm text-slate-500 mb-1">พื้นที่เสียหาย</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalFireArea.toLocaleString()}</p>
                <p className="text-xs text-slate-400">ไร่</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-orange-50 text-orange-600 rounded-xl">
                <ThermometerSun size={32} />
            </div>
            <div>
                <p className="text-sm text-slate-500 mb-1">จุด Hotspot สะสม</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalHotspots.toLocaleString()}</p>
                <p className="text-xs text-slate-400">รายงานดาวเทียม (VIIRS)</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                <Users size={32} />
            </div>
            <div>
                <p className="text-sm text-slate-500 mb-1">กำลังพล</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalPersonnel.toLocaleString()}</p>
                <p className="text-xs text-slate-400">นาย (สะสม)</p>
            </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Monthly Trend Chart (Line) - Takes 2 cols */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
            <h3 className="font-bold text-lg mb-6 text-slate-700 flex items-center gap-2">
                <TrendingUp size={20} className="text-slate-400"/>
                เปรียบเทียบภารกิจ vs จุด Hotspot (ดาวเทียม)
            </h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            style={{ fontSize: '12px', fill: '#64748b' }} 
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis 
                            yAxisId="left"
                            style={{ fontSize: '12px', fill: '#64748b' }} 
                            tickLine={false}
                            axisLine={false}
                            label={{ value: 'จำนวนภารกิจ', angle: -90, position: 'insideLeft', fill: '#f97316', fontSize: 10 }}
                        />
                        <YAxis 
                            yAxisId="right"
                            orientation="right"
                            style={{ fontSize: '12px', fill: '#64748b' }} 
                            tickLine={false}
                            axisLine={false}
                            label={{ value: 'จุด Hotspot (ดาวเทียม)', angle: 90, position: 'insideRight', fill: '#ef4444', fontSize: 10 }}
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                        />
                        <Legend verticalAlign="top" height={36}/>
                        <Line 
                            yAxisId="left"
                            type="monotone" 
                            name="จำนวนภารกิจ"
                            dataKey="count" 
                            stroke="#f97316" 
                            strokeWidth={3} 
                            dot={{ fill: '#f97316', strokeWidth: 2, r: 4, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <Line 
                            yAxisId="right"
                            type="monotone" 
                            name="จุด Hotspot (ดาวเทียม)"
                            dataKey="hotspots" 
                            stroke="#ef4444" 
                            strokeWidth={3} 
                            strokeDasharray="5 5"
                            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Category Pie Chart - Takes 1 col */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg mb-4 text-slate-700 text-center">สัดส่วนภารกิจ</h3>
            <div className="h-64 flex justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={stats.categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {stats.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <span className="text-3xl font-bold text-slate-800 block">{activities.length}</span>
                        <span className="text-xs text-slate-400">รวม</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
                 {stats.categoryData.slice(0, 4).map((entry, index) => (
                     <div key={index} className="flex items-center gap-1 text-xs text-slate-500">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                         {getCategoryLabel(entry.name)}
                     </div>
                 ))}
            </div>
        </div>
      </div>

      {/* Operation Matrix Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <TableIcon size={20} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">สรุปผลการดำเนินงานรายกิจกรรม (Operation Matrix)</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">ประเภทกิจกรรม</th>
                        <th className="px-6 py-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">จำนวนครั้ง</th>
                        <th className="px-6 py-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">พื้นที่เสียหาย (ไร่)</th>
                        <th className="px-6 py-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">กำลังพล (นาย)</th>
                        <th className="px-6 py-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">สัดส่วน (%)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {stats.matrixData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 rounded-full bg-slate-200" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                    <span className="font-medium text-slate-700">{getCategoryLabel(row.category)}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-slate-600">
                                {row.count}
                            </td>
                            <td className="px-6 py-4 text-right font-mono">
                                {row.area > 0 ? (
                                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded">{row.area.toLocaleString()}</span>
                                ) : (
                                    <span className="text-slate-300">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-slate-600">
                                {row.personnel > 0 ? row.personnel.toLocaleString() : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-slate-500">
                                {((row.count / activities.length) * 100).toFixed(1)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold text-slate-700">
                    <tr>
                        <td className="px-6 py-4">รวมทั้งสิ้น</td>
                        <td className="px-6 py-4 text-right">{activities.length}</td>
                        <td className="px-6 py-4 text-right">{stats.totalFireArea.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">{stats.totalPersonnel.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">100%</td>
                    </tr>
                </tfoot>
            </table>
        </div>
      </div>
    </div>
  );
};
