require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Test Script",
    }
});

async function main() {
    try {
        console.log("Testing OpenRouter connection...");
        const response = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [{ role: "user", content: "Hello" }],
        });
        console.log("Success! Response:", response.choices[0].message.content);
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
