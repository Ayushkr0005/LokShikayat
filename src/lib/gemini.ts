import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. AI features will be disabled.");
      // We still initialize with a dummy key to avoid breaking the SDK if it's strictly required, 
      // but the calls will fail gracefully later.
      aiInstance = new GoogleGenAI({ apiKey: "MISSING_KEY" });
    } else {
      aiInstance = new GoogleGenAI({ apiKey });
    }
  }
  return aiInstance;
}

export async function analyzeComplaint(text: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following citizen grievance for the Lok Shikayat system and return a JSON object with:
        - sentiment: number (0 to 1, where 0 is very negative/angry and 1 is positive/neutral)
        - category: string (one of: Infrastructure, Sanitation, Traffic, Noise, Safety, Utilities, Environment, Other)
        - priority: string (one of: low, medium, high, critical)
        - summary: string (max 100 chars)
        
        Complaint: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.NUMBER },
            category: { type: Type.STRING },
            priority: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["sentiment", "category", "priority", "summary"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
}

export async function getDashboardInsights(complaints: any[]) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on these recent complaints, provide 3 executive insights for the dashboard. 
        Return an array of strings.
        
        Complaints: ${JSON.stringify(complaints.map(c => ({ title: c.title, status: c.status })))}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return [];
  }
}
