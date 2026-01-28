
import React, { useState, useMemo } from 'react';
import { ActivityLog, AppSettings } from '../types';
import { Printer, Filter, Calendar } from 'lucide-react';

interface PRReportViewProps {
    activities: ActivityLog[];
    settings: AppSettings;
}

export const PRReportView: React.FC<PRReportViewProps> = ({ activities, settings }) => {
    const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Helper: Parse date robustly
    const parseDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;

        // Try standard parsing first
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;

        // Try Thai format DD/MM/YYYY
        // Check for common separators: / or -
        const parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (parts) {
            // parts[1] = Day, parts[2] = Month, parts[3] = Year
            // Convert to YYYY-MM-DD
            d = new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
            if (!isNaN(d.getTime())) return d;
        }

        return null;
    };

    // 1. Filter Data: Get only PR activities for selected month/year OR range
    const reportData = useMemo(() => {
        return activities
            .filter(a => {
                // Filter by PR category (Assuming 'PR' ID or keyword in category)
                const isPR = a.category === 'PR' || a.category.includes('ประชาสัมพันธ์') || a.title?.includes('รณรงค์') || a.description?.includes('รณรงค์');
                if (!isPR) return false;

                const d = parseDate(a.date);
                if (!d) return false;

                if (filterMode === 'month') {
                    const matchMonth = String(d.getMonth() + 1) === selectedMonth;
                    const matchYear = String(d.getFullYear()) === selectedYear;
                    return matchMonth && matchYear;
                } else {
                    // Range Mode
                    if (!startDate || !endDate) return true; // Show all if dates not selected
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    // Reset time for accurate date comparison
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    return d >= start && d <= end;
                }
            })
            .sort((a, b) => {
                const da = parseDate(a.date);
                const db = parseDate(b.date);
                return (da?.getTime() || 0) - (db?.getTime() || 0);
            });
    }, [activities, selectedMonth, selectedYear, filterMode, startDate, endDate]);

    // 2. Helper to extract location (Use structured data first, fallback to regex for legacy)
    const extractLocation = (item: ActivityLog) => {
        // If structured data exists, use it!
        if (item.locationDetail) {
            return item.locationDetail;
        }

        // FALLBACK: Legacy Regex Parsing
        const text = item.description + " " + item.title;
        let village = '-';
        let tambon = '-';
        let amphoe = '-';
        let province = 'กาญจนบุรี'; // Default
        let householdCount = undefined;

        // Try to find Village (บ้าน... หรือ ชุมชน...)
        const villageMatch = text.match(/(?:บ้าน|ชุมชน)([\u0E00-\u0E7F\s]+?)(?:\s+|$|ต\.|อ\.|หมู่)/);
        const mooMatch = text.match(/(?:หมู่|หมู่ที่)\s*(\d+)/);

        if (villageMatch) {
            village = `บ้าน${villageMatch[1].trim()}`;
            if (mooMatch) village += ` หมู่ ${mooMatch[1]}`;
        } else if (mooMatch) {
            village = `หมู่ ${mooMatch[1]}`;
        }

        // Try to find Tambon
        const tambonMatch = text.match(/(?:ต\.|ตำบล)\s*([\u0E00-\u0E7F]+)/);
        if (tambonMatch) tambon = tambonMatch[1];

        // Try to find Amphoe
        const amphoeMatch = text.match(/(?:อ\.|อำเภอ)\s*([\u0E00-\u0E7F]+)/);
        if (amphoeMatch) amphoe = amphoeMatch[1];

        // Try to find Households in text (e.g. 50 ครัวเรือน)
        const hhMatch = text.match(/(\d+)\s*(?:ครัวเรือน|หลังคาเรือน)/);
        if (hhMatch) householdCount = Number(hhMatch[1]);

        return { village, tambon, amphoe, province, householdCount };
    };

    const formatThaiDate = (dateStr: string) => {
        const d = parseDate(dateStr);
        if (!d) return dateStr || '-';

        const day = d.getDate();
        const months = [
            "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
            "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
        ];
        const month = months[d.getMonth()];
        const year = d.getFullYear() + 543;
        return `${day} ${month} ${String(year).slice(2)}`; // 10 พ.ย. 68
    };

    const formatFullThaiMonth = (monthStr: string, yearStr: string) => {
        const months = [
            "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
            "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
        ];
        const m = parseInt(monthStr) - 1;
        const y = parseInt(yearStr) + 543;
        return `${months[m]} ${y}`;
    };

    const formatThaiDateRange = (start: string, end: string) => {
        if (!start || !end) return "กำหนดช่วงวันที่...";
        const d1 = new Date(start);
        const d2 = new Date(end);
        return `${formatThaiDate(start)} - ${formatThaiDate(end)}`;
    }

    return (
        <div className="p-8 min-h-screen font-sarabun">

            {/* --- Toolbar (Hidden on Print) - Dark Theme --- */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-white">PR REPORT GENERATOR</h2>
                    <p className="text-slate-400">สร้างตารางสรุปผลงานตามแบบฟอร์มราชการ</p>
                </div>

                <div className="flex gap-3 p-2 rounded-xl border" style={{ background: 'rgba(30, 41, 59, 0.8)', borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <div className="flex items-center gap-2 px-3 border-r border-slate-600">
                        <Filter size={18} className="text-orange-500" />
                        <select
                            value={filterMode}
                            onChange={e => setFilterMode(e.target.value as 'month' | 'range')}
                            className="bg-transparent font-medium text-slate-300 focus:outline-none"
                        >
                            <option value="month" className="bg-slate-800 text-white">รายเดือน</option>
                            <option value="range" className="bg-slate-800 text-white">กำหนดช่วงวันที่</option>
                        </select>
                    </div>

                    {filterMode === 'month' ? (
                        <div className="flex items-center gap-2 px-3 border-r border-slate-600 animate-fade-in">
                            <Calendar size={18} className="text-orange-500" />
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="bg-transparent font-medium text-slate-300 focus:outline-none"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={String(m)} className="bg-slate-800 text-white">
                                        {new Date(2000, m - 1, 1).toLocaleDateString('th-TH', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={e => setSelectedYear(e.target.value)}
                                className="bg-transparent font-medium text-slate-300 focus:outline-none"
                            >
                                <option value="2024" className="bg-slate-800 text-white">2024</option>
                                <option value="2025" className="bg-slate-800 text-white">2025</option>
                                <option value="2026" className="bg-slate-800 text-white">2026</option>
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 border-r border-slate-600 animate-fade-in">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-slate-700 text-white px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-orange-500 text-sm"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-slate-700 text-white px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-orange-500 text-sm"
                            />
                        </div>
                    )}

                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-lg hover:shadow-orange-500/25 transition-all font-bold shadow-lg"
                    >
                        <Printer size={18} /> PRINT REPORT
                    </button>
                </div>
            </div>

            {/* --- Report Paper (A4 Style) --- */}
            <div className="bg-white mx-auto shadow-xl print:shadow-none print:w-full max-w-[297mm] min-h-[210mm] p-10 print:p-0">

                {/* Header */}
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-black">สรุปผลการรณรงค์ประชาสัมพันธ์ป้องกันไฟป่า</h3>
                    <h3 className="text-lg font-bold text-black">{settings.systemName}</h3>
                    {filterMode === 'month' ? (
                        <h3 className="text-lg font-bold text-black">ประจำเดือน {formatFullThaiMonth(selectedMonth, selectedYear)}</h3>
                    ) : (
                        <h3 className="text-lg font-bold text-black">ระหว่างวันที่ {formatThaiDateRange(startDate, endDate)}</h3>
                    )}
                </div>

                {/* Table */}
                <div className="w-full border border-black text-xs md:text-sm overflow-x-auto print:overflow-visible">
                    <table className="w-full border-collapse min-w-[1000px] print:min-w-full">
                        <thead>
                            <tr className="bg-green-300 print:bg-green-300 text-center font-bold">
                                <th className="border border-black px-1 py-2 w-20">วัน/เดือน/ปี</th>
                                <th className="border border-black px-2 py-2">กิจกรรม/โครงการ</th>
                                <th className="border border-black px-2 py-2 w-40">หมู่บ้าน/ชุมชน</th>
                                <th className="border border-black px-1 py-2 w-20">ตำบล</th>
                                <th className="border border-black px-1 py-2 w-20">อำเภอ</th>
                                <th className="border border-black px-1 py-2 w-16">จังหวัด</th>
                                <th className="border border-black px-1 py-2 w-20">จำนวนครัวเรือน</th>
                                <th className="border border-black px-2 py-2 w-20">หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((item, index) => {
                                const loc = extractLocation(item);
                                const isPast = new Date(item.date) < new Date();
                                const remarkText = item.locationDetail?.remark || (isPast ? "ดำเนินการแล้ว" : "-");

                                return (
                                    <tr key={index} className="text-left align-top">
                                        <td className="border border-black px-1 py-1 text-center whitespace-nowrap">
                                            {formatThaiDate(item.date)}
                                        </td>
                                        <td className="border border-black px-2 py-1">
                                            {item.title}
                                        </td>
                                        <td className="border border-black px-2 py-1">
                                            {loc.village}
                                        </td>
                                        <td className="border border-black px-1 py-1 text-center">
                                            {loc.tambon}
                                        </td>
                                        <td className="border border-black px-1 py-1 text-center">
                                            {loc.amphoe}
                                        </td>
                                        <td className="border border-black px-1 py-1 text-center">
                                            {loc.province}
                                        </td>
                                        <td className="border border-black px-1 py-1 text-center font-bold">
                                            {loc.householdCount !== undefined ? loc.householdCount.toLocaleString() : '-'}
                                        </td>
                                        <td className="border border-black px-2 py-1 text-center">
                                            {remarkText}
                                        </td>
                                    </tr>
                                );
                            })}
                            {reportData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="border border-black px-2 py-8 text-center text-gray-500 italic">
                                        -- ไม่มีข้อมูลการประชาสัมพันธ์ในเดือนนี้ --
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {reportData.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50 font-bold">
                                    <td colSpan={6} className="border border-black px-2 py-2 text-right">รวมจำนวนครัวเรือนทั้งหมด</td>
                                    <td className="border border-black px-1 py-2 text-center bg-yellow-50">
                                        {reportData.reduce((sum, item) => sum + (extractLocation(item).householdCount || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="border border-black px-2 py-2">ครัวเรือน</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-8 flex justify-end print:mt-16">
                    <div className="text-center w-80">
                        <p className="mb-12">ลงชื่อ..........................................................ผู้รายงาน</p>
                        <p>(..........................................................)</p>
                        <p className="mt-2 text-sm">ตำแหน่ง..........................................................</p>
                        <p className="text-sm">วันที่........../........../..........</p>
                    </div>
                </div>

            </div>

            {/* CSS for Printing */}
            <style>{`
        @media print {
            body {
                background: white !important;
            }
            body * {
                visibility: hidden;
            }
            .print\\:shadow-none, .print\\:shadow-none * {
                visibility: visible;
            }
            .print\\:shadow-none {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 5mm;
            }
            .print\\:bg-green-300 {
                background-color: #86efac !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            @page {
                size: A4 landscape;
                margin: 10mm;
            }
        }
      `}</style>
        </div>
    );
};