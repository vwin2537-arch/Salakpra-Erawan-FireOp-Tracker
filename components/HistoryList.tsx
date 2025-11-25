
import React, { useState, useMemo } from 'react';
import { ActivityLog, OperationalPhase, AppSettings } from '../types';
import { Search, Filter, Image as ImageIcon, X, MapPin, Pencil, Eye, Trash2, BarChart2, Calendar, Clock, ChevronDown, ListFilter } from 'lucide-react';
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
  const [filterCategory, setFilterCategory] = useState<string | null>(null); // New state for chart interaction
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const getCategoryLabel = (id: string) => settings.categories.find(c => c.id === id)?.label || id;

  // 1. Base Filter (Search + Phase) -> Used for Chart Calculation
  const baseFiltered = useMemo(() => {
    return activities.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              a.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPhase = filterPhase === 'ALL' || a.phase === filterPhase;
        return matchesSearch && matchesPhase;
    });
  }, [activities, searchTerm, filterPhase]);

  // 2. Chart Data (Derived from Base Filter)
  const chartData = useMemo(() => {
      const counts: Record<string, number> = {};
      baseFiltered.forEach(a => {
          counts[a.category] = (counts[a.category] || 0) + 1;
      });
      
      return Object.keys(counts).map(key => ({
          name: getCategoryLabel(key),
          value: counts[key],
          key: key // Keep ID for filtering
      })).sort((a, b) => b.value - a.value);
  }, [baseFiltered, settings.categories]);

  // 3. Final Display List (Base Filter + Category Filter from Chart)
  const finalFiltered = useMemo(() => {
      if (!filterCategory) return baseFiltered;
      return baseFiltered.filter(a => a.category === filterCategory);
  }, [baseFiltered, filterCategory]);

  const sorted = [...finalFiltered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16'];

  const formatDateDisplay = (start: string, end?: string) => {
      const d1 = new Date(start).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      if (end && end !== start) {
          const d2 = new Date(end).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
          return `${d1} - ${d2}`;
      }
      return d1;
  };

  // Helper to determine phase color
  const getPhaseColor = (phase: OperationalPhase) => {
      switch(phase) {
          case OperationalPhase.FIRE_SEASON: return 'text-red-500 bg-red-50 border-red-100';
          case OperationalPhase.PRE_SEASON: return 'text-emerald-500 bg-emerald-50 border-emerald-100';
          default: return 'text-blue-500 bg-blue-50 border-blue-100';
      }
  };

  const getPhaseLabel = (phase: OperationalPhase) => {
      switch(phase) {
          case OperationalPhase.FIRE_SEASON: return 'หน้าไฟ';
          case OperationalPhase.PRE_SEASON: return 'เตรียมการ';
          default: return 'หลังหน้าไฟ';
      }
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

  const handleBarClick = (data: any) => {
      if (data && data.key) {
          // Toggle filter: if clicking same category, clear filter
          setFilterCategory(prev => prev === data.key ? null : data.key);
      }
  };

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen relative font-sans pb-24 md:pb-10">
      
      {/* --- HEADER --- */}
      <div className="mb-6 flex flex-col gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Clock className="text-orange-500"/> Timeline
            </h2>
            <p className="text-slate-500 text-sm">ประวัติการดำเนินงานทั้งหมด ({baseFiltered.length})</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 group">
                <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="ค้นหากิจกรรม..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 bg-white text-slate-800 placeholder-slate-400 shadow-sm transition-all [color-scheme:light]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="relative">
                <select 
                    className="w-full h-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 appearance-none bg-white text-slate-700 text-sm font-medium shadow-sm cursor-pointer"
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
        </div>
      </div>

      {/* --- STATS CHART (Interactive) --- */}
      {chartData.length > 0 && (
        <div className="mb-8 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                    <BarChart2 size={18} className="text-orange-500" />
                    <span>สรุปภารกิจ (แตะกราฟเพื่อกรอง)</span>
                </div>
                {filterCategory && (
                    <button 
                        onClick={() => setFilterCategory(null)}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1"
                    >
                        <X size={12}/> ล้างตัวกรอง
                    </button>
                )}
            </div>
            <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={chartData} 
                        margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                    >
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        />
                        <Bar 
                            dataKey="value" 
                            radius={[4, 4, 4, 4]} 
                            barSize={20}
                            onClick={handleBarClick}
                            cursor="pointer"
                        >
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                    opacity={filterCategory && filterCategory !== entry.key ? 0.3 : 1}
                                    stroke={filterCategory === entry.key ? '#000' : 'none'}
                                    strokeWidth={filterCategory === entry.key ? 2 : 0}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            {/* Active Filter Indicator */}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
                 {chartData.slice(0, 4).map((d, i) => (
                     <button
                         key={i} 
                         onClick={() => setFilterCategory(prev => prev === d.key ? null : d.key)}
                         className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-all border
                            ${filterCategory === d.key 
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                                : filterCategory 
                                    ? 'bg-slate-50 text-slate-300 border-transparent' 
                                    : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-orange-200'
                            }`}
                     >
                         <div className={`w-2 h-2 rounded-full ${filterCategory === d.key ? 'bg-white' : ''}`} style={{ backgroundColor: filterCategory === d.key ? undefined : COLORS[i % COLORS.length] }}></div>
                         {d.name} ({d.value})
                     </button>
                 ))}
            </div>
        </div>
      )}

      {/* --- TIMELINE FEED --- */}
      <div className="relative space-y-8 pl-4 md:pl-0">
        
        {/* Active Filter Banner */}
        {filterCategory && (
            <div className="flex items-center justify-between bg-orange-50 border border-orange-100 px-4 py-2 rounded-lg mb-4 text-sm text-orange-800 animate-fade-in">
                <div className="flex items-center gap-2 font-bold">
                    <ListFilter size={16}/>
                    แสดงเฉพาะหมวดหมู่: {getCategoryLabel(filterCategory)}
                </div>
                <button onClick={() => setFilterCategory(null)} className="p-1 hover:bg-orange-100 rounded-full">
                    <X size={16}/>
                </button>
            </div>
        )}

        {/* Vertical Line for Mobile */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 md:hidden"></div>

        {sorted.map((activity, index) => {
            const images = activity.imageUrls || (activity.imageUrl ? [activity.imageUrl] : []);
            
            return (
            <div 
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className="relative group md:flex md:gap-6 cursor-pointer animate-slide-up"
            >
                {/* Timeline Dot (Mobile) */}
                <div className="absolute left-[-17px] top-6 w-3 h-3 rounded-full bg-white border-2 border-orange-400 md:hidden z-10"></div>

                {/* Date Column (Desktop) */}
                <div className="hidden md:flex flex-col items-end w-32 shrink-0 pt-1 text-right">
                     <span className="text-sm font-bold text-slate-800">{new Date(activity.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                     <span className="text-xs text-slate-400">{new Date(activity.date).toLocaleDateString('th-TH', { year: '2-digit' })}</span>
                     <span className={`mt-2 text-[10px] px-2 py-0.5 rounded-full border ${getPhaseColor(activity.phase)}`}>
                        {getPhaseLabel(activity.phase)}
                     </span>
                </div>

                {/* Card */}
                <div className="flex-1 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-orange-200 transition-all">
                    
                    {/* Header: Date (Mobile) & Title */}
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <div className="flex-1">
                             <div className="md:hidden flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-500">
                                    {formatDateDisplay(activity.date, activity.endDate)}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPhaseColor(activity.phase)}`}>
                                    {getPhaseLabel(activity.phase)}
                                </span>
                             </div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">
                                    {getCategoryLabel(activity.category)}
                                </span>
                             </div>
                             <h3 className="text-base md:text-lg font-bold text-slate-800 leading-snug group-hover:text-orange-600 transition-colors">
                                {activity.title}
                             </h3>
                        </div>
                        {/* Desktop Actions */}
                        <div className="hidden md:flex gap-1">
                             <button onClick={(e) => handleEditClick(e, activity)} className="p-1.5 text-slate-300 hover:text-indigo-600 rounded hover:bg-indigo-50"><Pencil size={16}/></button>
                             <button onClick={(e) => handleDeleteClick(e, activity.id)} className="p-1.5 text-slate-300 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={16}/></button>
                        </div>
                    </div>

                    {/* Description Preview */}
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                        {activity.description}
                    </p>

                    {/* Image Grid Preview */}
                    {images.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-hidden">
                            {images.slice(0, 4).map((img, i) => (
                                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-100 shrink-0">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                    {i === 3 && images.length > 4 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                                            +{images.length - 4}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Footer Stats */}
                    <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-50 pt-3">
                         {activity.stats?.areaDamaged && (
                             <span className="flex items-center gap-1 text-red-400"><span className="font-bold text-red-600">{activity.stats.areaDamaged}</span> ไร่</span>
                         )}
                         {activity.stats?.personnelCount && (
                             <span className="flex items-center gap-1 text-blue-400"><span className="font-bold text-blue-600">{activity.stats.personnelCount}</span> นาย</span>
                         )}
                         {activity.location?.utm && (
                             <span className="flex items-center gap-1 ml-auto"><MapPin size={12}/> {activity.location.utm}</span>
                         )}
                    </div>
                </div>
            </div>
            );
        })}

        {sorted.length === 0 && (
            <div className="text-center py-20">
                <div className="inline-flex p-4 rounded-full bg-slate-100 text-slate-300 mb-3">
                    <Search size={32} />
                </div>
                <p className="text-slate-500 font-medium">ไม่พบข้อมูลกิจกรรม</p>
                <p className="text-slate-400 text-sm">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
            </div>
        )}
      </div>

      {/* --- MOBILE BOTTOM SHEET / DESKTOP MODAL --- */}
      {selectedActivity && (
        <div 
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSelectedActivity(null)}
        >
            <div 
              className="bg-white w-full h-[85vh] md:h-auto md:max-h-[90vh] md:max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up-mobile md:animate-scale-up"
              onClick={e => e.stopPropagation()}
            >
                {/* Drag Handle (Mobile) */}
                <div className="md:hidden flex justify-center pt-3 pb-1" onClick={() => setSelectedActivity(null)}>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                </div>

                {/* Modal Header */}
                <div className="px-6 py-4 md:px-8 md:py-6 border-b border-slate-50 flex justify-between items-start bg-white shrink-0">
                    <div>
                         <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getPhaseColor(selectedActivity.phase)}`}>
                                {getPhaseLabel(selectedActivity.phase)}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">
                                {formatDateDisplay(selectedActivity.date, selectedActivity.endDate)}
                            </span>
                         </div>
                        <h2 className="text-lg md:text-2xl font-bold text-slate-800 leading-snug">
                            {selectedActivity.title}
                        </h2>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setSelectedActivity(null)}
                            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6 custom-scrollbar">
                    
                    {/* Category Badge */}
                    <div className="mb-6">
                        <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                            {getCategoryLabel(selectedActivity.category)}
                        </span>
                    </div>

                    {/* Stats Grid */}
                    {selectedActivity.stats && (selectedActivity.stats.areaDamaged || selectedActivity.stats.personnelCount) && (
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {selectedActivity.stats.areaDamaged && (
                                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-center">
                                    <p className="text-xs text-red-400 mb-1 uppercase font-bold">พื้นที่เสียหาย</p>
                                    <p className="text-xl font-bold text-red-700">{selectedActivity.stats.areaDamaged} <span className="text-xs font-normal">ไร่</span></p>
                                </div>
                            )}
                            {selectedActivity.stats.personnelCount && (
                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                                    <p className="text-xs text-blue-400 mb-1 uppercase font-bold">กำลังพล</p>
                                    <p className="text-xl font-bold text-blue-700">{selectedActivity.stats.personnelCount} <span className="text-xs font-normal">นาย</span></p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description - FIXED: break-words added */}
                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">รายละเอียด</h4>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm md:text-base break-words">
                            {selectedActivity.description}
                        </p>
                    </div>

                    {/* Gallery */}
                    {(selectedActivity.imageUrls?.length || 0) > 0 || selectedActivity.imageUrl ? (
                        <div className="space-y-3 mb-8">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">รูปภาพประกอบ</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(selectedActivity.imageUrls || [selectedActivity.imageUrl!]).map((url, index) => (
                                    <div key={index} className="rounded-2xl overflow-hidden bg-slate-100 aspect-video border border-slate-100 shadow-sm">
                                        <img src={url} alt="evidence" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {/* Location */}
                     {selectedActivity.location?.utm && (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full text-orange-500 shadow-sm"><MapPin size={18}/></div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">พิกัด UTM</p>
                                    <p className="font-mono text-sm font-bold text-slate-700">{selectedActivity.location.utm}</p>
                                </div>
                            </div>
                            {selectedActivity.location?.lat && (
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedActivity.location.lat},${selectedActivity.location.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 shadow-sm hover:text-orange-600"
                                >
                                    เปิดแผนที่
                                </a>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 flex gap-3 bg-white shrink-0 pb-8 md:pb-4">
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if(onDelete) {
                                setDeleteTargetId(selectedActivity.id);
                                setSelectedActivity(null); 
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-bold text-sm"
                    >
                        <Trash2 size={18} /> ลบ
                    </button>
                     <button
                        onClick={(e) => handleEditClick(e, selectedActivity)}
                        className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 font-bold text-sm"
                    >
                        <Pencil size={18} /> แก้ไขข้อมูล
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Unchanged) */}
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
