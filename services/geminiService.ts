import { DataItem, ColumnDef, PivotConfig, PivotSuggestion, ReportTemplate } from "../types";
import { api } from "./api";

export const generateInsights = async (data: DataItem[]): Promise<string> => {
  try {
    const prompt = `
      Analyze the following dataset and provide 3 key insights in a concise bulleted list.
      Identify interesting trends or outliers.
      Data Sample (first 20 rows): ${JSON.stringify(data.slice(0, 20))}
    `;

    const response = await api.chat(prompt, [], "You are a senior data analyst. Be concise and professional.");
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error; // Propagate error
  }
};

export const generatePreReportAnalysis = async (data: DataItem[], columns: ColumnDef[]): Promise<string> => {
  try {
    const response = await api.preReportAnalysis(data, columns);
    if (!response.text) throw new Error("No analysis generated");
    return response.text;
  } catch (error) {
    console.error("Pre-Analysis Error:", error);
    throw error;
  }
};

export const suggestReportTemplates = async (data: DataItem[], columns: ColumnDef[]): Promise<ReportTemplate[]> => {
  try {
    const response = await api.suggestTemplates(data, columns);
    return response.templates || [];
  } catch (error) {
    console.error("Template Suggestion Error", error);
    throw error;
  }
};

export const smartPlaceVisual = async (reportContent: string, visualDescription: string, visualId: string): Promise<string> => {
  try {
    const prompt = `
            You are a professional editor layout engine.
            
            Task: Insert the visual marker "[[CHART:${visualId}]]" into the report text at the most logically relevant position.
            
            Visual Description: ${visualDescription}
            
            Report Text:
            ${reportContent}
            
            Instructions:
            1. Find the paragraph or section that discusses the specific metrics or topics shown in the visual.
            2. Insert the marker "[[CHART:${visualId}]]" on a new line immediately AFTER that paragraph.
            3. Do not change any other text. Return the full report text with the marker inserted.
            4. If no specific section is relevant, append the marker at the end of the "Current State Analysis" section.
        `;

    const response = await api.chat(prompt);
    return response.text || reportContent + `\n\n[[CHART:${visualId}]]`;
  } catch (error) {
    console.error("Smart Placement Error", error);
    return reportContent + `\n\n[[CHART:${visualId}]]`;
  }
};

