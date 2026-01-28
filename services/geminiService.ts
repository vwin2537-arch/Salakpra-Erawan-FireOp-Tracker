import { GoogleGenAI } from "@google/genai";
import { ActivityLog, OperationalPhase } from "../types";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API Key is missing. Please set process.env.API_KEY");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const generateExecutiveSummary = async (activities: ActivityLog[], phase: OperationalPhase | 'ALL'): Promise<string> => {
    const client = getClient();
    if (!client) return "ไม่พบ API Key กรุณาตรวจสอบการตั้งค่า";

    const filteredActivities = phase === 'ALL' 
        ? activities 
        : activities.filter(a => a.phase === phase);

    if (filteredActivities.length === 0) return "ไม่มีข้อมูลสำหรับการวิเคราะห์";

    // Serialize data for the prompt
    const dataString = filteredActivities.map(a => 
        `- [${a.date}] (${a.category}): ${a.title} - ${a.description}`
    ).join('\n');

    const prompt = `
    คุณคือผู้เชี่ยวชาญด้านการวางแผนกลยุทธ์ไฟป่า ของสถานีไฟป่าสลักพระ-เอราวัณ
    กรุณาสรุปผลการดำเนินงานสำหรับนำเสนอผู้บังคับบัญชา โดยใช้ข้อมูลดิบต่อไปนี้:
    
    ช่วงเวลา: ${phase === 'ALL' ? 'ตลอดปีงบประมาณ' : phase}
    
    ข้อมูลกิจกรรม:
    ${dataString}
    
    คำแนะนำ:
    1. สรุปภาพรวมผลการปฏิบัติงาน โดยเน้นตัวเลขและความสำเร็จที่สำคัญ (Key Achievements)
    2. วิเคราะห์แนวโน้ม (Trends) ที่น่าสนใจ
    3. ใช้ภาษาที่เป็นทางการ เหมาะสำหรับรายงานราชการไทย
    4. หากมีปัญหาอุปสรรคที่อนุมานได้ ให้ระบุพร้อมข้อเสนอแนะ
    
    ตอบเป็นภาษาไทย ในรูปแบบ Markdown ที่สวยงาม อ่านง่าย
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster summarization
            }
        });
        return response.text || "ไม่สามารถสร้างสรุปผลได้";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI";
    }
};

export const generateStrategicAdvice = async (activities: ActivityLog[]): Promise<string> => {
    const client = getClient();
    if (!client) return "ไม่พบ API Key";

    const prompt = `
    จากข้อมูลการปฏิบัติงานไฟป่าต่อไปนี้:
    ${JSON.stringify(activities.slice(-10))} 
    (ข้อมูลล่าสุด 10 รายการ)

    ขอคำแนะนำเชิงกลยุทธ์สั้นๆ 1 ย่อหน้า สำหรับหัวหน้าสถานีในการเตรียมความพร้อมหรือปรับปรุงงานในสัปดาห์หน้า
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "ไม่มีคำแนะนำ";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "เกิดข้อผิดพลาด";
    }
};
