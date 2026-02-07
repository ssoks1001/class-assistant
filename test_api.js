
import { GoogleGenAI } from "@google/genai";

// Hardcoding key for test purpose only to ensure no env var issues
const apiKey = "AIzaSyDsEmpEZ02u5NcYN91Z8x6UIf4QLtm8AOI";

console.log("Testing Gemini API with Key: " + apiKey.substring(0, 10) + "...");

async function testApi() {
    try {
        const ai = new GoogleGenAI({ apiKey: apiKey, apiVersion: 'v1' });
        console.log("SDK Initialized. Requesting model gemini-2.0-flash...");

        // Simple text test
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: [{ text: 'Hello, are you working?' }]
                }
            ]
        });

        console.log("Model response received:");
        console.log(response.text);

        console.log("--------------------------------");
        console.log("SUCCESS: API and model 'gemini-2.0-flash' are functioning correctly.");
    } catch (error) {
        console.error("--------------------------------");
        console.error("FAILURE: API call failed.");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.cause) console.error("Cause:", error.cause);
    }
}

testApi();