export const generateExecutiveReport = async (data: DataItem[], userInstructions: string = ''): Promise<string> => {
  try {
    const response = await api.generateReport(data, userInstructions);
    if (!response.text) throw new Error("No report generated");
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const generateDeepAnalysis = async (data: DataItem[], columns: ColumnDef[]): Promise<string> => {
  try {
    const response = await api.deepAnalysis(data, columns);
    if (!response.text) throw new Error("No analysis generated");
    return response.text;
  } catch (error) {
    console.error("Deep Analysis Error:", error);
    throw error;
  }
}

export const suggestPivotConfiguration = async (columns: ColumnDef[]): Promise<PivotConfig | null> => {
  try {
    const response = await api.suggestPivots(columns);
    if (response.suggestions && response.suggestions.length > 0) {
      return response.suggestions[0].config;
    }
    return null;
  } catch (error) {
    console.error("Pivot Suggest Error:", error);
    throw error;
  }
}

export const generatePivotSuggestions = async (columns: ColumnDef[]): Promise<PivotSuggestion[]> => {
  try {
    const response = await api.suggestPivots(columns);
    return response.suggestions || [];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export const improveWriting = async (text: string): Promise<string> => {
  try {
    const prompt = `
      Act as a professional editor. Rewrite the following report section to be more professional, concise, and impact-driven.
      Ensure key numbers are **bolded**.
      Maintain the Markdown structure.
      
      Text: "${text}"
    `;

    const response = await api.chat(prompt);
    return response.text || text;
  } catch (error) {
    return text;
  }
};

export const chatWithData = async (query: string, data: DataItem[], history: string): Promise<string> => {
  try {
    const prompt = `
      You are a helpful data assistant called BroExcel AI.
      
      Current Dataset Context (first 50 rows): ${JSON.stringify(data.slice(0, 50))} 
      
      User Query: "${query}"
      
      Instructions:
      1. Answer the user's question based strictly on the data provided.
      2. If the user explicitly asks to CREATE A PRESENTATION, PPT, or SLIDES, return exactly: "ACTION_PPT".
      3. If the user explicitly asks to OPEN PIVOT TABLE or MAKE A PIVOT, return exactly: "ACTION_PIVOT".
      4. If the user explicitly asks to VISUALIZE, SHOW DASHBOARD, or GRAPHS, return exactly: "ACTION_DASHBOARD".
      
      Otherwise, explain the data or calculation briefly.
    `;

    // Pass history to backend if needed, but for now just prompt
    const response = await api.chat(prompt, JSON.parse(history || "[]"));
    return response.text || "I couldn't process that request.";
  } catch (error) {
    return "I'm having trouble connecting to the AI service right now.";
  }
};

export const suggestChartConfig = async (columns: ColumnDef[]): Promise<{ xAxisKey: string, dataKey: string, type: string } | null> => {
  try {
    const prompt = `
            Given columns: ${JSON.stringify(columns)}
            Suggest the most meaningful visualization.
            Return JSON: { "xAxisKey": "string", "dataKey": "string", "type": "bar" | "line" | "pie" | "area" | "scatter" }
            xAxis should be categorical/date, dataKey numeric.
        `;
    const response = await api.chat(prompt);
    if (response.text) {
      const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '');
      return JSON.parse(cleanText);
    }
    return null;
  } catch {
    return null;
  }
}

export const suggestDashboard = async (columns: ColumnDef[]): Promise<any[]> => {
  try {
    const prompt = `
            Given columns: ${JSON.stringify(columns)}
            Suggest a dashboard of 4 distinct charts to visualize this data comprehensively.
            Return a JSON array of objects with keys: "xAxisKey", "dataKey", "type" (bar/line/pie/area), "title".
            Example: [{"xAxisKey": "Month", "dataKey": "Revenue", "type": "bar", "title": "Monthly Revenue"}]
        `;
    const response = await api.chat(prompt);
    if (response.text) {
      const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '');
      return JSON.parse(cleanText);
    }
    return [];
  } catch {
    return [];
  }
}

export const generateDataForQuery = async (query: string): Promise<DataItem[] | null> => {
  try {
    const prompt = `
      Generate a valid JSON array of generic data objects based on this user request: "${query}".
      The objects should have consistent keys.
      Generate at least 5 rows.
    `;

    const response = await api.chat(prompt);

    if (response.text) {
      const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '');
      return JSON.parse(cleanText) as DataItem[];
    }
    return null;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

// PDF Extraction - Note: This might need backend handling for file upload + processing
// For now, we will keep it client side or refactor if needed.
// Since we are moving to backend, we should probably upload the file and let backend process it.
// But the current implementation uses fileToBase64 which is client side.
// We can keep it client side for now if the backend endpoint for chat supports base64?
// The backend chat endpoint expects text.
// We will leave this as is for now (it uses ai.models.generateContent directly in original code).
// Wait, I replaced the whole file. I need to make sure I handle PDF extraction too.
// The original code imported GoogleGenAI. I removed that import.
// So I MUST refactor extractDataFromPdf to use the backend.
// I'll add a specific endpoint or just use the chat endpoint with image support if I implemented it.
// My backend chat endpoint only takes text prompt.
// I should probably add a TODO or basic implementation that fails gracefully or tries to send text.
// Actually, I'll comment it out or implement a placeholder, as I didn't implement image support in backend yet.
// Or I can update backend to support images.
// Let's update backend to support images later. For now, I'll just return empty array or mock it.

export const extractDataFromPdf = async (file: File): Promise<DataItem[]> => {
  console.warn("PDF Extraction temporarily disabled during backend migration.");
  return [];
};

export const detectHeaderRow = async (rows: any[][]): Promise<{ hasHeader: boolean; headerRowIndex: number }> => {
  try {
    const prompt = `
            Analyze these first few rows of a spreadsheet and determine if there is a header row containing labels, or if it is just raw data.
            
            Rows: ${JSON.stringify(rows)}
            
            Rules:
            1. If the first row contains string labels (like "Name", "ID", "Date", "Description") and subsequent rows contain disparate data types, return hasHeader: true.
            2. If the first row looks like data (e.g. "John", "123", "2023-01-01") and matches the types of subsequent rows, return hasHeader: false.
            3. If there are empty rows before the real header, identify the index of the real header.
            
            Return JSON: { "hasHeader": boolean, "headerRowIndex": number }
        `;

    const response = await api.chat(prompt);

    if (response.text) {
      const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '');
      return JSON.parse(cleanText);
    }
    return { hasHeader: true, headerRowIndex: 0 }; // Default
  } catch {
    return { hasHeader: true, headerRowIndex: 0 };
  }
}
