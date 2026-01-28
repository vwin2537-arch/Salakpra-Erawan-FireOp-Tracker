
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ Error: GEMINI_API_KEY is missing in .env.local");
    process.exit(1);
}

// Mock Data representing current fire situation (Real-time snapshot)
const situationData = {
    date: new Date().toLocaleDateString('th-TH', { dateStyle: 'full' }),
    hotspots: {
        totalToday: 15,
        amphoeErawan: 4,
        amphoeSalakpra: 11,
        comparisonYesterday: "+5 (+50%)",
        topCluster: "บริเวณห้วยแม่ขมิ้น (พิกัด 47P 054xxxx)"
    },
    incidents: {
        responded: 8,
        preHotspotSuccess: 3,
        ongoing: 2,
        personnelDeployed: 45
    },
    weather: {
        temp: "38°C",
        humidity: "20%",
        wind: "SW 15 km/h (ลมแรง)"
    },
    resources: {
        droneAvailable: 2,
        waterTrucks: 1,
        teamsReady: 3
    }
};

async function analyzeStrategy() {
    console.log(`\n🔥 \x1b[33mFIRE OP INTELLIGENCE CENTER (AI POWERED)\x1b[0m`);
    console.log(`📅 Date: ${situationData.date}`);
    console.log(`------------------------------------------------`);
    console.log(`📊 \x1b[36mCollecting situation data...\x1b[0m`);
    console.log(`   - Hotspots Today: ${situationData.hotspots.totalToday} (Salakpra: ${situationData.hotspots.amphoeSalakpra}, Erawan: ${situationData.hotspots.amphoeErawan})`);
    console.log(`   - Trend: ${situationData.hotspots.comparisonYesterday}`);
    console.log(`   - Critical Cluster: ${situationData.hotspots.topCluster}`);
    console.log(`   - Weather: ${situationData.weather.temp}, Wind: ${situationData.weather.wind}`);
    console.log(`------------------------------------------------`);
    console.log(`🤖 \x1b[35mAnalyzing strategy with Gemini AI...\x1b[0m\n`);

    try {
        if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY') {
            console.log(`\n\x1b[33m⚠️ WARNING: Using Demo Mode (No API Key found)\x1b[0m`);
            console.log(`To enable real AI analysis, set GEMINI_API_KEY in .env.local\n`);

            // Mock Response for Demo
            const mockResponse = `## 🚨 Situation Assessment
**Severity: Warning (Watch Mode)**
Hotspots are increasing (+50% trend), particularly in Salakpra area. Weather conditions (High Temp, Strong Wind) pose a significant risk of rapid fire spread. The critical cluster at Huai Mae Khamin needs immediate containment.

## 🎯 Strategic Objectives (Next 24 Hours)
1. **Contain Huai Mae Khamin Cluster**: Prevent expansion into deep forest.
2. **Increase Patrol Frequency**: Focus on Salakpra border areas.
3. **Preparedness Check**: Ensure all water trucks and drone units are on standby for rapid deployment.

## 🛡️ Tactical Recommendations
- **Patrol Focus**: Deploy 2 teams to Salakpra (Huai Mae Khamin sector) and 1 team to screen Erawan border.
- **Drone Usage**: Use Drone #1 for thermal scanning over the cluster at 06:00 and 16:00. Drone #2 on standby for real-time spotting during operations.
- **Community Engagement**: Broadcast fire danger warnings to villages near the cluster immediately.

## ⚠️ Safety Warning
Wind gusts of 15 km/h from SW can drive fire unpredictably. **Ensure all ground teams assume upwind positions.** Hydration is critical due to 38°C heat.`;
            console.log(mockResponse);
            console.log(`\n------------------------------------------------`);
            console.log(`✅ Analysis Complete (Demo).`);
            return;
        }

        // Use gemini-1.5-flash which is widely available
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const prompt = `
        Act as a Fire Operation Commander and Strategist for Salakpra-Erawan Wildlife Sanctuaries.
        Analyze the following daily situation report and provide a strategic summary.

        SITUATION DATA:
        ${JSON.stringify(situationData, null, 2)}

        OUTPUT FORMAT (Markdown):
        ## 🚨 Situation Assessment
        (Assess the severity level: Normal / Warning / Critical, and explain why briefly)

        ## 🎯 Strategic Objectives (Next 24 Hours)
        (List 3 key prioritized objectives)

        ## 🛡️ Tactical Recommendations
        - **Patrol Focus**: (Where to send patrols based on cluster)
        - **Drone Usage**: (How to use the 2 available drones effectively)
        - **Community Engagement**: (Any PR needed?)

        ## ⚠️ Safety Warning
        (Specific safety advice based on weather/wind)
        `;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

        console.log(text);
        console.log(`\n------------------------------------------------`);
        console.log(`✅ Analysis Complete.`);

    } catch (error) {
        console.error("❌ AI Analysis Failed:", error);
    }
}

analyzeStrategy();
