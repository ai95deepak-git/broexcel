import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import db, { query } from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const router = Router();
const upload = multer({ dest: 'uploads/' });
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // In production, use a strong secret env var

// Initialize Gemini
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });
const modelId = 'gemini-1.5-flash';

// Helper to clean JSON response
// Helper to clean JSON response
const cleanJson = (text: string) => {
    try {
        // Remove markdown code blocks if present
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Find the first '[' or '{'
        const firstOpenBrace = cleaned.indexOf('{');
        const firstOpenBracket = cleaned.indexOf('[');

        let start = -1;
        if (firstOpenBrace !== -1 && firstOpenBracket !== -1) {
            start = Math.min(firstOpenBrace, firstOpenBracket);
        } else {
            start = Math.max(firstOpenBrace, firstOpenBracket);
        }

        // Find the last ']' or '}'
        const lastCloseBrace = cleaned.lastIndexOf('}');
        const lastCloseBracket = cleaned.lastIndexOf(']');
        const end = Math.max(lastCloseBrace, lastCloseBracket);

        if (start !== -1 && end !== -1 && end > start) {
            return cleaned.substring(start, end + 1);
        }
        return cleaned;
    } catch (e) {
        return text; // Return original if something goes wrong
    }
};

if (!apiKey) {
    console.warn("WARNING: API_KEY is not set in environment variables!");
} else {
    console.log("API_KEY is configured.");
}

// --- Auth Routes ---


// --- Auth Routes ---

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, mobile, name } = req.body;
        console.log(`[Register Attempt] Email: ${email}, Mobile: ${mobile}, Name: ${name}`);

        if ((!email && !mobile) || !password) {
            return res.status(400).json({ error: 'Email/Mobile and password are required' });
        }

        // Check if user exists (by email or mobile)
        const userCheck = await query(
            'SELECT * FROM users WHERE email = $1 OR mobile_number = $2',
            [email || '', mobile || '']
        );

        if (userCheck.rows.length > 0) {
            console.log(`[Register Failed] User already exists: ${email || mobile}`);
            return res.status(400).json({ error: 'User already exists with this email or mobile number' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Create user
        const result = await query(
            'INSERT INTO users (email, mobile_number, password_hash, name) VALUES ($1, $2, $3, $4) RETURNING id',
            [email, mobile, hash, name]
        );

        const userId = result.rows[0].id;
        const user = { id: userId, email, mobile_number: mobile, name };
        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '24h' });

        console.log(`[Register Success] User created: ${email} (ID: ${userId})`);
        res.status(201).json({ user, token });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body; // identifier can be email or mobile
        console.log(`[Login Attempt] Identifier: ${identifier}`);

        // Find user by email OR mobile
        const result = await query(
            'SELECT * FROM users WHERE email = $1 OR mobile_number = $2',
            [identifier, identifier]
        );

        if (result.rows.length === 0) {
            console.log(`[Login Failed] User not found for identifier: ${identifier}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        console.log(`[Login Success] User found: ${user.email} (ID: ${user.id})`);

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log(`[Login Failed] Password mismatch for user: ${user.email}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            user: { id: user.id, email: user.email, mobile: user.mobile_number, name: user.name, created_at: user.created_at },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Forgot Password (Public)
router.post('/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Check if user exists
        const userCheck = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length === 0) {
            // Don't reveal if user exists or not for security, but for dev we log it
            console.log(`[Forgot Password] Email not found: ${email}`);
            return res.json({ success: true, message: "If an account exists, an OTP has been sent." });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP
        await query(
            'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)',
            [email, code, expiresAt]
        );

        console.log(`[OTP SENT] To: ${email}, Code: ${code}`);
        res.json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Reset Password (Public)
router.post('/auth/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Verify OTP
        const otpResult = await query(
            'SELECT * FROM otp_codes WHERE email = $1 AND code = $2 AND expires_at > $3 ORDER BY created_at DESC LIMIT 1',
            [email, otp, new Date().toISOString()]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        // Update password
        const updateResult = await query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);

        if (updateResult.rowCount === 0) {
            return res.status(400).json({ error: "User not found" });
        }

        // Clean up used OTPs
        await query('DELETE FROM otp_codes WHERE email = $1', [email]);

        res.json({ success: true, message: "Password reset successfully" });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ error: "Failed to reset password" });
    }
});

