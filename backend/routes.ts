import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import db from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const router = Router();
const upload = multer({ dest: 'uploads/' });
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // In production, use a strong secret env var

// Initialize Gemini
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });
const modelId = 'gemini-2.5-flash';

// Helper to clean JSON response
const cleanJson = (text: string) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- Auth Routes ---

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await db.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, hash]
        );

        const user = newUser.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({ user, token });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            user: { id: user.id, email: user.email, created_at: user.created_at },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Current User (Verify Token)
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const result = await db.query('SELECT id, email, created_at FROM users WHERE id = $1', [decoded.id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        res.json(result.rows[0]);
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// --- AI Routes ---

router.post('/chat', async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt, history, systemInstruction } = req.body;

        if (!apiKey) {
            res.status(500).json({ error: "API Key not configured on server." });
            return;
        }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: { systemInstruction }
        });

        res.json({ text: response.text });

    } catch (error: any) {
        console.error("AI Error:", error);
        res.status(500).json({ error: error.message || "AI Generation failed" });
    }
});

router.post('/analyze/report', async (req: Request, res: Response): Promise<void> => {
    try {
        const { data, userInstructions } = req.body;
        const sampleData = data.slice(0, 50); // Limit tokens
        const columns = data.length > 0 ? Object.keys(data[0]).join(', ') : 'Unknown';

        const instructionsPrompt = userInstructions
            ? `USER INSTRUCTIONS (MUST FOLLOW): ${userInstructions}`
            : "Standard comprehensive business analysis.";

        const prompt = `
        You are an expert Senior Operations Analyst writing a formal business report.
        
        CRITICAL INSTRUCTION: 
        1. You must generate this report based SOLELY on the provided dataset sample below. 
        2. Do NOT hallucinate facts, companies, or metrics not present in the data.
        3. ${instructionsPrompt}
        
        Follow this STRICT BUSINESS REPORT FORMAT:

        # [Create a Specific, Professional Title based on the Data Context]
        
        **Prepared by:** BroExcel Analyst
        **Date:** ${new Date().toLocaleDateString()}
        **To:** Executive Stakeholders

        ## 1. Executive Summary
        (Write a high-level summary of the entire report in 1 paragraph. Briefly state the problem found in the data, the analysis performed, and the expected result.)

        ## 2. Introduction
        **Background:** (Describe the dataset: This dataset contains ${data.length} records tracking columns such as ${columns}.)
        **Problem Statement:** (Identify inefficiencies, variance, or trends visible in the data.)
        **Objective:** (The goal of this report is to analyze these metrics to identify key drivers and propose actionable solutions.)

        ## 3. Methodology
        (State that you analyzed the raw dataset focusing on key performance indicators available in the columns.)

        ## 4. Current State Analysis
        **Findings:** 
        *   (Observation 1 based on data)
        *   (Observation 2 based on data)
        *   (Observation 3 based on data)

        **Data Evidence:** (You MUST cite specific numbers from the data. Use **bold** for key metrics, e.g., "**$12,500 revenue**" or "**15% variance**".)

        ## 5. Recommendations
        **Specific Action:** (What should be done based on the analysis?)
        **Cost/Benefit:** (Estimate the impact based on the data trends.)
        **Timeline:** (Suggest a timeline, e.g., "Immediate" or "Next Quarter")

        ## 6. Conclusion
        (A professional wrap-up sentence.)

        --------------------------------------------------
        DATASET CONTEXT FOR ANALYSIS:
        Columns: ${columns}
        Total Rows: ${data.length}
        Data Sample (up to 50 rows): ${JSON.stringify(sampleData)}
        --------------------------------------------------
        
        FORMATTING RULES:
        - Output strictly in Markdown.
        - Ensure headers correspond to the sections above.
        - Tone: Objective, Professional, Analytical.
      `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt
        });

        res.json({ text: response.text });
    } catch (error: any) {
        console.error("Report Gen Error:", error);
        res.status(500).json({ error: "Failed to generate report" });
    }
});

