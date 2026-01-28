
import React from 'react';
import { LayoutDashboard, PlusCircle, Presentation, History, TreePine, Satellite, Settings, X, Megaphone, FileText } from 'lucide-react';
import { AppSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, settings, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'hotspot', label: 'Hotspot Report', icon: <Satellite size={20} /> },
    { id: 'log', label: '+ บันทึกกิจกรรม', icon: <PlusCircle size={20} /> },
    { id: 'history', label: 'ประวัติกิจกรรม', icon: <History size={20} /> },
    { id: 'pr_report', label: 'รายงาน PR', icon: <Megaphone size={20} /> },
    { id: 'presentation', label: 'นำเสนอ', icon: <Presentation size={20} /> },
    { id: 'settings', label: 'ตั้งค่า', icon: <Settings size={20} /> },
  ];

  // Gradient Background based on theme
  const getSidebarBg = () => {
    switch (settings.themeColor) {
      case 'blue': return 'bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900';
      case 'green': return 'bg-gradient-to-b from-slate-900 via-green-900 to-slate-900';
      case 'red': return 'bg-gradient-to-b from-slate-900 via-red-900 to-slate-900';
      case 'slate': return 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900';
      default: return 'bg-gradient-to-b from-slate-900 via-orange-900 to-slate-900'; // Orange default
    }
  };

  const getActiveItemClass = () => {
    switch (settings.themeColor) {
      case 'blue': return 'bg-blue-500/20 text-blue-200 border-l-4 border-blue-500';
      case 'green': return 'bg-green-500/20 text-green-200 border-l-4 border-green-500';
      case 'red': return 'bg-red-50/20 text-red-200 border-l-4 border-red-500';
      case 'slate': return 'bg-slate-500/20 text-slate-200 border-l-4 border-slate-400';
      default: return 'bg-orange-500/20 text-orange-200 border-l-4 border-orange-500';
    }
  };

  const getLogoBgClass = () => {
    switch (settings.themeColor) {
      case 'blue': return 'bg-blue-600';
      case 'green': return 'bg-green-600';
      case 'red': return 'bg-red-600';
      case 'slate': return 'bg-slate-600';
      default: return 'bg-orange-600';
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`w-64 h-screen flex flex-col fixed left-0 top-0 shadow-2xl z-50 transition-transform duration-300 ease-in-out ${getSidebarBg()} text-white 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        <div className="p-6 flex items-center justify-between border-b border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 shadow-lg ${getLogoBgClass()}`}>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
              ) : (
                <TreePine className="text-white" size={24} />
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg leading-none truncate text-white/90">{settings.systemName}</h1>
              <span className="text-xs text-white/50 truncate block mt-1">{settings.subTitle}</span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button onClick={onClose} className="md:hidden text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose(); // Close drawer on mobile when item selected
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-lg rounded-l-sm transition-all duration-200 group ${activeTab === item.id
                  ? getActiveItemClass()
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
            >
              <div className={`transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="text-xs text-white/40 text-center">
            ระบบติดตามผลการดำเนินงาน<br />v1.0.0
          </div>
        </div>
      </div>
    </>
  );
};
