
import React, { useState, useRef, useEffect } from 'react';
import { ActivityLog, OperationalPhase, ActivityCategory, AppSettings, LocationDetail } from '../types';
import { Save, AlertCircle, Image as ImageIcon, X, Plus, MapPin, Loader, Info, Calendar, CheckCircle, ExternalLink, Users, RefreshCcw, Eye, Lock, Check, Megaphone, ChevronDown, ChevronUp } from 'lucide-react';
import L from 'leaflet';

// FIX: Use CDN URLs instead of importing images directly
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// New Pure Leaflet Map Component
const MapPicker: React.FC<{
    initialPos: { lat: number, lng: number };
    onConfirm: (pos: { lat: number, lng: number }) => void;
    onClose: () => void;
}> = ({ initialPos, onConfirm, onClose }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [selectedPos, setSelectedPos] = useState(initialPos);

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        // Initialize Map
        const map = L.map(mapContainerRef.current).setView([initialPos.lat, initialPos.lng], 13);
        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const marker = L.marker([initialPos.lat, initialPos.lng], { icon: DefaultIcon }).addTo(map);
        markerRef.current = marker;

        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            setSelectedPos({ lat, lng });
            marker.setLatLng([lat, lng]);
            map.flyTo([lat, lng], map.getZoom());
        });

        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []); // Run once on mount

    return (
        <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0">
                <h3 className="font-bold flex items-center gap-2"><MapPin size={20}/> เลือกจุดบนแผนที่</h3>
                <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded-full"><X size={24}/></button>
            </div>
            <div className="flex-1 relative bg-slate-100 z-0">
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white/90 px-4 py-2 rounded-full shadow-lg text-sm font-bold text-slate-700 pointer-events-none border border-slate-200">
                    แตะที่แผนที่เพื่อปักหมุด
                </div>
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                <div className="text-sm">
                    <p className="text-slate-500">พิกัดที่เลือก:</p>
                    <p className="font-mono font-bold text-slate-800">{selectedPos.lat.toFixed(6)}, {selectedPos.lng.toFixed(6)}</p>
                </div>
                <button 
                    onClick={() => onConfirm(selectedPos)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                    ยืนยันตำแหน่ง
                </button>
            </div>
        </div>
    );
};

interface ActivityFormProps {
  onSave: (activity: ActivityLog) => void;
  initialData?: ActivityLog | null;
  onCancel?: () => void;
  settings: AppSettings;
}

// Helper for UTM Conversion (Simplified for WGS84 Zone 47N - Thailand)
const toUTM = (lat: number, lon: number): string => {
    if ((lon < 96 || lon > 102)) {
      // Very basic check
    }

    const a = 6378137.0; // WGS84 semi-major axis
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const deg2rad = Math.PI / 180.0;

    const phi = lat * deg2rad;
    const lam = lon * deg2rad;
    
    // Zone 47
    const zoneNumber = 47;
    const lon0 = ((zoneNumber - 1) * 6 - 180 + 3) * deg2rad; // Central meridian

    const e2 = 2 * f - f * f;
    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) * Math.sin(phi));
    const T = Math.tan(phi) * Math.tan(phi);
    const C = (e2 / (1 - e2)) * Math.cos(phi) * Math.cos(phi);
    const A = (lam - lon0) * Math.cos(phi);

    const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * phi
              - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * phi)
              + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * phi)
              - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * phi));

    let easting = k0 * N * (A + (1 - T + C) * A * A * A / 6
                  + (5 - 18 * T + T * T + 72 * C - 58 * e2) * A * A * A * A * A / 120)
                  + 500000.0;

    let northing = k0 * (M + N * Math.tan(phi) * (A * A / 2
                   + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24
                   + (61 - 58 * T + T * T + 600 * C - 330 * e2) * A * A * A * A * A * A / 720));

    const eStr = Math.floor(easting).toString().padStart(6, '0');
    const nStr = Math.floor(northing).toString().padStart(7, '0');

    return `${eStr}, ${nStr}`;
};

