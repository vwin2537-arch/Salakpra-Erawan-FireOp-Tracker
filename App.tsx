
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ActivityForm } from './components/ActivityForm';
import { HistoryList } from './components/HistoryList';
import { PresentationView } from './components/PresentationView';
import { HotspotManager } from './components/HotspotManager';
import { SettingsView } from './components/SettingsView';
import { PRReportView } from './components/PRReportView';
import { FireIncidentLog } from './components/FireIncidentLog';
import { ActivityLog, OperationalPhase, HotspotLog, AppSettings, FireIncident } from './types';
import { apiService } from './services/apiService';
import { Loader, Cloud, WifiOff, Image as ImageIcon, Menu, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

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

// =============== SYNC STATUS TYPES ===============
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [editingActivity, setEditingActivity] = useState<ActivityLog | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Data States
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [hotspotLogs, setHotspotLogs] = useState<HotspotLog[]>([]);
    const [fireIncidents, setFireIncidents] = useState<FireIncident[]>([]);
    const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

    // UI States - NEW: Non-blocking sync indicator
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [syncMessage, setSyncMessage] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // =============== STALE-WHILE-REVALIDATE DATA FETCH ===============
    useEffect(() => {
        const loadData = async () => {
            setErrorMsg(null);

            // STEP 1: Load from cache IMMEDIATELY (Stale)
            const cachedActivities = apiService.getActivitiesCached();
            const cachedHotspots = apiService.getHotspotsCached();
            const cachedSettings = apiService.getSettingsCached();

            if (cachedActivities) setActivities(cachedActivities);
            if (cachedHotspots) setHotspotLogs(cachedHotspots);
            if (cachedSettings) setAppSettings(prev => ({ ...prev, ...cachedSettings }));

            // If we have cached data, hide the initial loading screen immediately
            if (cachedActivities && cachedHotspots) {
                setIsInitialLoad(false);
            }

            // STEP 2: Revalidate in background
            setSyncStatus('syncing');
            setSyncMessage('กำลังอัปเดตข้อมูลล่าสุด...');

            try {
                const [fetchedActivities, fetchedHotspots, fetchedSettings] = await Promise.all([
                    apiService.getActivities(),
                    apiService.getHotspots(),
                    apiService.getSettings()
                ]);

                // Update with fresh data
                setActivities(Array.isArray(fetchedActivities) ? fetchedActivities : []);
                setHotspotLogs(Array.isArray(fetchedHotspots) ? fetchedHotspots : []);

                if (fetchedSettings) {
                    setAppSettings(prev => ({ ...prev, ...fetchedSettings }));
                }

                setSyncStatus('success');
                setSyncMessage('ข้อมูลล่าสุดแล้ว');

                // Hide success message after 2 seconds
                setTimeout(() => setSyncStatus('idle'), 2000);
            } catch (err: any) {
                console.error("Failed to load data", err);

                // If we had cache, show as warning (data might be stale)
                if (cachedActivities || cachedHotspots) {
                    setSyncStatus('error');
                    setSyncMessage('ไม่สามารถอัปเดตข้อมูล (แสดงข้อมูลเก่า)');
                    setTimeout(() => setSyncStatus('idle'), 5000);
                } else {
                    // No cache = critical error
                    setErrorMsg(err.message || "ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้");
                }
            } finally {
                setIsInitialLoad(false);
            }
        };

        loadData();
    }, []);

    // =============== OPTIMISTIC SAVE HANDLERS ===============
    const handleSaveActivity = async (activityData: ActivityLog) => {
        const isUpdate = !!editingActivity;

        // OPTIMISTIC: Update UI immediately
        if (isUpdate) {
            setActivities(prev => prev.map(a => a.id === activityData.id ? activityData : a));
            setEditingActivity(null);
        } else {
            setActivities(prev => [activityData, ...prev]);
        }
        setActiveTab('history');

        // Background sync
        setSyncStatus('syncing');
        setSyncMessage('กำลังบันทึกลง Cloud...');

        try {
            await apiService.saveActivity(activityData, isUpdate);
            setSyncStatus('success');
            setSyncMessage('บันทึกสำเร็จ');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncMessage('บันทึกไม่สำเร็จ: ' + err.message);
            // Revert on failure
            if (isUpdate) {
                // Refetch to get original state
                apiService.getActivities().then(setActivities);
            } else {
                setActivities(prev => prev.filter(a => a.id !== activityData.id));
            }
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    };

    const handleDeleteActivity = async (id: string) => {
        // OPTIMISTIC: Remove from UI immediately
        const backup = activities.find(a => a.id === id);
        setActivities(prev => prev.filter(a => a.id !== id));

        setSyncStatus('syncing');
        setSyncMessage('กำลังลบข้อมูล...');

        try {
            await apiService.deleteActivity(id);
            setSyncStatus('success');
            setSyncMessage('ลบสำเร็จ');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncMessage('ลบไม่สำเร็จ: ' + err.message);
            // Revert on failure
            if (backup) setActivities(prev => [...prev, backup]);
            setTimeout(() => setSyncStatus('idle'), 5000);
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
        // OPTIMISTIC
        setHotspotLogs(prev => [newHotspot, ...prev]);

        setSyncStatus('syncing');
        setSyncMessage('กำลังบันทึก Hotspot...');

        try {
            await apiService.saveHotspot(newHotspot);
            setSyncStatus('success');
            setSyncMessage('บันทึก Hotspot สำเร็จ');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncMessage('บันทึก Hotspot ไม่สำเร็จ');
            setHotspotLogs(prev => prev.filter(h => h.id !== newHotspot.id));
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    };

    const handleDeleteHotspot = async (id: string) => {
        const backup = hotspotLogs.find(h => h.id === id);
        setHotspotLogs(prev => prev.filter(h => h.id !== id));

        setSyncStatus('syncing');
        setSyncMessage('กำลังลบ Hotspot...');

        try {
            await apiService.deleteHotspot(id);
            setSyncStatus('success');
            setSyncMessage('ลบ Hotspot สำเร็จ');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncMessage('ลบ Hotspot ไม่สำเร็จ');
            if (backup) setHotspotLogs(prev => [...prev, backup]);
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    };

    const handleSaveSettings = async (newSettings: AppSettings) => {
        // OPTIMISTIC
        const backup = appSettings;
        setAppSettings(newSettings);

        setSyncStatus('syncing');
        setSyncMessage('กำลังบันทึกการตั้งค่า...');

        try {
            await apiService.saveSettings(newSettings);
            setSyncStatus('success');
            setSyncMessage('บันทึกการตั้งค่าสำเร็จ');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncMessage('บันทึกการตั้งค่าไม่สำเร็จ');
            setAppSettings(backup);
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    };

    const handleFactoryReset = async () => {
        setSyncStatus('syncing');
        setSyncMessage('กำลังล้างข้อมูลระบบ...');

        try {
            await apiService.factoryReset();
            setActivities([]);
            setHotspotLogs([]);
            setAppSettings(DEFAULT_SETTINGS);
            setSyncStatus('success');
            setSyncMessage('ล้างข้อมูลระบบเรียบร้อยแล้ว');
            setActiveTab('dashboard');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncMessage('ล้างข้อมูลไม่สำเร็จ: ' + err.message);
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    };

    // =============== FIRE INCIDENT HANDLERS ===============
    const handleSaveFireIncidents = async (newIncidents: FireIncident[]) => {
        // OPTIMISTIC: Add to UI immediately
        setFireIncidents(prev => [...newIncidents, ...prev]);

        setSyncStatus('syncing');
        setSyncMessage(`กำลังบันทึก ${newIncidents.length} เหตุไฟ...`);

        try {
            // Save to localStorage for now (can integrate with API later)
            const allIncidents = [...newIncidents, ...fireIncidents];
            localStorage.setItem('fireIncidents', JSON.stringify(allIncidents));

            setSyncStatus('success');
            setSyncMessage(`บันทึก ${newIncidents.length} เหตุสำเร็จ`);
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncMessage('บันทึกไม่สำเร็จ');
            setFireIncidents(prev => prev.filter(i => !newIncidents.some(n => n.id === i.id)));
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    };

    const handleDeleteFireIncident = async (id: string) => {
        const backup = fireIncidents.find(i => i.id === id);
        setFireIncidents(prev => prev.filter(i => i.id !== id));

        setSyncStatus('syncing');
        setSyncMessage('กำลังลบเหตุไฟ...');

        try {
            const updatedIncidents = fireIncidents.filter(i => i.id !== id);
            localStorage.setItem('fireIncidents', JSON.stringify(updatedIncidents));

            setSyncStatus('success');
            setSyncMessage('ลบสำเร็จ');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncMessage('ลบไม่สำเร็จ');
            if (backup) setFireIncidents(prev => [...prev, backup]);
            setTimeout(() => setSyncStatus('idle'), 5000);
        }
    };

    // Load fire incidents from localStorage on mount
    useEffect(() => {
        const savedIncidents = localStorage.getItem('fireIncidents');
        if (savedIncidents) {
            try {
                setFireIncidents(JSON.parse(savedIncidents));
            } catch (e) {
                console.error('Failed to parse fire incidents', e);
            }
        }
    }, []);

    // Global Dark Command Center Background
    const getMainBg = () => {
        // Always use dark Command Center theme
        return 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';
    };

    // =============== SYNC STATUS INDICATOR (NON-BLOCKING) ===============
    const renderSyncIndicator = () => {
        if (syncStatus === 'idle') return null;

        const getStyles = () => {
            switch (syncStatus) {
                case 'syncing':
                    return 'bg-blue-500/90 text-white';
                case 'success':
                    return 'bg-emerald-500/90 text-white';
                case 'error':
                    return 'bg-red-500/90 text-white';
                default:
                    return 'bg-slate-500/90 text-white';
            }
        };

        const getIcon = () => {
            switch (syncStatus) {
                case 'syncing':
                    return <RefreshCw size={16} className="animate-spin" />;
                case 'success':
                    return <CheckCircle2 size={16} />;
                case 'error':
                    return <AlertCircle size={16} />;
                default:
                    return null;
            }
        };

        return (
            <div className={`fixed bottom-4 right-4 z-[100] px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2 text-sm font-medium transition-all duration-300 animate-fade-in ${getStyles()}`}>
                {getIcon()}
                <span>{syncMessage}</span>
            </div>
        );
    };

    const renderContent = () => {
        // Initial loading - only show if NO cache is available
        if (isInitialLoad && activities.length === 0 && hotspotLogs.length === 0) {
            return (
                <div className="h-screen flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Loader size={48} className="animate-spin text-orange-500" />
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
            case 'pr_report':
                return <PRReportView activities={activities} settings={appSettings} />;
            case 'fire_incident':
                return (
                    <FireIncidentLog
                        incidents={fireIncidents}
                        hotspotLogs={hotspotLogs}
                        onSave={handleSaveFireIncidents}
                        onDelete={handleDeleteFireIncident}
                    />
                );
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

                {!isInitialLoad && !errorMsg && (
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden fixed top-4 left-4 z-40 p-2.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg text-slate-700 border border-slate-200 hover:bg-white transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                )}

                {renderContent()}

                {/* NEW: Non-blocking Sync Status Indicator */}
                {renderSyncIndicator()}
            </main>
        </div>
    );
};

export default App;
