
import { ActivityLog, HotspotLog, AppSettings, ApiResponse } from '../types';

// THE PROVIDED GOOGLE APPS SCRIPT WEB APP URL
// Ensure you have Deployed as "Me" and Access "Anyone"
const API_URL = 'https://script.google.com/macros/s/AKfycbyRsa5IgZE24Fk1VmyGj7FsCGKXablTmPXQMq9SsURCPko9v_eR6HFixnqItgtTjrjR/exec';

/**
 * Generic helper to handle requests to GAS Web App
 * CRITICAL FIX: Added credentials: 'omit' to prevent CORS errors with Google's wildcard access control.
 */
async function sendRequest(method: 'GET' | 'POST', payload?: any): Promise<any> {
    try {
        let url = API_URL;
        
        const options: RequestInit = {
            method: method,
            redirect: 'follow', // Important for Google Scripts redirects
            credentials: 'omit', // CRITICAL: Do not send cookies/auth headers to avoid CORS error
        };

        if (method === 'GET' && payload) {
            const params = new URLSearchParams();
            Object.keys(payload).forEach(key => {
                if (payload[key] !== undefined && payload[key] !== null) {
                    params.append(key, String(payload[key]));
                }
            });
            url += `?${params.toString()}`;
            // NOTE: Do NOT set headers for GET to avoid preflight OPTIONS check
        }

        if (method === 'POST' && payload) {
            options.headers = {
                "Content-Type": "text/plain;charset=utf-8", // Use text/plain to avoid complex CORS preflight
            };
            options.body = JSON.stringify(payload);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        // Robust JSON Parsing
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            // If response is not JSON (e.g. Google Error HTML Page), throw meaningful error
            console.error("Received non-JSON response:", text);
            throw new Error("Server response is not valid JSON. The script might have crashed or returned an HTML error page.");
        }

        // Check if the script returned an application-level error
        if (data.status === 'error') {
             throw new Error(data.message || 'Unknown API Error');
        }
        
        return data;
    } catch (error) {
        console.error("API Request Failed:", error);
        throw error;
    }
}

// Helper to transform Google Drive Download Links to Thumbnail Links (Better for <img> tags)
const fixDriveUrl = (url: string): string => {
    if (!url) return url;
    // Check if it's a Google Drive export/view URL
    if (typeof url === 'string' && url.includes('drive.google.com') && url.includes('id=')) {
        try {
            // Extract ID
            const idMatch = url.match(/id=([^&]+)/);
            if (idMatch && idMatch[1]) {
                // Use thumbnail link which is more reliable for display and CORS friendly
                // sz=w1024 means width 1024px (High quality thumbnail)
                return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1024`;
            }
        } catch (e) {
            console.warn('Failed to transform Drive URL', e);
        }
    }
    return url;
};

export const apiService = {
    // --- ACTIVITIES ---
    getActivities: async (): Promise<ActivityLog[]> => {
        const res = await sendRequest('GET', { sheet: 'Activities' });
        if (Array.isArray(res)) {
            // Fix image URLs for display
            return res.map((item: any) => ({
                ...item,
                imageUrl: item.imageUrl ? fixDriveUrl(item.imageUrl) : undefined,
                imageUrls: item.imageUrls && Array.isArray(item.imageUrls) 
                    ? item.imageUrls.map((url: string) => fixDriveUrl(url))
                    : []
            }));
        }
        return [];
    },
    
    saveActivity: async (activity: ActivityLog, isUpdate: boolean): Promise<ApiResponse<any>> => {
        return await sendRequest('POST', {
            action: isUpdate ? 'update' : 'create',
            sheet: 'Activities',
            data: activity
        });
    },

    deleteActivity: async (id: string): Promise<ApiResponse<any>> => {
        return await sendRequest('POST', {
            action: 'delete',
            sheet: 'Activities',
            data: { id }
        });
    },

    // --- HOTSPOTS ---
    getHotspots: async (): Promise<HotspotLog[]> => {
        const res = await sendRequest('GET', { sheet: 'Hotspots' });
        return Array.isArray(res) ? res : [];
    },

    saveHotspot: async (hotspot: HotspotLog): Promise<ApiResponse<any>> => {
        return await sendRequest('POST', {
            action: 'create',
            sheet: 'Hotspots',
            data: hotspot
        });
    },

    deleteHotspot: async (id: string): Promise<ApiResponse<any>> => {
        return await sendRequest('POST', {
            action: 'delete',
            sheet: 'Hotspots',
            data: { id }
        });
    },

    // --- SETTINGS ---
    getSettings: async (): Promise<AppSettings | null> => {
        const res = await sendRequest('GET', { sheet: 'Settings' });
        if (Array.isArray(res) && res.length > 0) {
             // Look for the config row, or take the first one
             return res.find((r: any) => r.id === 'config') || res[0];
        }
        return null;
    },

    saveSettings: async (settings: AppSettings): Promise<ApiResponse<any>> => {
        // Try to determine if we are creating or updating
        let action = 'create';
        try {
            const current = await apiService.getSettings();
            if (current) action = 'update';
        } catch (e) { }

        const data = { ...settings, id: 'config' };
        
        return await sendRequest('POST', {
            action: action,
            sheet: 'Settings',
            data: data
        });
    },

    // --- SYSTEM ---
    factoryReset: async (): Promise<ApiResponse<any>> => {
        await sendRequest('POST', { action: 'reset', sheet: 'Activities' });
        await sendRequest('POST', { action: 'reset', sheet: 'Hotspots' });
        await sendRequest('POST', { action: 'reset', sheet: 'Settings' });
        return { status: 'success' };
    }
};
