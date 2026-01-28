
export enum OperationalPhase {
  PRE_SEASON = 'PRE_SEASON', // พ.ค. - ธ.ค. (เตรียมการ)
  FIRE_SEASON = 'FIRE_SEASON', // ม.ค. - เม.ย. (หน้าไฟ)
  POST_SEASON = 'POST_SEASON', // หลังหน้าไฟ (สรุปผล)
}

// Changed from Enum to string to allow dynamic categories
export type ActivityCategory = string;

export interface LocationData {
  lat?: number;
  lng?: number;
  utm: string; // e.g. "47P 0563210, 1578485" or user input
}

export interface LocationDetail {
  village: string;
  tambon: string;
  amphoe: string;
  province: string;
  remark?: string;
  householdCount?: number; // New field for PR reports
}

export interface HotspotLog {
  id: string;
  date: string;
  round: '02:00' | '14:00';
  count: number; // Total Sum
  erawanCount: number; // อุทยานแห่งชาติเอราวัณ
  salakpraCount: number; // เขตรักษาพันธุ์สัตว์ป่าสลักพระ
  remark?: string;
}

export interface ActivityLog {
  id: string;
  date: string; // Start Date
  endDate?: string; // End Date (Optional for single day)
  phase: OperationalPhase;
  category: ActivityCategory;
  title: string;
  description: string;
  imageUrl?: string; // Legacy single image support
  imageUrls?: string[]; // Support multiple images (Max 5)
  location?: LocationData;
  locationDetail?: LocationDetail; // New structured location for PR reports
  stats?: {
    areaDamaged?: number; // rai
    personnelCount?: number;
    hotspotCount?: number; // Ground verified hotspots (found on site)
    budgetUsed?: number;
  };
}

export interface CategoryItem {
  id: string;
  label: string;
}

export interface AppSettings {
  systemName: string;
  subTitle: string;
  logoUrl: string; // URL or Base64
  themeColor: 'orange' | 'blue' | 'green' | 'red' | 'slate';
  categories: CategoryItem[]; // Dynamic list of categories
}

export interface DashboardStats {
  totalActivities: number;
  activitiesByPhase: Record<OperationalPhase, number>;
  totalBurnedArea: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  action?: string;
  id?: string;
}