// Get Current User (Verify Token)
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const result = await query('SELECT id, email, mobile_number, name, created_at FROM users WHERE id = $1', [decoded.id]);

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

        const text = response.text;
        if (!text) throw new Error("Empty response from AI");

        res.json({ text });
    } catch (error: any) {
        console.error("Report Gen Error:", error);
        res.status(500).json({ error: "Failed to generate report" });
    }
});

// --- Fallback Generators ---

const generateFallbackPivots = (columns: any[]) => {
    const numericCols = columns.filter(c => c.type === 'number' || c.type === 'numeric').map(c => c.key);
    const catCols = columns.filter(c => c.type === 'string' || c.type === 'text').map(c => c.key);

    if (numericCols.length === 0 || catCols.length === 0) return [];

    const suggestions = [];

    // Suggestion 1: Simple Sum
    if (catCols.length > 0 && numericCols.length > 0) {
        suggestions.push({
            title: `Sum of ${numericCols[0]} by ${catCols[0]}`,
            description: `Analyze total ${numericCols[0]} across different ${catCols[0]} categories.`,
            config: { rowKey: catCols[0], colKey: catCols.length > 1 ? catCols[1] : catCols[0], valueKey: numericCols[0], aggregation: 'sum' }
        });
    }

    // Suggestion 2: Average
    if (catCols.length > 0 && numericCols.length > 0) {
        suggestions.push({
            title: `Average ${numericCols[0]} by ${catCols[0]}`,
            description: `See the average performance of ${numericCols[0]} for each ${catCols[0]}.`,
            config: { rowKey: catCols[0], colKey: catCols.length > 1 ? catCols[1] : catCols[0], valueKey: numericCols[0], aggregation: 'average' }
        });
    }

    return suggestions;
};

const generateFallbackTemplates = (columns: any[]) => {
    return [
        {
            id: 'fallback_1',
            title: 'General Data Overview',
            description: 'A comprehensive summary of all key metrics and trends.',
            instruction: 'Analyze the dataset generally, focusing on key performance indicators and outliers.',
            icon: 'general'
        },
        {
            id: 'fallback_2',
            title: 'Performance Analysis',
            description: 'Focus on high and low performing areas.',
            instruction: 'Identify top and bottom performers based on numeric metrics.',
            icon: 'trend'
        },
        {
            id: 'fallback_3',
            title: 'Financial / Numeric Audit',
            description: 'Detailed breakdown of numeric values.',
            instruction: 'Perform a detailed audit of all financial or numeric columns.',
            icon: 'finance'
        }
    ];
};

