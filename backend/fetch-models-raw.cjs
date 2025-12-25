require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function main() {
    console.log("Fetching models from:", URL.replace(API_KEY, "KEY_HIDDEN"));
    try {
        const response = await fetch(URL);
        const data = await response.json();
        
        if (data.error) {
            console.error("API Error:", data.error);
        } else if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
        } else {
            console.log("No models found or unexpected format:", data);
        }
    } catch (error) {
        console.error("Network Error:", error.message);
    }
}

main();
