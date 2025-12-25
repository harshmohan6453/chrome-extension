require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(bodyParser.json({ limit: '50mb' }));

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => {
    res.send('Website Analyzer API (Gemini Native) is running...');
});

app.post('/api/generate-prompt', async (req, res) => {
    try {
        const { image, context } = req.body;

        if (!image || !context) {
            return res.status(400).json({ error: 'Missing image or context' });
        }

        console.log('Received request. Analyzing with Gemini...');

        // Clean base64 string (remove header if present)
        const base64Image = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemPrompt = `
You are an expert UI/UX Engineer. Refine this AI prompt for a frontend component.
The user provided:
1. HTML/CSS Context.
2. A Screenshot.

Task:
- Compare code vs screenshot.
- Identify missing visual details (gradients, shadows, textures).
- Rewrite the prompt to be pixel-perfect.
- OUTPUT ONLY the final prompt. No markdown, no chat.
        `;

        const result = await model.generateContent([
            systemPrompt,
            `Context:\n${context}`,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/png"
                }
            }
        ]);

        const response = await result.response;
        const refinedPrompt = response.text();
        
        console.log('Gemini success.');
        res.json({ prompt: refinedPrompt });

    } catch (error) {
        console.error('Gemini Error:', error);
        res.status(500).json({ error: error.message || 'Server Error' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