router.post('/analyze/pivot', async (req: Request, res: Response): Promise<void> => {
    try {
        const { columns } = req.body;
        const prompt = `
            Given these columns: ${JSON.stringify(columns)}
            
            Suggest 3 DISTINCT and valuable pivot table configurations to analyze this data.
            Explain why each view is useful.
            
            Return a JSON array of objects strictly matching this schema.
            CRITICAL: Return ONLY the raw JSON. Do not use markdown code blocks. Do not add any introductory text.
            The response must start with [ and end with ].
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

        try {
            if (!apiKey) throw new Error("No API Key");

            const response = await ai.models.generateContent({
                model: modelId,
                contents: prompt
            });

            const text = response.text || "[]";
            console.log("Pivot Raw AI Response:", text);
            const suggestions = JSON.parse(cleanJson(text));

            if (!Array.isArray(suggestions) || suggestions.length === 0) throw new Error("AI returned empty or invalid JSON");

            res.json({ suggestions });

        } catch (aiError) {
            console.warn("AI Pivot Failed, using fallback:", aiError);
            const fallback = generateFallbackPivots(columns);
            res.json({ suggestions: fallback });
        }
    } catch (error: any) {
        console.error("Pivot Route Error:", error);
        res.status(500).json({ error: "Server error" });
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

        if (!apiKey) {
            res.json({ text: "## Analysis Unavailable\n\nAI service is not configured. Please check your API key." });
            return;
        }

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt
        });

        res.json({ text: response.text });
    } catch (error: any) {
        console.error("Deep Analysis Error:", error);
        res.json({ text: "## Analysis Failed\n\nCould not generate analysis at this time." });
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
            The response must start with [ and end with ].
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

        try {
            if (!apiKey) throw new Error("No API Key");

            const response = await ai.models.generateContent({
                model: modelId,
                contents: prompt
            });

            const text = response.text || "[]";
            console.log("Template Raw AI Response:", text);
            const templates = JSON.parse(cleanJson(text));

            if (!Array.isArray(templates) || templates.length === 0) throw new Error("AI returned empty or invalid JSON");

            res.json({ templates });
        } catch (aiError) {
            console.warn("AI Template Failed, using fallback:", aiError);
            const fallback = generateFallbackTemplates(columns);
            res.json({ templates: fallback });
        }
    } catch (error: any) {
        console.error("Template Route Error:", error);
        res.status(500).json({ error: "Server error" });
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

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = { userId: user.id, email: user.email };
        next();
    });
};

// --- Data Persistence Routes ---

router.get('/data', authenticateToken, async (req: any, res) => {
    try {
        const result = await query('SELECT * FROM datasets WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
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

router.post('/data', authenticateToken, async (req: any, res) => {
    const { name, data, columns } = req.body;
    try {
        const result = await query(
            'INSERT INTO datasets (name, data, columns, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, JSON.stringify(data), JSON.stringify(columns), req.user.userId]
        );
        res.json({ id: result.rows[0].id, success: true });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ error: "Failed to save dataset" });
    }
});

router.put('/data/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const result = await query(
            'UPDATE datasets SET name = $1 WHERE id = $2 AND user_id = $3',
            [name, id, req.user.userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Dataset not found or unauthorized" });
        }
        res.json({ success: true, dataset: { id, name } });
    } catch (err) {
        console.error("Rename Error:", err);
        res.status(500).json({ error: "Failed to rename dataset" });
    }
});

router.delete('/data/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const result = await query(
            'DELETE FROM datasets WHERE id = $1 AND user_id = $2',
            [id, req.user.userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Dataset not found or unauthorized" });
        }
        res.json({ success: true, id });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: "Failed to delete dataset" });
    }
});

router.post('/auth/send-otp', authenticateToken, async (req: any, res) => {
    try {
        const { email } = req.user;
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save OTP
        await query(
            'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)',
            [email, code, expiresAt]
        );

        // In a real app, send email here. For now, log it.
        console.log(`[OTP SENT] To: ${email}, Code: ${code}`);

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        console.error("Send OTP Error:", err);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

router.post('/auth/verify-otp', authenticateToken, async (req: any, res) => {
    const { code } = req.body;
    try {
        const { email } = req.user;
        const result = await query(
            'SELECT * FROM otp_codes WHERE email = $1 AND code = $2 AND expires_at > $3 ORDER BY created_at DESC LIMIT 1',
            [email, code, new Date().toISOString()]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        res.json({ success: true, message: "OTP verified" });
    } catch (err) {
        console.error("Verify OTP Error:", err);
        res.status(500).json({ error: "Failed to verify OTP" });
    }
});

router.post('/auth/change-password', authenticateToken, async (req: any, res) => {
    const { otp, newPassword } = req.body;
    try {
        const { email, userId } = req.user;

        // Verify OTP again to be safe
        const otpResult = await query(
            'SELECT * FROM otp_codes WHERE email = $1 AND code = $2 AND expires_at > $3 ORDER BY created_at DESC LIMIT 1',
            [email, otp, new Date().toISOString()]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        // Update password
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

        // Clean up used OTPs
        await query('DELETE FROM otp_codes WHERE email = $1', [email]);

        res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        console.error("Change Password Error:", err);
        res.status(500).json({ error: "Failed to change password" });
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
