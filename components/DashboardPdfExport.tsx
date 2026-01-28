
import React, { useRef } from 'react';
import { AppSettings, ActivityLog, HotspotLog, FireIncident, FireResponseType } from '../types';
import { FileDown, Printer, ShieldCheck, Flame, ThermometerSun, Users, Target, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface DashboardPdfExportProps {
    stats: {
        totalFireArea: number;
        totalPersonnel: number;
        totalHotspots: number;
        riskLevel: 'low' | 'medium' | 'high' | 'active';
    };
    kpiStats: {
        preHotspotRate: number;
        preHotspot: number;
        postHotspot: number;
        totalIncidents: number;
        hotspotProgress: number;
        hotspotOnTrack: boolean;
        previousYearHotspots: number;
        currentYearHotspots: number;
        hotspotReductionTarget: number;
        burnAreaReductionTarget: number;
        fireSeasonYear: number;
        previousYearBurnArea?: number;
        targetHotspots?: number;
    };
    activities: ActivityLog[];
    aiAdvice: string | null;
    settings: AppSettings;
    onClose: () => void;
}

export const DashboardPdfExport: React.FC<DashboardPdfExportProps> = ({
    stats,
    kpiStats,
    activities = [],
    aiAdvice,
    settings,
    onClose
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    // Safety checks
    if (!stats || !kpiStats || !settings) {
        console.error("Missing required props for DashboardPdfExport");
        return null;
    }

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '', 'width=900,height=700');
        if (!printWindow) {
            alert('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต Popup');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Situation Report - ${settings.systemName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
                    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Sarabun', sans-serif; 
                        padding: 0;
                        color: #1e293b;
                        background: white;
                    }
                    .page-container {
                        max-width: 210mm;
                        margin: 0 auto;
                        padding: 20mm;
                    }
                    .header { 
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 24px;
                        border-bottom: 3px solid #f97316;
                        padding-bottom: 16px;
                    }
                    .brand h1 { 
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 24px; 
                        color: #0f172a;
                        text-transform: uppercase;
                        letter-spacing: -0.5px;
                    }
                    .brand p { 
                        font-size: 14px; 
                        color: #64748b;
                    }
                    .meta {
                        text-align: right;
                        font-size: 12px;
                        color: #64748b;
                    }
                    .badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 99px;
                        font-weight: bold;
                        font-size: 12px;
                        text-transform: uppercase;
                    }
                    .badge.active { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74; }
                    .badge.high { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
                    .badge.medium { background: #fefce8; color: #ca8a04; border: 1px solid #fde047; }
                    .badge.low { background: #ecfdf5; color: #059669; border: 1px solid #6ee7b7; }

                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 12px;
                        margin-bottom: 24px;
                    }
                    .stat-card {
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 16px;
                        text-align: center;
                        background: #f8fafc;
                    }
                    .stat-card .value {
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 32px;
                        font-weight: bold;
                        color: #0f172a;
                    }
                    .stat-card .label {
                        font-size: 11px;
                        color: #64748b;
                        text-transform: uppercase;
                        font-weight: 600;
                        margin-top: 4px;
                    }

                    .section-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: #334155;
                        margin-bottom: 16px;
                        margin-top: 24px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        border-left: 4px solid #f97316;
                        padding-left: 12px;
                    }

                    .kpi-row {
                        display: flex;
                        gap: 16px;
                        margin-bottom: 24px;
                    }
                    .kpi-box {
                        flex: 1;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 16px;
                    }
                    .kpi-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 12px;
                        font-size: 14px;
                        font-weight: 600;
                        color: #475569;
                    }
                    .kpi-value {
                        font-size: 24px;
                        font-weight: bold;
                        font-family: 'JetBrains Mono', monospace;
                    }
                    .text-green { color: #16a34a; }
                    .text-red { color: #dc2626; }
                    .text-amber { color: #d97706; }
                    
                    .ai-box {
                        background: #f1f5f9;
                        border-radius: 8px;
                        padding: 20px;
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 12px;
                        color: #334155;
                        line-height: 1.6;
                        border-left: 4px solid #6366f1;
                    }

                    .footer {
                        margin-top: 40px;
                        padding-top: 16px;
                        border-top: 1px solid #e2e8f0;
                        font-size: 10px;
                        color: #94a3b8;
                        text-align: center;
                        display: flex;
                        justify-content: space-between;
                    }

                    @media print {
                        body { padding: 0; background: white; }
                        .no-print { display: none; }
                        @page { margin: 0; size: A4; }
                        .page-container { width: 100%; max-width: none; padding: 1.5cm; }
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                    ${printContent.innerHTML}
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const riskLabel = {
        low: 'Low Risk',
        medium: 'Moderate',
        high: 'High Alert',
        active: 'Active Fire'
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="bg-slate-800 p-4 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <Printer className="text-orange-400" size={24} />
                        <div>
                            <h2 className="text-white font-bold">Situation Report</h2>
                            <p className="text-slate-400 text-sm">รายงานสรุปสถานการณ์ประจำวัน</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-orange-600 transition-colors shadow-lg"
                        >
                            <Printer size={18} />
                            Print Report
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-600 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Print Content Preview */}
                <div className="bg-slate-100 p-8 max-h-[75vh] overflow-y-auto">
                    <div ref={printRef} className="bg-white p-[20mm] shadow-sm mx-auto max-w-[210mm] min-h-[297mm]">
                        {/* Report Header */}
                        <div className="header">
                            <div className="brand">
                                <h1>FIRE COMMAND CENTER</h1>
                                <p>{settings.systemName} • {settings.subTitle}</p>
                            </div>
                            <div className="meta">
                                <div>REPORT DATE: {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                <div>TIME: {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                                <div style={{ marginTop: '8px' }}>
                                    <span className={`badge ${stats.riskLevel}`}>
                                        STATUS: {riskLabel[stats.riskLevel]}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Top Stats */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="value">{activities.length}</div>
                                <div className="label">MISSIONS</div>
                            </div>
                            <div className="stat-card">
                                <div className="value">{stats.totalFireArea.toLocaleString()}</div>
                                <div className="label">AREA (RAI)</div>
                            </div>
                            <div className="stat-card">
                                <div className="value">{stats.totalHotspots.toLocaleString()}</div>
                                <div className="label">HOTSPOTS</div>
                            </div>
                            <div className="stat-card">
                                <div className="value">{stats.totalPersonnel.toLocaleString()}</div>
                                <div className="label">PERSONNEL</div>
                            </div>
                        </div>

                        {/* KPI Progress Section */}
                        <h3 className="section-title">PERFORMANCE INDICATORS</h3>
                        <div className="kpi-row">
                            <div className="kpi-box">
                                <div className="kpi-header">
                                    <span>PRE-HOTSPOT SUCCESS</span>
                                    <span>Goal: 70%+</span>
                                </div>
                                <div className={`kpi-value ${kpiStats.preHotspotRate >= 50 ? 'text-green' : 'text-amber'}`}>
                                    {kpiStats.preHotspotRate}%
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    Pre: {kpiStats.preHotspot} | Post: {kpiStats.postHotspot}
                                </div>
                            </div>
                            <div className="kpi-box">
                                <div className="kpi-header">
                                    <span>HOTSPOT REDUCTION</span>
                                    <span>Target: -{kpiStats.hotspotReductionTarget}%</span>
                                </div>
                                <div className={`kpi-value ${kpiStats.hotspotOnTrack ? 'text-green' : 'text-red'}`}>
                                    {kpiStats.hotspotProgress > 0 ? '▼' : '▲'}{Math.abs(kpiStats.hotspotProgress)}%
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    Current: {kpiStats.currentYearHotspots} | Prev Year: {kpiStats.previousYearHotspots}
                                </div>
                            </div>
                            <div className="kpi-box">
                                <div className="kpi-header">
                                    <span>FIRE SEASON {kpiStats.fireSeasonYear}</span>
                                    <span>{kpiStats.hotspotOnTrack ? 'ON TRACK' : 'EXCEEDING'}</span>
                                </div>
                                <div className="kpi-value">
                                    {kpiStats.totalIncidents} INCIDENTS
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    Burn Area Target Reduction: {kpiStats.burnAreaReductionTarget}%
                                </div>
                            </div>
                        </div>

                        {/* AI Strategic Advice */}
                        <h3 className="section-title">AI STRATEGIC ANALYSIS</h3>
                        <div className="ai-box">
                            {aiAdvice || "No analysis data available at this time. Run AI Analysis on dashboard to generate strategic insights."}
                        </div>

                        {/* Recent Activity Table (Optional - simplified for print) */}
                        <h3 className="section-title">RECENT ACTIVITIES (LAST 5)</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                    <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>DATE</th>
                                    <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>CATEGORY</th>
                                    <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>DETAIL</th>
                                    <th style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>METRICS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.slice(0, 5).map((act, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px' }}>{new Date(act.date).toLocaleDateString('th-TH')}</td>
                                        <td style={{ padding: '8px' }}>
                                            <span style={{
                                                background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0',
                                                fontSize: '10px', textTransform: 'uppercase', fontWeight: 600
                                            }}>
                                                {settings.categories?.find(c => c.id === act.category)?.label || act.category}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px' }}>{act.details.substring(0, 50)}...</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                                            {act.stats?.areaDamaged > 0 && `${act.stats.areaDamaged} rai`}
                                            {act.stats?.personnelCount > 0 && ` | ${act.stats.personnelCount} ppl`}
                                        </td>
                                    </tr>
                                ))}
                                {activities.length === 0 && (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No activity records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Signatures / Footer Area */}
                        <div className="footer">
                            <div>
                                System Generated Report<br />
                                ID: {Date.now().toString(36).toUpperCase()}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                Authorized Signature:<br /><br />
                                __________________________
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
