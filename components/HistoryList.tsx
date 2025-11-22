
import React, { useState, useMemo } from 'react';
import { ActivityLog, OperationalPhase, ActivityCategory, AppSettings } from '../types';
import { Search, Filter, Image as ImageIcon, X, Calendar, Tag, MapPin, ChevronRight, Download, ExternalLink, Flame, Users, ThermometerSun, Pencil, Eye, MoreVertical, BarChart2, Trash2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HistoryListProps {
  activities: ActivityLog[];
  onEdit?: (activity: ActivityLog) => void;
  onDelete?: (id: string) => void;
  settings: AppSettings;
}

export const HistoryList: React.FC<HistoryListProps> = ({ activities, onEdit, onDelete, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const getCategoryLabel = (id: string) => settings.categories.find(c => c.id === id)?.label || id;

  const filtered = activities.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhase = filterPhase === 'ALL' || a.phase === filterPhase;
    return matchesSearch && matchesPhase;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Chart Data Aggregation
  const chartData = useMemo(() => {
      const counts: Record<string, number> = {};
      filtered.forEach(a => {
          counts[a.category] = (counts[a.category] || 0) + 1;
      });
      
      return Object.keys(counts).map(key => ({
          name: getCategoryLabel(key),
          value: counts[key],
          key: key
      })).sort((a, b) => b.value - a.value); // Sort mainly by count
  }, [filtered, settings.categories]);

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16'];

  // Helper to display date or date range
  const formatDateDisplay = (start: string, end?: string) => {
      const d1 = new Date(start).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      if (end && end !== start) {
          const d2 = new Date(end).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
          return `${d1} - ${d2}`;
      }
      return d1;
  };

  const handleExportCSV = () => {
    // Define CSV header
    const header = ['StartDate', 'EndDate', 'Phase', 'Category', 'Title', 'Description', 'AreaDamaged(Rai)', 'Personnel', 'UTM Coordinates', 'Latitude', 'Longitude'];
    
    // Map data to rows
    const rows = sorted.map(a => [
        a.date,
        a.endDate || a.date,
        a.phase,
        getCategoryLabel(a.category),
        `"${a.title.replace(/"/g, '""')}"`, // Escape quotes
        `"${a.description.replace(/"/g, '""')}"`,
        a.stats?.areaDamaged || '',
        a.stats?.personnelCount || '',
        `"${a.location?.utm || ''}"`,
        a.location?.lat || '',
        a.location?.lng || ''
    ]);

    // Combine
    const csvContent = [
        header.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fireop_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditClick = (e: React.MouseEvent, activity: ActivityLog) => {
      e.stopPropagation();
      if (onEdit) {
          onEdit(activity);
          setSelectedActivity(null);
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeleteTargetId(id);
  };

  const confirmDelete = () => {
      if (deleteTargetId && onDelete) {
          onDelete(deleteTargetId);
          setDeleteTargetId(null);
      }
  };

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen relative font-sans">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ประวัติการดำเนินงาน</h2>
            <p className="text-slate-500 text-sm mt-1">รายการบันทึกภารกิจทั้งหมด ({sorted.length})</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
                <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="ค้นหา..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white text-slate-800 placeholder-slate-400 shadow-sm transition-all [color-scheme:light]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="relative">
                <select 
                    className="h-full pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 appearance-none bg-white text-slate-700 text-sm font-medium shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                    value={filterPhase}
                    onChange={(e) => setFilterPhase(e.target.value)}
                >
                    <option value="ALL">ทุกช่วงภารกิจ</option>
                    <option value={OperationalPhase.PRE_SEASON}>เตรียมการ</option>
                    <option value={OperationalPhase.FIRE_SEASON}>หน้าไฟ</option>
                    <option value={OperationalPhase.POST_SEASON}>หลังหน้าไฟ</option>
                </select>
                <Filter className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={14} />
            </div>

            <button 
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm flex items-center justify-center"
                title="Export CSV"
            >
                <Download size={18} />
            </button>
        </div>
      </div>

      {/* Cool Stats Bar Chart */}
      {sorted.length > 0 && (
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
            <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                <BarChart2 size={20} className="text-orange-500" />
                <span>สรุปภารกิจตามประเภท (Overview)</span>
            </div>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            interval={0}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            allowDecimals={false}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}

      {/* Minimal List View */}
      <div className="space-y-3">
        {sorted.map((activity) => {
            const images = activity.imageUrls || (activity.imageUrl ? [activity.imageUrl] : []);
            const isFireSeason = activity.phase === OperationalPhase.FIRE_SEASON;
            const isPreSeason = activity.phase === OperationalPhase.PRE_SEASON;

            return (
            <div 
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6"
            >
                {/* Date Column */}
                <div className="flex-shrink-0 w-full md:w-32 flex md:flex-col items-center md:items-start gap-2 md:gap-0">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {activity.phase === OperationalPhase.FIRE_SEASON ? 'หน้าไฟ' : 
                         activity.phase === OperationalPhase.PRE_SEASON ? 'เตรียมการ' : 'สรุปผล'}
                     </span>
                     <div className="text-slate-700 font-mono font-medium text-sm md:text-base">
                        {formatDateDisplay(activity.date, activity.endDate)}
                     </div>
                </div>

                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                    {images.length > 0 ? (
                        <>
                            <img src={images[0]} alt="thumb" className="w-full h-full object-cover" />
                            {images.length > 1 && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">+{images.length - 1}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon size={20} />
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                             isFireSeason ? 'bg-red-50 text-red-600 border-red-100' :
                             isPreSeason ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                             'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                            {getCategoryLabel(activity.category)}
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                        {activity.title}
                    </h3>
                    <p className="text-sm text-slate-500 truncate pr-4 opacity-80">
                        {activity.description}
                    </p>
                </div>

                {/* Action Buttons (ALWAYS VISIBLE) */}
                <div className="flex items-center gap-2 self-end md:self-center mt-2 md:mt-0">
                     <button 
                        onClick={(e) => handleEditClick(e, activity)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="แก้ไข"
                    >
                        <Pencil size={18} />
                    </button>
                    <button 
                        className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="ดูรายละเอียด"
                    >
                        <Eye size={20} />
                    </button>
                    {onDelete && (
                        <button 
                            onClick={(e) => handleDeleteClick(e, activity.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="ลบข้อมูล"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>
            );
        })}

        {sorted.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="inline-flex p-4 rounded-full bg-slate-50 text-slate-300 mb-3">
                    <Search size={32} />
                </div>
                <p className="text-slate-500 font-medium">ไม่พบข้อมูลกิจกรรม</p>
                <p className="text-slate-400 text-sm">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
            </div>
        )}
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedActivity(null)}>
            <div 
              className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-up"
              onClick={e => e.stopPropagation()}
            >
                {/* Minimal Header */}
                <div className="px-8 py-6 flex justify-between items-start bg-white shrink-0">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                            {formatDateDisplay(selectedActivity.date, selectedActivity.endDate)}
                        </span>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-snug pr-8">
                            {selectedActivity.title}
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                window.print();
                            }}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors hidden md:block print:hidden"
                            title="พิมพ์รายงาน"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        </button>
                        <button 
                            onClick={() => setSelectedActivity(null)}
                            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors print:hidden"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar print:overflow-visible">
                    
                    {/* Tags Row */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                selectedActivity.phase === OperationalPhase.FIRE_SEASON ? 'bg-red-50 text-red-600 border-red-100' :
                                selectedActivity.phase === OperationalPhase.PRE_SEASON ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                            {selectedActivity.phase === OperationalPhase.FIRE_SEASON ? 'ช่วงหน้าไฟ' :
                             selectedActivity.phase === OperationalPhase.PRE_SEASON ? 'ช่วงเตรียมการ' : 'ช่วงหลังหน้าไฟ'}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {getCategoryLabel(selectedActivity.category)}
                        </span>
                    </div>

                    {/* Stats Grid */}
                    {selectedActivity.stats && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                            {selectedActivity.stats.areaDamaged && (
                                <div className="p-3 rounded-2xl bg-red-50/50 border border-red-100">
                                    <p className="text-xs text-red-400 mb-1">พื้นที่เสียหาย</p>
                                    <p className="text-lg font-bold text-red-700">{selectedActivity.stats.areaDamaged} <span className="text-xs font-normal">ไร่</span></p>
                                </div>
                            )}
                            {selectedActivity.stats.personnelCount && (
                                <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
                                    <p className="text-xs text-blue-400 mb-1">กำลังพล</p>
                                    <p className="text-lg font-bold text-blue-700">{selectedActivity.stats.personnelCount} <span className="text-xs font-normal">นาย</span></p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <div className="mb-8">
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm md:text-base">
                            {selectedActivity.description}
                        </p>
                    </div>

                    {/* Gallery */}
                    {(selectedActivity.imageUrls?.length || 0) > 0 || selectedActivity.imageUrl ? (
                        <div className="space-y-2 mb-6">
                            <h4 className="text-sm font-bold text-slate-900">รูปภาพประกอบ</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {(selectedActivity.imageUrls || [selectedActivity.imageUrl!]).map((url, index) => (
                                    <div key={index} className="rounded-xl overflow-hidden bg-slate-100 aspect-video border border-slate-100 print:break-inside-avoid">
                                        <img src={url} alt="evidence" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 print:hover:scale-100" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {/* Location & Metadata Footer */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col gap-3 text-sm text-slate-500">
                         {selectedActivity.location?.utm && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl print:bg-transparent print:border print:border-slate-200">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-slate-400"/>
                                    <span className="font-mono text-xs">{selectedActivity.location.utm}</span>
                                </div>
                                {selectedActivity.location?.lat && (
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${selectedActivity.location.lat},${selectedActivity.location.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-orange-600 text-xs font-bold hover:underline print:hidden"
                                    >
                                        เปิดแผนที่
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                </div>
                
                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 print:hidden">
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if(onDelete) {
                                setDeleteTargetId(selectedActivity.id);
                                setSelectedActivity(null); // Close detail modal to show delete confirmation
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 border border-red-100 rounded-xl hover:bg-red-50 transition-all shadow-sm font-medium text-sm"
                    >
                        <Trash2 size={16} /> ลบข้อมูล
                    </button>
                     <button
                        onClick={(e) => handleEditClick(e, selectedActivity)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 font-medium text-sm"
                    >
                        <Pencil size={16} /> แก้ไขข้อมูล
                    </button>
                </div>
            </div>
        </div>
      )}

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
                        คุณต้องการลบรายการนี้ออกจากระบบใช่หรือไม่?
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