export const ActivityForm: React.FC<ActivityFormProps> = ({ onSave, initialData, onCancel, settings }) => {
  // Use first category as default if available, otherwise empty string (though type says ActivityCategory is string)
  const defaultCategory = settings.categories.length > 0 ? settings.categories[0].id : '';

  const [formData, setFormData] = useState<Partial<ActivityLog>>({
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    phase: OperationalPhase.PRE_SEASON,
    category: defaultCategory,
    title: '',
    description: '',
    imageUrls: [],
    location: undefined
  });

  // Temporary state for location editing
  const [utmInput, setUtmInput] = useState('');
  const [gpsLatLon, setGpsLatLon] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const [areaDamaged, setAreaDamaged] = useState<number | ''>('');
  const [personnelCount, setPersonnelCount] = useState<number | ''>('');

  // Location Details (PR)
  const [locDetail, setLocDetail] = useState<LocationDetail>({
      village: '',
      tambon: '',
      amphoe: '',
      province: 'กาญจนบุรี',
      remark: 'ดำเนินการแล้ว',
      householdCount: undefined
  });
  const [showLocDetail, setShowLocDetail] = useState(false);

  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add state to lock submit button
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Map Picker State
  const [showMapPicker, setShowMapPicker] = useState(false);

  // PIN Modal State for Editing
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCategoryLabel = (id: string) => settings.categories.find(c => c.id === id)?.label || id;

  const getThemeColorClass = () => {
      switch (settings.themeColor) {
          case 'blue': return 'bg-blue-600 hover:bg-blue-700';
          case 'green': return 'bg-green-600 hover:bg-green-700';
          case 'red': return 'bg-red-600 hover:bg-red-700';
          case 'slate': return 'bg-slate-600 hover:bg-slate-700';
          default: return 'bg-orange-600 hover:bg-orange-700';
      }
  };

  const getHeaderColorClass = () => {
      if (initialData) return 'bg-blue-600';
      switch (settings.themeColor) {
          case 'blue': return 'bg-blue-600';
          case 'green': return 'bg-green-600';
          case 'red': return 'bg-red-600';
          case 'slate': return 'bg-slate-600';
          default: return 'bg-orange-600';
      }
  };

  const getRingColorClass = () => {
    switch (settings.themeColor) {
        case 'blue': return 'focus:ring-blue-500';
        case 'green': return 'focus:ring-green-500';
        case 'red': return 'focus:ring-red-500';
        case 'slate': return 'focus:ring-slate-500';
        default: return 'focus:ring-orange-500';
    }
};

  // Effect to load initial data for editing
  useEffect(() => {
    if (initialData) {
        setFormData({
            ...initialData,
            // Ensure dates are formatted for input[type=date]
            date: initialData.date,
            endDate: initialData.endDate || ''
        });
        
        // Load stats
        if (initialData.stats) {
            setAreaDamaged(initialData.stats.areaDamaged || '');
            setPersonnelCount(initialData.stats.personnelCount || '');
        }

        // Load location
        if (initialData.location) {
            setUtmInput(initialData.location.utm);
            if (initialData.location.lat && initialData.location.lng) {
                setGpsLatLon({ lat: initialData.location.lat, lng: initialData.location.lng });
            }
        }

        // Load Location Detail (PR)
        if (initialData.locationDetail) {
            setLocDetail(initialData.locationDetail);
            setShowLocDetail(true);
        } else {
            setShowLocDetail(false);
            setLocDetail({
                village: '',
                tambon: '',
                amphoe: '',
                province: 'กาญจนบุรี',
                remark: 'ดำเนินการแล้ว',
                householdCount: undefined
            });
        }
    } else {
        // Reset form when switching from edit mode to add mode
        setFormData({
            date: new Date().toISOString().split('T')[0],
            endDate: '',
            phase: OperationalPhase.PRE_SEASON,
            category: defaultCategory,
            title: '',
            description: '',
            imageUrls: [],
            location: undefined
        });
        setUtmInput('');
        setGpsLatLon(undefined);
        setGpsAccuracy(null);
        setAreaDamaged('');
        setPersonnelCount('');
        setLocDetail({
            village: '',
            tambon: '',
            amphoe: '',
            province: 'กาญจนบุรี',
            remark: 'ดำเนินการแล้ว',
            householdCount: undefined
        });
        setShowLocDetail(false);
        setIsSubmitting(false);
    }
  }, [initialData, defaultCategory]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
      return;
    }

    setIsLocating(true);
    setGpsLatLon(undefined);
    setGpsAccuracy(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const utmString = toUTM(latitude, longitude);
        setUtmInput(utmString);
        setGpsLatLon({ lat: latitude, lng: longitude });
        setGpsAccuracy(accuracy);
        setFormData(prev => ({
          ...prev,
          location: {
            lat: latitude,
            lng: longitude,
            utm: utmString
          }
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        let msg = 'ไม่สามารถระบุตำแหน่งได้';
        if (error.code === 1) msg = 'กรุณาอนุญาตให้เข้าถึงตำแหน่ง';
        else if (error.code === 2) msg = 'สัญญาณ GPS ไม่เสถียร';
        else if (error.code === 3) msg = 'หมดเวลาในการค้นหาตำแหน่ง';
        alert(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleMapConfirm = (pos: { lat: number, lng: number }) => {
    const utmString = toUTM(pos.lat, pos.lng);
    setUtmInput(utmString);
    setGpsLatLon(pos);
    setGpsAccuracy(null); // Selected manually, so no GPS accuracy
    setFormData(prev => ({
      ...prev,
      location: {
        lat: pos.lat,
        lng: pos.lng,
        utm: utmString
      }
    }));
    setShowMapPicker(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentImages = formData.imageUrls || [];
    if (currentImages.length + files.length > 10) {
      alert('สามารถอัปโหลดรูปภาพได้สูงสุด 10 รูปต่อกิจกรรม');
      return;
    }

    setIsProcessingImg(true);
    
    const processFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1024; // Increased to 1024 for better quality
            const scaleSize = MAX_WIDTH / img.width;
            const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
            const height = (img.width > MAX_WIDTH) ? img.height * scaleSize : img.height;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8)); // Increased quality slightly
          };
          img.src = readerEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    };

    try {
      const newImages = await Promise.all(Array.from(files).map(processFile));
      setFormData(prev => ({ 
        ...prev, 
        imageUrls: [...(prev.imageUrls || []), ...newImages] 
      }));
    } catch (error) {
      console.error("Error processing images", error);
    } finally {
      setIsProcessingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls?.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleUtmChange = (val: string) => {
    setUtmInput(val);
    setFormData(prev => ({
        ...prev,
        location: {
            ...prev.location,
            utm: val,
            lat: gpsLatLon?.lat,
            lng: gpsLatLon?.lng
        }
    }));
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
        alert("กรุณากรอกหัวข้อและรายละเอียด");
        return;
    }
    setShowConfirmModal(true);
  };

  const executeSave = () => {
    setIsSubmitting(true); // Lock UI instantly

    const newActivity: ActivityLog = {
        id: initialData ? initialData.id : Date.now().toString(), // Use existing ID if editing
        date: formData.date!,
        endDate: formData.endDate ? formData.endDate : undefined,
        phase: formData.phase as OperationalPhase,
        category: formData.category as ActivityCategory,
        title: formData.title!,
        description: formData.description!,
        imageUrls: formData.imageUrls,
        imageUrl: formData.imageUrls?.[0],
        location: utmInput ? {
            utm: utmInput,
            lat: gpsLatLon?.lat,
            lng: gpsLatLon?.lng
        } : undefined,
        stats: {
          ...(areaDamaged ? { areaDamaged: Number(areaDamaged) } : {}),
          ...(personnelCount ? { personnelCount: Number(personnelCount) } : {})
        },
        locationDetail: showLocDetail ? locDetail : undefined
      };
  
      onSave(newActivity);
      
      // Cleanup
      setShowConfirmModal(false);
      setShowPinModal(false);
      setPinInput('');
  
      // Reset form only if it's creating new, if editing, parent might unmount or change tab
      if (!initialData) {
          setFormData({
              date: new Date().toISOString().split('T')[0],
              endDate: '',
              phase: OperationalPhase.PRE_SEASON,
              category: defaultCategory,
              title: '',
              description: '',
              imageUrls: [],
              location: undefined
          });
          setUtmInput('');
          setGpsLatLon(undefined);
          setGpsAccuracy(null);
          setAreaDamaged('');
          setPersonnelCount('');
          setLocDetail({
             village: '', tambon: '', amphoe: '', province: 'กาญจนบุรี', remark: 'ดำเนินการแล้ว', householdCount: undefined
          });
          setShowLocDetail(false);
          setIsSubmitting(false); // Re-enable after state reset
      }
  }

  const handleConfirmClick = () => {
    if (initialData) {
        // If editing, require PIN
        setShowConfirmModal(false);
        setShowPinModal(true);
    } else {
        // If creating new, save directly
        executeSave();
    }
  };

  const verifyPinAndSave = () => {
    if (pinInput === '123457') {
        executeSave();
    } else {
        alert('รหัสผ่านไม่ถูกต้อง');
        setPinInput('');
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen flex justify-center relative">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
        <div className={`p-6 text-white flex justify-between items-center ${getHeaderColorClass()}`}>
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    {initialData ? <RefreshCcw size={24}/> : <Save size={24}/>}
                    {initialData ? 'แก้ไขข้อมูลปฏิบัติงาน' : 'บันทึกผลการปฏิบัติงาน'}
                </h2>
                <p className={`${initialData ? 'text-blue-100' : 'text-white/80'} opacity-90`}>
                    {initialData ? 'ปรับปรุงรายละเอียดภารกิจ' : 'กรอกรายละเอียดภารกิจประจำวัน'}
                </p>
            </div>
            {initialData && onCancel && (
                <button 
                    onClick={onCancel}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    title="ยกเลิกการแก้ไข"
                >
                    <X size={20} />
                </button>
            )}
        </div>
        
        <form onSubmit={handlePreSubmit} className="p-8 space-y-6">
          
          {/* Date Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">วันที่เริ่มปฏิบัติงาน</label>
                <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className={`w-full border-slate-200 rounded-lg px-4 py-2 focus:ring-2 ${getRingColorClass()} focus:border-transparent border bg-white text-slate-900 [color-scheme:light]`}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-900 mb-2 flex justify-between">
                    <span>ถึงวันที่ (กรณีทำต่อเนื่อง)</span>
                    <span className="text-xs text-slate-400 font-normal">ไม่บังคับ</span>
                </label>
                <input 
                    type="date" 
                    min={formData.date}
                    value={formData.endDate || ''}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                    className={`w-full border-slate-200 rounded-lg px-4 py-2 focus:ring-2 ${getRingColorClass()} focus:border-transparent border bg-white text-slate-900 placeholder-slate-400 [color-scheme:light]`}
                />
            </div>
          </div>

          {/* Phase & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">ช่วงภารกิจ</label>
                <select 
                    value={formData.phase}
                    onChange={e => setFormData({...formData, phase: e.target.value as OperationalPhase})}
                    className={`w-full border-slate-200 rounded-lg px-4 py-2 focus:ring-2 ${getRingColorClass()} focus:border-transparent border bg-white text-slate-900`}
                >
                    <option value={OperationalPhase.PRE_SEASON}>ช่วงเตรียมการ (พ.ค. - ธ.ค.)</option>
                    <option value={OperationalPhase.FIRE_SEASON}>ช่วงหน้าไฟ (ม.ค. - เม.ย.)</option>
                    <option value={OperationalPhase.POST_SEASON}>ช่วงหลังหน้าไฟ (สรุปผล)</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">ประเภทกิจกรรม</label>
                <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as ActivityCategory})}
                    className={`w-full border-slate-200 rounded-lg px-4 py-2 focus:ring-2 ${getRingColorClass()} focus:border-transparent border bg-white text-slate-900`}
                >
                    {settings.categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.label}
                        </option>
                    ))}
                </select>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-fade-in space-y-4">
             <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Info size={16}/> ข้อมูลสถิติและความเสียหาย
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Area Damaged */}
                <div>
                    <label className="block text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                        <AlertCircle size={16} />
                        พื้นที่เสียหาย (ไร่)
                    </label>
                    <input 
                        type="number" 
                        value={areaDamaged}
                        onChange={e => setAreaDamaged(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="ระบุจำนวนไร่"
                        className="w-full border-red-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent border bg-white text-slate-900 placeholder-red-300"
                    />
                </div>
                {/* Personnel */}
                <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                        <Users size={16} />
                        กำลังพลที่ปฏิบัติงาน (นาย)
                    </label>
                    <input 
                        type="number" 
                        value={personnelCount}
                        onChange={e => setPersonnelCount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="ระบุจำนวนคน"
                        className="w-full border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent border bg-white text-slate-900 placeholder-blue-300"
                    />
                </div>
             </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">หัวข้อเรื่อง</label>
            <input 
                type="text" 
                required
                placeholder="เช่น เข้าดับไฟบริเวณห้วยแม่ขมิ้น"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className={`w-full border-slate-200 rounded-lg px-4 py-2 focus:ring-2 ${getRingColorClass()} focus:border-transparent border bg-white text-slate-900 placeholder-slate-400`}
            />
          </div>

          {/* Location Details (PR) - Collapsible Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
             <button
                type="button"
                onClick={() => setShowLocDetail(!showLocDetail)}
                className={`w-full flex items-center justify-between p-4 font-bold text-sm transition-colors ${showLocDetail ? 'bg-green-50 text-green-800' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
             >
                <div className="flex items-center gap-2">
                    <Megaphone size={18} />
                    ระบุสถานที่ละเอียด (สำหรับรายงาน ปชส.)
                </div>
                {showLocDetail ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
             </button>
             
             {showLocDetail && (
                 <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-down">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">หมู่บ้าน / หมู่ที่</label>
                        <input 
                            type="text" 
                            placeholder="เช่น บ้านท่าทุ่งนา หมู่ 1"
                            value={locDetail.village}
                            onChange={e => setLocDetail({...locDetail, village: e.target.value})}
                            className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 border bg-white text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">ตำบล</label>
                        <input 
                            type="text" 
                            placeholder="เช่น ไทรโยค"
                            value={locDetail.tambon}
                            onChange={e => setLocDetail({...locDetail, tambon: e.target.value})}
                            className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 border bg-white text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">อำเภอ</label>
                        <input 
                            type="text" 
                            placeholder="เช่น ไทรโยค"
                            value={locDetail.amphoe}
                            onChange={e => setLocDetail({...locDetail, amphoe: e.target.value})}
                            className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 border bg-white text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">จังหวัด</label>
                        <input 
                            type="text" 
                            value={locDetail.province}
                            onChange={e => setLocDetail({...locDetail, province: e.target.value})}
                            className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 border bg-white text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">จำนวนครัวเรือน (ที่ได้รับ ปชส.)</label>
                        <input 
                            type="number" 
                            placeholder="0"
                            value={locDetail.householdCount === undefined ? '' : locDetail.householdCount}
                            onChange={e => setLocDetail({...locDetail, householdCount: e.target.value === '' ? undefined : Number(e.target.value)})}
                            className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 border bg-white text-slate-900"
                        />
                    </div>
                    <div>
                         <label className="block text-xs font-medium text-slate-700 mb-1">หมายเหตุ</label>
                         <input 
                            type="text" 
                            placeholder="เช่น ดำเนินการแล้ว"
                            value={locDetail.remark || ''}
                            onChange={e => setLocDetail({...locDetail, remark: e.target.value})}
                            className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 border bg-white text-slate-900"
                         />
                    </div>
                 </div>
             )}
          </div>

          {/* Location (GPS/UTM) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>พิกัดพื้นที่ (UTM WGS84 / Indian 1975)</span>
                <span className="text-xs font-normal text-slate-500">เช่น 0563210, 1578485</span>
            </label>
            
            <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="กรอกพิกัด หรือ กดปุ่มดึงพิกัด"
                        value={utmInput}
                        onChange={e => handleUtmChange(e.target.value)}
                        className={`flex-1 border-slate-300 rounded-lg px-4 py-2 focus:ring-2 ${getRingColorClass()} bg-white text-slate-900 border font-mono placeholder-slate-400`}
                    />
                    <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2 px-4 whitespace-nowrap shadow-sm text-sm font-medium"
                    >
                        {isLocating ? <Loader size={18} className="animate-spin"/> : <MapPin size={18} />}
                        {isLocating ? 'หาพิกัด' : 'GPS'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-2 rounded-lg transition-colors flex items-center gap-2 px-4 whitespace-nowrap shadow-sm text-sm font-medium"
                    >
                         <MapPin size={18} className="text-blue-500"/>
                         เลือกบนแผนที่
                    </button>
                </div>

                {gpsLatLon && (
                    <div className={`text-sm p-3 rounded-lg border flex justify-between items-center ${gpsAccuracy && gpsAccuracy > 50 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                        <div>
                            <div className="font-semibold flex items-center gap-2">
                                <span>GPS: {gpsLatLon.lat.toFixed(5)}, {gpsLatLon.lng.toFixed(5)}</span>
                            </div>
                            <div className="text-xs opacity-80 mt-1">
                                ความแม่นยำ: +/- {gpsAccuracy?.toFixed(0)} เมตร 
                                {gpsAccuracy && gpsAccuracy > 50 && ' (คลาดเคลื่อนสูง โปรดตรวจสอบ)'}
                            </div>
                        </div>
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${gpsLatLon.lat},${gpsLatLon.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 font-semibold hover:underline text-xs bg-white px-2 py-1 rounded border border-blue-200 shadow-sm"
                        >
                            <ExternalLink size={12} />
                            ตรวจสอบบน Map
                        </a>
                    </div>
                )}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><ImageIcon size={18} /> รูปภาพประกอบ (สูงสุด 10 รูป)</span>
                <span className="text-xs text-slate-500">{formData.imageUrls?.length || 0}/10</span>
            </label>
            
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-4">
              {formData.imageUrls?.map((url, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden aspect-square border border-slate-200 group shadow-sm">
                  <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {(formData.imageUrls?.length || 0) < 10 && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-orange-400 transition-all text-slate-400 hover:text-orange-500 bg-white"
                >
                  <Plus size={24} />
                  <span className="text-xs mt-1">เพิ่มรูป</span>
                </div>
              )}
            </div>

            <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
            />
            {isProcessingImg && <p className="text-sm text-orange-500 mt-2 animate-pulse">กำลังประมวลผลรูปภาพ...</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">รายละเอียดการปฏิบัติงาน</label>
            <textarea 
                rows={5}
                required
                placeholder="อธิบายรายละเอียด ผลการปฏิบัติ อุปสรรคที่พบ..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className={`w-full border-slate-200 rounded-lg px-4 py-2 focus:ring-2 ${getRingColorClass()} focus:border-transparent border bg-white text-slate-900 placeholder-slate-400`}
            />
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button 
                type="submit"
                disabled={isProcessingImg || isSubmitting}
                className={`w-full text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                    ${initialData ? 'bg-blue-600 hover:bg-blue-700' : getThemeColorClass()}`}
            >
                {isSubmitting || isProcessingImg ? <Loader className="animate-spin" size={20} /> : <Eye size={20} />}
                {isProcessingImg ? 'กำลังประมวลผล...' : isSubmitting ? 'กำลังบันทึก...' : (initialData ? 'ตรวจสอบการแก้ไข' : 'ตรวจสอบความถูกต้อง')}
            </button>
          </div>

        </form>
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <MapPicker 
                initialPos={gpsLatLon || { lat: 14.3541, lng: 99.1419 }} // Default to Erawan area if unknown
                onConfirm={handleMapConfirm}
                onClose={() => setShowMapPicker(false)}
              />
          </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                  <div className="bg-slate-900 p-4 flex items-center gap-3">
                      <CheckCircle className="text-green-400" size={24} />
                      <h3 className="text-lg font-bold text-white">{initialData ? 'ยืนยันการแก้ไข?' : 'ยืนยันการบันทึก?'}</h3>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="flex items-start gap-3 text-slate-600">
                          <Calendar size={18} className="mt-0.5 text-orange-500"/>
                          <div>
                              <p className="text-xs text-slate-400">วันที่ปฏิบัติงาน</p>
                              <p className="font-medium text-slate-800">
                                {formData.date} {formData.endDate ? ` ถึง ${formData.endDate}` : ''}
                              </p>
                          </div>
                      </div>
                      <div className="flex items-start gap-3 text-slate-600">
                          <Info size={18} className="mt-0.5 text-orange-500"/>
                          <div>
                              <p className="text-xs text-slate-400">หัวข้อ</p>
                              <p className="font-medium text-slate-800">{formData.title}</p>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600">
                          <div className="mb-1"><span className="font-semibold text-slate-700">ประเภท:</span> {getCategoryLabel(formData.category as ActivityCategory)}</div>
                          {utmInput && <div className="mb-1"><span className="font-semibold text-slate-700">พิกัด:</span> {utmInput}</div>}
                          {showLocDetail && (
                              <div className="mb-1 bg-green-50 p-1 rounded text-green-800 border border-green-100">
                                  <span className="font-semibold">สถานที่ (ปชส.):</span> {locDetail.village}, {locDetail.tambon}, {locDetail.amphoe} 
                                  {locDetail.householdCount !== undefined && ` (${locDetail.householdCount} ครัวเรือน)`}
                              </div>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {areaDamaged && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">พื้นที่เสียหาย {areaDamaged} ไร่</span>}
                            {personnelCount && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">กำลังพล {personnelCount} นาย</span>}
                          </div>
                          {formData.imageUrls && formData.imageUrls.length > 0 && (
                             <div className="mt-2 text-blue-600 flex items-center gap-1 text-xs"><ImageIcon size={12}/> แนบรูปภาพ {formData.imageUrls.length} รูป</div>
                          )}
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                      <button 
                        onClick={() => setShowConfirmModal(false)}
                        className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-medium transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button 
                        onClick={handleConfirmClick}
                        className={`px-6 py-2 rounded-lg text-white font-bold shadow-md hover:shadow-lg transition-all
                            ${initialData ? 'bg-blue-600 hover:bg-blue-700' : getThemeColorClass()}`}
                      >
                        ยืนยัน
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* PIN Modal for Editing - Only appears after Confirmation if editing */}
      {showPinModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
                  <div className="bg-slate-900 p-4 flex justify-center">
                      <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-white">
                          <Lock size={24} />
                      </div>
                  </div>
                  <div className="p-6">
                      <h3 className="text-center font-bold text-slate-800 mb-2">ยืนยันรหัสผ่าน</h3>
                      <p className="text-center text-xs text-slate-500 mb-4">กรุณากรอกรหัสผ่านเพื่อบันทึกการแก้ไข</p>
                      <input 
                        type="password" 
                        autoFocus
                        placeholder="PIN Code"
                        className="w-full text-center text-2xl tracking-widest font-bold py-2 border-b-2 border-slate-200 focus:border-orange-500 outline-none bg-white text-slate-900 placeholder-slate-300"
                        value={pinInput}
                        onChange={e => setPinInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && verifyPinAndSave()}
                      />
                      <div className="flex gap-3 mt-6">
                          <button 
                            onClick={() => { setShowPinModal(false); setShowConfirmModal(true); }}
                            className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 font-medium"
                          >
                              <X size={20} className="mx-auto" />
                          </button>
                          <button 
                            onClick={verifyPinAndSave}
                            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-lg shadow-blue-200"
                          >
                              <Check size={20} className="mx-auto" />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};