
import React, { useState, useMemo } from 'react';
import { HotspotLog } from '../types';
import { Save, Satellite, Clock, Trash2, Flame, Calendar, TrendingUp, AlertTriangle, Map, TreePine } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface HotspotManagerProps {
  logs: HotspotLog[];
  onSave: (log: HotspotLog) => void;
  onDelete: (id: string) => void;
}

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
      count: Number(formData.erawanCount) + Number(formData.salakpraCount), // Auto Sum
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

  // Helper to normalize round display (handle potential data inconsistencies from Sheet)
  const normalizeRound = (val: any) => {
    const str = String(val);
    if (str.includes('14') || str.includes('PM') || str.includes('บ่าย')) return '14:00';
    if (str.includes('02') || str.includes('AM') || str.includes('เช้า') || str.includes('2:')) return '02:00';
    return str;
  };

  // Statistics Calculation
  const stats = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      let todayCount = 0;
      let monthCount = 0;
      let totalCount = 0;

      // Chart Data (Last 14 days)
      const dailyMap: Record<string, { erawan: number, salakpra: number }> = {};
      // Initialize last 14 days with 0
      for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          dailyMap[key] = { erawan: 0, salakpra: 0 };
      }

      logs.forEach(log => {
          const logTotal = (log.erawanCount || 0) + (log.salakpraCount || 0) || log.count; // Fallback for legacy
          
          totalCount += logTotal;
          if (log.date === today) todayCount += logTotal;
          
          const logDate = new Date(log.date);
          if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
              monthCount += logTotal;
          }

          // Fill chart data
          if (dailyMap[log.date]) {
              dailyMap[log.date].erawan += (log.erawanCount || 0);
              dailyMap[log.date].salakpra += (log.salakpraCount || 0);
              // Handle legacy data where split is missing but count exists (assume split evenly or dump to one? Let's just use existing props)
              if (!log.erawanCount && !log.salakpraCount && log.count > 0) {
                   // Legacy data fallback
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
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-red-700 to-orange-800 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Satellite size={32} className="text-white" />
              </div>
              <div>
                  <h2 className="text-2xl font-bold">รายงานจุดความร้อน (Hotspot)</h2>
                  <p className="text-red-100 opacity-90">แยกตามพื้นที่รับผิดชอบ (เอราวัณ - สลักพระ)</p>
              </div>
          </div>
          <div className="hidden md:block text-right">
             <p className="text-xs opacity-75">อัปเดตล่าสุด</p>
             <p className="font-mono text-lg font-bold">{new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
          </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600"><Flame size={28}/></div>
              <div>
                  <p className="text-sm text-slate-500">พบวันนี้ (Today)</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.todayCount}</p>
                  <p className="text-xs text-slate-400">จุด</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-xl text-orange-600"><Calendar size={28}/></div>
              <div>
                  <p className="text-sm text-slate-500">เดือนนี้ (This Month)</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.monthCount}</p>
                  <p className="text-xs text-slate-400">จุดสะสม</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-600"><TrendingUp size={28}/></div>
              <div>
                  <p className="text-sm text-slate-500">รวมทั้งปี (Total)</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.totalCount}</p>
                  <p className="text-xs text-slate-400">จุดสะสม</p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-slate-400"/> สถิติ Hotspot รายวัน (แยกพื้นที่)
              </h3>
              <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#64748b', fontSize: 12}} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#64748b', fontSize: 12}}
                          />
                          <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                          <Bar dataKey="erawan" name="อช.เอราวัณ" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                          <Bar dataKey="salakpra" name="ขสป.สลักพระ" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Form Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="mb-4 flex items-center gap-2 text-red-700 font-bold border-b border-red-50 pb-2">
                  <AlertTriangle size={20}/> บันทึกข้อมูลใหม่ (แยกรายพื้นที่)
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">วันที่รายงาน</label>
                      <input 
                          type="date" 
                          required
                          value={formData.date}
                          onChange={e => setFormData({...formData, date: e.target.value})}
                          className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none border bg-slate-50 text-slate-900 [color-scheme:light]"
                      />
                  </div>
                  
                  <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">รอบเวลา</label>
                      <select
                          value={formData.round}
                          onChange={e => setFormData({...formData, round: e.target.value})}
                          className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none border bg-slate-50 text-slate-900"
                      >
                          <option value="02:00">รอบเช้า (02.00 น.)</option>
                          <option value="14:00">รอบบ่าย (14.00 น.)</option>
                      </select>
                  </div>

                  {/* Area Split Inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                          <label className="block text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                             <TreePine size={12}/> อช.เอราวัณ
                          </label>
                          <input 
                              type="number" 
                              min="0"
                              value={formData.erawanCount || ''}
                              onChange={e => setFormData({...formData, erawanCount: Number(e.target.value)})}
                              placeholder="0"
                              className="w-full border-green-200 rounded-md px-2 py-1 text-center font-bold text-green-800 focus:ring-1 focus:ring-green-500 outline-none border bg-white"
                          />
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                          <label className="block text-xs font-bold text-orange-700 mb-2 flex items-center gap-1">
                             <Map size={12}/> ขสป.สลักพระ
                          </label>
                          <input 
                              type="number" 
                              min="0"
                              value={formData.salakpraCount || ''}
                              onChange={e => setFormData({...formData, salakpraCount: Number(e.target.value)})}
                              placeholder="0"
                              className="w-full border-orange-200 rounded-md px-2 py-1 text-center font-bold text-orange-800 focus:ring-1 focus:ring-orange-500 outline-none border bg-white"
                          />
                      </div>
                  </div>

                  {/* Total Display */}
                  <div className="flex justify-between items-center bg-slate-100 px-4 py-2 rounded-lg">
                      <span className="text-xs font-semibold text-slate-500">รวมทั้งสิ้น</span>
                      <span className="text-lg font-bold text-slate-800">{totalInput} จุด</span>
                  </div>

                  <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">หมายเหตุ</label>
                      <input 
                          type="text" 
                          placeholder="ระบุรายละเอียด..."
                          value={formData.remark}
                          onChange={e => setFormData({...formData, remark: e.target.value})}
                          className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none border bg-slate-50 text-slate-900"
                      />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg shadow-md hover:bg-red-700 transition-all flex justify-center items-center gap-2 mt-2 text-sm"
                  >
                    <Save size={18} /> บันทึกข้อมูล
                  </button>
              </form>
          </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-700">ประวัติการรายงานย้อนหลัง</h3>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{logs.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">วันที่</th>
                        <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">รอบเวลา</th>
                        <th className="px-6 py-3 font-semibold text-green-600 text-xs uppercase tracking-wider text-right bg-green-50/50">อช.เอราวัณ</th>
                        <th className="px-6 py-3 font-semibold text-orange-600 text-xs uppercase tracking-wider text-right bg-orange-50/50">ขสป.สลักพระ</th>
                        <th className="px-6 py-3 font-semibold text-slate-700 text-xs uppercase tracking-wider text-right">รวม (จุด)</th>
                        <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">หมายเหตุ</th>
                        <th className="px-6 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {sortedLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 text-sm font-mono text-slate-600">{new Date(log.date).toLocaleDateString('th-TH')}</td>
                            <td className="px-6 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 ${normalizeRound(log.round) === '02:00' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                    <Clock size={10} /> {normalizeRound(log.round)}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-green-700 bg-green-50/30">
                                {log.erawanCount > 0 ? log.erawanCount : '-'}
                            </td>
                             <td className="px-6 py-3 text-right font-mono text-orange-700 bg-orange-50/30">
                                {log.salakpraCount > 0 ? log.salakpraCount : '-'}
                            </td>
                            <td className="px-6 py-3 text-right font-bold text-slate-800">
                                {log.count}
                            </td>
                            <td className="px-6 py-3 text-slate-500 text-sm truncate max-w-[200px]">{log.remark || '-'}</td>
                            <td className="px-6 py-3 text-right">
                                <button 
                                    onClick={() => setDeleteTargetId(log.id)}
                                    className="text-slate-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                                    title="ลบรายการ"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {sortedLogs.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400">ยังไม่มีข้อมูลการรายงาน</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                <div className="p-6">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการลบข้อมูล?</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        คุณต้องการลบรายงาน Hotspot นี้ใช่หรือไม่?
                        <br/>การกระทำนี้ไม่สามารถเรียกคืนได้
                    </p>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                        onClick={() => setDeleteTargetId(null)}
                        className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-medium transition-colors"
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

    </div>
  );
};
