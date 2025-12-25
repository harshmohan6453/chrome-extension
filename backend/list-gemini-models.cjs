require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // While the SDK wraps this, sometimes simpler to fetch directly to debug
  // But let's try the fallback stable model first in a dry run
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("gemini-1.5-flash works:", result.response.text());
  } catch (e) {
    console.log("gemini-1.5-flash failed:", e.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hello");
    console.log("gemini-pro works:", result.response.text());
  } catch (e) {
    console.log("gemini-pro failed:", e.message);
  }
}

main();
