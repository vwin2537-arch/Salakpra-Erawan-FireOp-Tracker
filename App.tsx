
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ActivityForm } from './components/ActivityForm';
import { HistoryList } from './components/HistoryList';
import { PresentationView } from './components/PresentationView';
import { HotspotManager } from './components/HotspotManager';
import { SettingsView } from './components/SettingsView';
import { ActivityLog, OperationalPhase, HotspotLog, AppSettings } from './types';
import { apiService } from './services/apiService';
import { Loader, Cloud, WifiOff, Image as ImageIcon, Menu } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
    systemName: 'สถานีไฟป่า',
    subTitle: 'สลักพระ-เอราวัณ',
    logoUrl: '',
    themeColor: 'orange',
    categories: [
        { id: 'MAINTENANCE', label: 'ซ่อมบำรุง/เตรียมอุปกรณ์' },
        { id: 'PR', label: 'ประชาสัมพันธ์' },
        { id: 'MANPOWER', label: 'เตรียมกำลังพล' },
        { id: 'FIREBREAK', label: 'ทำแนวกันไฟ' },
        { id: 'PRESCRIBED_BURN', label: 'ชิงเผา (วิชาการ)' },
        { id: 'FIREFIGHTING', label: 'เข้าดับไฟป่า' },
        { id: 'JOINT_OPS', label: 'บูรณาการร่วม (สนธิกำลัง)' },
        { id: 'COMMUNITY', label: 'ปฏิสัมพันธ์ชุมชน' },
        { id: 'LESSON_LEARNED', label: 'ถอดบทเรียน' }
    ]
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingActivity, setEditingActivity] = useState<ActivityLog | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data States
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [hotspotLogs, setHotspotLogs] = useState<HotspotLog[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // INITIAL DATA FETCH
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            // Fetch data in parallel
            const [fetchedActivities, fetchedHotspots, fetchedSettings] = await Promise.all([
                apiService.getActivities(),
                apiService.getHotspots(),
                apiService.getSettings()
            ]);

            // Ensure arrays (API might return null/error if sheet empty)
            setActivities(Array.isArray(fetchedActivities) ? fetchedActivities : []);
            setHotspotLogs(Array.isArray(fetchedHotspots) ? fetchedHotspots : []);
            
            if (fetchedSettings) {
                // Merge defaults with fetched to ensure categories exist
                setAppSettings(prev => ({ ...prev, ...fetchedSettings }));
            }
        } catch (err: any) {
            console.error("Failed to load data", err);
            // Show specific error message if possible
            setErrorMsg(err.message || "ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้");
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, []);

  const handleSaveActivity = async (activityData: ActivityLog) => {
    setIsSyncing(true);
    try {
        const isUpdate = !!editingActivity;
        await apiService.saveActivity(activityData, isUpdate);
        
        // Optimistic Update (Refresh UI immediately)
        if (isUpdate) {
            setActivities(prev => prev.map(a => a.id === activityData.id ? activityData : a));
            setEditingActivity(null);
        } else {
            setActivities(prev => [activityData, ...prev]);
        }
        
        setActiveTab('history');
    } catch (err: any) {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
      setIsSyncing(true);
      try {
          await apiService.deleteActivity(id);
          setActivities(prev => prev.filter(a => a.id !== id));
      } catch (err: any) {
          alert('ลบข้อมูลไม่สำเร็จ: ' + err.message);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleEditRequest = (activity: ActivityLog) => {
      setEditingActivity(activity);
      setActiveTab('log');
  };

  const handleCancelEdit = () => {
      setEditingActivity(null);
      setActiveTab('history');
  };

  const handleSaveHotspot = async (newHotspot: HotspotLog) => {
      setIsSyncing(true);
      try {
          await apiService.saveHotspot(newHotspot);
          setHotspotLogs(prev => [newHotspot, ...prev]);
      } catch (err: any) {
          alert('บันทึก Hotspot ไม่สำเร็จ: ' + err.message);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleDeleteHotspot = async (id: string) => {
      setIsSyncing(true);
      try {
          await apiService.deleteHotspot(id);
          setHotspotLogs(prev => prev.filter(h => h.id !== id));
      } catch (err: any) {
          alert('ลบข้อมูลไม่สำเร็จ: ' + err.message);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
      setIsSyncing(true);
      try {
          await apiService.saveSettings(newSettings);
          setAppSettings(newSettings);
      } catch (err: any) {
          alert('บันทึกการตั้งค่าไม่สำเร็จ: ' + err.message);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleFactoryReset = async () => {
      // Confirm is handled in SettingsView with PIN
      setIsSyncing(true);
      try {
          await apiService.factoryReset();
          setActivities([]);
          setHotspotLogs([]);
          setAppSettings(DEFAULT_SETTINGS);
          alert('ล้างข้อมูลระบบเรียบร้อยแล้ว');
          setActiveTab('dashboard');
      } catch (err: any) {
          alert('ล้างข้อมูลไม่สำเร็จ: ' + err.message);
      } finally {
          setIsSyncing(false);
      }
  };

  // Get main background style based on theme
  const getMainBg = () => {
    switch(appSettings.themeColor) {
        case 'blue': return 'bg-blue-50/30';
        case 'green': return 'bg-green-50/30';
        case 'red': return 'bg-red-50/30';
        case 'slate': return 'bg-slate-50/30';
        default: return 'bg-orange-50/30';
    }
  };

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader size={48} className="animate-spin text-orange-500"/>
                <p className="animate-pulse">กำลังเชื่อมต่อฐานข้อมูล...</p>
                <p className="text-xs text-slate-300">Google Sheets API</p>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-red-500 gap-4 p-8 text-center">
                <div className="p-4 bg-red-50 rounded-full">
                    <WifiOff size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-700">การเชื่อมต่อล้มเหลว</h3>
                <div className="bg-slate-100 p-4 rounded-lg max-w-md overflow-auto">
                    <p className="text-sm font-mono text-red-600 break-all">{errorMsg}</p>
                </div>
                <div className="text-slate-500 text-sm space-y-1">
                    <p>สาเหตุที่เป็นไปได้:</p>
                    <ul className="list-disc list-inside text-xs text-slate-400">
                        <li>คุณลืมตั้งค่าสิทธิ์ Deployment เป็น <b>"Anyone (ทุกคน)"</b></li>
                        <li>URL ของ Google Apps Script ผิดพลาด</li>
                        <li>เบราว์เซอร์บล็อกการเชื่อมต่อ (CORS)</li>
                    </ul>
                </div>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-lg">
                    ลองเชื่อมต่อใหม่
                </button>
            </div>
        );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard activities={activities} hotspotLogs={hotspotLogs} settings={appSettings} />;
      case 'hotspot':
        return <HotspotManager logs={hotspotLogs} onSave={handleSaveHotspot} onDelete={handleDeleteHotspot} />;
      case 'log':
        return (
            <ActivityForm 
                onSave={handleSaveActivity} 
                initialData={editingActivity}
                onCancel={handleCancelEdit}
                settings={appSettings}
            />
        );
      case 'history':
        return (
            <HistoryList 
                activities={activities} 
                onEdit={handleEditRequest} 
                onDelete={handleDeleteActivity}
                settings={appSettings} 
            />
        );
      case 'presentation':
        return <PresentationView activities={activities} hotspotLogs={hotspotLogs} settings={appSettings} />;
      case 'settings':
        return (
            <SettingsView 
                settings={appSettings} 
                onSave={handleSaveSettings} 
                existingActivities={activities}
                onFactoryReset={handleFactoryReset}
            />
        );
      default:
        return <Dashboard activities={activities} hotspotLogs={hotspotLogs} settings={appSettings} />;
    }
  };

  return (
    <div className="flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        settings={appSettings}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className={`w-full min-h-screen transition-colors duration-500 ${getMainBg()} relative md:ml-64`}>
        
        {!isLoading && !errorMsg && (
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden fixed top-4 left-4 z-40 p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg text-slate-700 border border-slate-200 hover:bg-white transition-colors"
            >
                <Menu size={24} />
            </button>
        )}

        {renderContent()}
        
        {/* Syncing Overlay */}
        {isSyncing && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[200] flex items-center justify-center">
                <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 animate-scale-up max-w-sm w-full text-center">
                    <div className="relative">
                        <Cloud className="text-blue-500 animate-bounce" size={40} />
                        <ImageIcon className="text-blue-400 absolute -bottom-1 -right-1 animate-pulse" size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-700 text-lg">กำลังบันทึกลงโฟลเดอร์ Picture...</p>
                        <p className="text-sm text-slate-500 mt-1">
                            ระบบกำลังสร้างโฟลเดอร์แยกตามชื่อเรื่อง<br/>
                            และอัปโหลดรูปภาพเข้า Drive<br/>
                            <span className="text-xs text-slate-400">(อาจใช้เวลาสักครู่เพื่อจัดระเบียบไฟล์)</span>
                        </p>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500 animate-progress-indeterminate"></div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