router.post('/analyze/pivot', async (req: Request, res: Response): Promise<void> => {
    try {
        const { columns } = req.body;
        const prompt = `
            Given these columns: ${JSON.stringify(columns)}
            
            Suggest 3 DISTINCT and valuable pivot table configurations to analyze this data.
            Explain why each view is useful.
            
            Return a JSON array of objects strictly matching this schema.
            CRITICAL: Return ONLY the raw JSON. Do not use markdown code blocks. Do not add any introductory text.
            [
              {
                "title": "Title of the view",
                "description": "Why this is interesting...",
                "config": { 
                    "rowKey": "column_name", 
                    "colKey": "column_name", 
                    "valueKey": "numeric_column_name", 
                    "aggregation": "sum" (or count/average/min/max)
                }
              }
            ]
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt
        });

        const text = response.text || "[]";
        console.log("Pivot Raw AI Response:", text);
        res.json({ suggestions: JSON.parse(cleanJson(text)) });
    } catch (error: any) {
        console.error("Pivot Gen Error:", error);
        res.json({ suggestions: [] });
    }
});

router.post('/analyze/deep', async (req: Request, res: Response): Promise<void> => {
    try {
        const { data, columns } = req.body;
        const sampleData = data.slice(0, 50);

        const prompt = `
        Perform a deep structural and content analysis of this dataset.
        
        Columns available: ${JSON.stringify(columns)}
        Data Sample: ${JSON.stringify(sampleData)}

        Provide the output in the following Markdown format:
        ## Data Health
        (Comment on data quality, missing values, or consistency)

        ## Statistical Highlights
        (Provide max/min/average for numeric columns if relevant)

        ## Strategic Insights
        (What is this data telling us about the business/subject?)

        ## Recommendations for Reporting
        (Suggest 3 specific charts to create, e.g., "Bar chart of [Column A] vs [Column B]")
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt
        });

        res.json({ text: response.text });
    } catch (error: any) {
        console.error("Deep Analysis Error:", error);
        res.status(500).json({ error: "Deep analysis failed" });
    }
});

router.post('/analyze/templates', async (req: Request, res: Response): Promise<void> => {
    try {
        const { data, columns } = req.body;
        const sampleData = data.slice(0, 20);

        const prompt = `
            Analyze this dataset structure and content.
            Suggest 3 distinct, professional report "Models" or templates that would be useful for this specific data.
            
            Columns: ${JSON.stringify(columns)}
            Data Sample: ${JSON.stringify(sampleData)}
            
            Return a JSON array of objects with this schema.
            CRITICAL: Return ONLY the raw JSON. Do not use markdown code blocks. Do not add any introductory text.
            [
                {
                    "id": "unique_string",
                    "title": "Short catchy title (e.g. Sales Performance Review)",
                    "description": "One sentence description of what this report focuses on.",
                    "instruction": "The full instruction prompt to pass to the writer to generate this specific report.",
                    "icon": "trend" | "finance" | "audit" | "general" (Choose best fit)
                }
            ]
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt
        });

        const text = response.text || "[]";
        console.log("Template Raw AI Response:", text);
        res.json({ templates: JSON.parse(cleanJson(text)) });
    } catch (error: any) {
        console.error("Template Error:", error);
        res.json({ templates: [] });
    }
});

router.post('/analyze/pre-report', async (req: Request, res: Response): Promise<void> => {
    try {
        const { data, columns } = req.body;
        const sampleData = data.slice(0, 50);

        const prompt = `
            You are a Senior Data Analyst preparing to write a formal business report.
            
            Step 1: Analyze the provided dataset sample deeply.
            Step 2: Summarize the key trends, anomalies, and performance metrics found.
            Step 3: Propose 3 potential angles/focus areas for the report (e.g., "Cost Reduction", "Growth Strategy", "Operational Efficiency").
            Step 4: Ask the user clarifying questions about their preference for the report's tone, focus, or specific metrics.

            Dataset Columns: ${JSON.stringify(columns)}
            Data Sample (first 50 rows): ${JSON.stringify(sampleData)}

            Output Format (Markdown):
            # Preliminary Data Analysis
            ## Key Insights
            (Bullet points of what the data shows)
            
            ## Proposed Report Angles
            (Options for the user)

            ## Questions for You
            (Ask the user how they want the final report structured)
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt
        });

        res.json({ text: response.text });
    } catch (error: any) {
        console.error("Pre-Analysis Error:", error);
        res.status(500).json({ error: "Pre-analysis failed" });
    }
});

router.get('/', (req, res) => {
    res.send('BroExcel Backend is running. API is at /api');
});

// --- Data Persistence Routes ---

router.get('/data', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM datasets ORDER BY created_at DESC');
        const parsed = result.rows.map((d: any) => ({
            ...d,
            data: JSON.parse(d.data),
            columns: JSON.parse(d.columns)
        }));
        res.json(parsed);
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ error: "Failed to fetch datasets" });
    }
});

router.post('/data', async (req, res) => {
    const { name, data, columns } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO datasets (name, data, columns) VALUES ($1, $2, $3) RETURNING id',
            [name, JSON.stringify(data), JSON.stringify(columns)]
        );
        res.json({ id: result.rows[0].id, success: true });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ error: "Failed to save dataset" });
    }
});

// --- File Upload Route ---
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }
    res.json({ message: "File uploaded successfully", filename: req.file.filename });
});
