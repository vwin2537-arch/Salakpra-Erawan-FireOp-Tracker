
import React, { useRef } from 'react';
import { FireIncident, FireResponseType, HotspotLog, AppSettings } from '../types';
import { FileDown, Flame, Target, TrendingDown, Calendar, Printer } from 'lucide-react';

interface FireStatsPdfExportProps {
    fireIncidents: FireIncident[];
    hotspotLogs: HotspotLog[];
    settings: AppSettings;
    onClose: () => void;
}

export const FireStatsPdfExport: React.FC<FireStatsPdfExportProps> = ({
    fireIncidents,
    hotspotLogs,
    settings,
    onClose
}) => {
    const printRef = useRef<HTMLDivElement>(null);

    // Calculate statistics
    const kpi = settings.kpiSettings;
    const totalHotspots = hotspotLogs.reduce((sum, h) => sum + h.count, 0);
    const preHotspot = fireIncidents.filter(i => i.responseType === FireResponseType.PRE_HOTSPOT).length;
    const postHotspot = fireIncidents.filter(i => i.responseType === FireResponseType.POST_HOTSPOT).length;
    const totalIncidents = fireIncidents.length;
    const preHotspotRate = totalIncidents > 0 ? Math.round((preHotspot / totalIncidents) * 100) : 0;

    const previousYearHotspots = kpi?.previousYearHotspots || 0;
    const hotspotProgress = previousYearHotspots > 0
        ? Math.round(((previousYearHotspots - totalHotspots) / previousYearHotspots) * 100)
        : 0;

    const totalDamagedArea = fireIncidents.reduce((sum, i) => sum + (i.areaDamaged || 0), 0);
    const totalPersonnel = fireIncidents.reduce((sum, i) => sum + (i.personnelCount || 0), 0);

    // Group by month
    const monthlyStats = fireIncidents.reduce((acc, inc) => {
        const date = new Date(inc.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[key]) {
            acc[key] = { pre: 0, post: 0, total: 0, area: 0 };
        }
        if (inc.responseType === FireResponseType.PRE_HOTSPOT) {
            acc[key].pre++;
        } else {
            acc[key].post++;
        }
        acc[key].total++;
        acc[key].area += inc.areaDamaged || 0;
        return acc;
    }, {} as Record<string, { pre: number; post: number; total: number; area: number }>);

    const sortedMonths = Object.keys(monthlyStats).sort();

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) {
            alert('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต Popup');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>รายงานสถิติไฟป่า - ${settings.systemName}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; 
                        padding: 32px;
                        color: #1e293b;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 24px;
                        border-bottom: 2px solid #f97316;
                        padding-bottom: 16px;
                    }
                    .header h1 { 
                        font-size: 24px; 
                        color: #f97316;
                        margin-bottom: 4px;
                    }
                    .header p { 
                        font-size: 14px; 
                        color: #64748b;
                    }
                    .kpi-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 16px;
                        margin-bottom: 24px;
                    }
                    .kpi-card {
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 16px;
                        text-align: center;
                    }
                    .kpi-card .value {
                        font-size: 32px;
                        font-weight: bold;
                        color: #0f172a;
                    }
                    .kpi-card .label {
                        font-size: 12px;
                        color: #64748b;
                        margin-top: 4px;
                    }
                    .pre-rate { color: #22c55e; }
                    .hotspot-count { color: #f97316; }
                    h2 {
                        font-size: 16px;
                        color: #334155;
                        margin-bottom: 12px;
                        padding-bottom: 8px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 24px;
                    }
                    th, td {
                        border: 1px solid #e2e8f0;
                        padding: 8px 12px;
                        text-align: left;
                        font-size: 12px;
                    }
                    th {
                        background: #f1f5f9;
                        font-weight: bold;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .footer {
                        margin-top: 32px;
                        padding-top: 16px;
                        border-top: 1px solid #e2e8f0;
                        font-size: 10px;
                        color: #94a3b8;
                        text-align: center;
                    }
                    @media print {
                        body { padding: 0; }
                        @page { margin: 1.5cm; }
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
            </html>
        `);

        printWindow.document.close();

        // Wait for content to load then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileDown className="text-white" size={24} />
                        <div>
                            <h2 className="text-white font-bold">รายงานสถิติไฟป่า</h2>
                            <p className="text-orange-100 text-sm">พิมพ์หรือบันทึกเป็น PDF</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-white text-orange-600 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-50 transition-colors"
                        >
                            <Printer size={18} />
                            พิมพ์ / PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-orange-500/30 text-white rounded-lg font-bold hover:bg-orange-500/50 transition-colors"
                        >
                            ปิด
                        </button>
                    </div>
                </div>

                {/* Print Content Preview */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <div ref={printRef}>
                        {/* Report Header */}
                        <div className="header">
                            <h1>📊 รายงานสถิติไฟป่า ประจำปี {kpi?.fireSeasonYear || new Date().getFullYear() + 543}</h1>
                            <p>{settings.systemName} • {settings.subTitle}</p>
                            <p style={{ marginTop: '8px', fontSize: '12px' }}>
                                วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>

                        {/* KPI Summary */}
                        <div className="kpi-grid">
                            <div className="kpi-card">
                                <div className="value pre-rate">{preHotspotRate}%</div>
                                <div className="label">Pre-Hotspot Rate</div>
                            </div>
                            <div className="kpi-card">
                                <div className="value hotspot-count">{totalHotspots}</div>
                                <div className="label">Hotspot ปีนี้</div>
                            </div>
                            <div className="kpi-card">
                                <div className="value">{totalIncidents}</div>
                                <div className="label">เหตุไฟทั้งหมด</div>
                            </div>
                            <div className="kpi-card">
                                <div className="value">{totalDamagedArea.toLocaleString()}</div>
                                <div className="label">พื้นที่เผา (ไร่)</div>
                            </div>
                        </div>

                        {/* Comparison */}
                        <h2>เปรียบเทียบกับปีก่อน</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>รายการ</th>
                                    <th className="text-right">ปีก่อน</th>
                                    <th className="text-right">ปีนี้</th>
                                    <th className="text-right">เปลี่ยนแปลง</th>
                                    <th className="text-right">เป้าหมาย</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Hotspot (จุด)</td>
                                    <td className="text-right">{previousYearHotspots.toLocaleString()}</td>
                                    <td className="text-right">{totalHotspots.toLocaleString()}</td>
                                    <td className="text-right" style={{ color: hotspotProgress > 0 ? '#22c55e' : '#ef4444' }}>
                                        {hotspotProgress > 0 ? '▼' : '▲'}{Math.abs(hotspotProgress)}%
                                    </td>
                                    <td className="text-right">ลด {kpi?.hotspotReductionTarget || 30}%</td>
                                </tr>
                                <tr>
                                    <td>พื้นที่เผา (ไร่)</td>
                                    <td className="text-right">{(kpi?.previousYearBurnArea || 0).toLocaleString()}</td>
                                    <td className="text-right">{totalDamagedArea.toLocaleString()}</td>
                                    <td className="text-right">-</td>
                                    <td className="text-right">ลด {kpi?.burnAreaReductionTarget || 40}%</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Monthly Breakdown */}
                        <h2>สถิติรายเดือน</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>เดือน</th>
                                    <th className="text-center">Pre-Hotspot</th>
                                    <th className="text-center">Post-Hotspot</th>
                                    <th className="text-center">รวม</th>
                                    <th className="text-right">พื้นที่ (ไร่)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMonths.map(month => {
                                    const data = monthlyStats[month];
                                    const [year, m] = month.split('-');
                                    const dateObj = new Date(parseInt(year), parseInt(m) - 1, 1);
                                    const thaiMonth = dateObj.toLocaleDateString('th-TH', { month: 'long', year: '2-digit' });
                                    return (
                                        <tr key={month}>
                                            <td>{thaiMonth}</td>
                                            <td className="text-center" style={{ color: '#22c55e' }}>{data.pre}</td>
                                            <td className="text-center" style={{ color: '#eab308' }}>{data.post}</td>
                                            <td className="text-center">{data.total}</td>
                                            <td className="text-right">{data.area.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                                {sortedMonths.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center" style={{ color: '#94a3b8' }}>
                                            ยังไม่มีข้อมูล
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Summary */}
                        <h2>สรุปผลการปฏิบัติงาน</h2>
                        <table>
                            <tbody>
                                <tr>
                                    <td>🟢 พบก่อน Hotspot ขึ้น (Pre-Hotspot)</td>
                                    <td className="text-right">{preHotspot} ครั้ง ({preHotspotRate}%)</td>
                                </tr>
                                <tr>
                                    <td>🟡 ดับหลัง Hotspot ขึ้น (Post-Hotspot)</td>
                                    <td className="text-right">{postHotspot} ครั้ง</td>
                                </tr>
                                <tr>
                                    <td>👥 กำลังพลที่ใช้ทั้งหมด</td>
                                    <td className="text-right">{totalPersonnel.toLocaleString()} นาย</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Footer */}
                        <div className="footer">
                            รายงานนี้สร้างโดยระบบ Fire Incident Tracker • {settings.systemName}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
