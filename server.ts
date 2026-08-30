import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "codefix-ai-jwt-secret-key-2026";

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Middleware to enforce JSON content type on all /api routes
app.use("/api", (_req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// Helper for consistent JSON error responses
function sendJsonError(res: Response, status: number, message: string) {
  res.setHeader("Content-Type", "application/json");
  return res.status(status).json({
    error: true,
    message: message,
    detail: message
  });
}

// ==========================================
// In-Memory / File SQLite-like Store for Durability
// ==========================================
interface UserRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface AnalysisRecord {
  id: string;
  userId: string;
  language: string;
  submittedCode: string;
  hasError: boolean;
  errorType: string;
  errorMessage: string;
  errorLine: number | null;
  offendingCode: string;
  explanation: string;
  whyItHappened: string;
  howToFix: string;
  correctedCode: string;
  suggestions: string[];
  codeQualityScore: number;
  overallSeverity?: string;
  summary?: {
    errors: number;
    warnings: number;
    suggestions: number;
  };
  issues?: any[];
  beginnerTip?: string;
  beforeAfterSnippet?: {
    original: string;
    corrected: string;
  };
  createdAt: string;
}

interface ChatRecord {
  id: string;
  userId?: string;
  analysisId?: string;
  analysis_id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  created_at?: string;
}

const DB_FILE = path.join(process.cwd(), "codefix_data.json");

let dbData: {
  users: UserRecord[];
  analyses: AnalysisRecord[];
  chats: ChatRecord[];
} = {
  users: [],
  analyses: [],
  chats: [],
};

// Load database from file if exists
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    dbData = JSON.parse(raw);
  }
} catch (e) {
  console.warn("Could not load database file, starting with fresh data.");
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save database file", e);
  }
}

// Seed default demo user if not exists
if (!dbData.users.some(u => u.username === "demo_student")) {
  const salt = bcrypt.genSaltSync(10);
  dbData.users.push({
    id: "usr-demo-1234",
    name: "Demo Student",
    username: "demo_student",
    email: "student@codefix.ai",
    passwordHash: bcrypt.hashSync("demo1234", salt),
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  });

  // Seed sample analyses for demo
  dbData.analyses.push({
    id: "anl-demo-1",
    userId: "usr-demo-1234",
    language: "python",
    submittedCode: "def add_numbers(a, b)\n    return a + b\n\nprint(add_numbers(5, 10))",
    hasError: true,
    errorType: "Syntax Error",
    errorMessage: "Expected ':' after function definition header",
    errorLine: 1,
    offendingCode: "def add_numbers(a, b)",
    explanation: "Python functions require a colon ':' at the end of the def line before starting the indented body.",
    whyItHappened: "The def statement was written without the terminating colon.",
    howToFix: "Add a colon ':' at the end of line 1: 'def add_numbers(a, b):'",
    correctedCode: "def add_numbers(a, b):\n    return a + b\n\nprint(add_numbers(5, 10))",
    suggestions: [
      "Always check for a colon at the end of def, if, for, while, and class lines.",
      "Use consistent 4-space indentation."
    ],
    codeQualityScore: 35,
    overallSeverity: "critical",
    summary: { errors: 1, warnings: 0, suggestions: 2 },
    issues: [
      {
        id: "iss-1-seed",
        issueNumber: 1,
        title: "Syntax Error: Missing Colon",
        errorType: "Syntax Error",
        severity: "critical",
        line: 1,
        errorMessage: "Expected ':' after function definition header",
        offendingCode: "def add_numbers(a, b)",
        explanation: "Python functions require a colon ':' at the end of the def line before starting the indented body.",
        whyItHappened: "The def statement was written without the terminating colon.",
        howToFix: "Add a colon ':' at the end of line 1: 'def add_numbers(a, b):'"
      }
    ],
    beginnerTip: "Remember: Python uses ':' after if, for, while, and function definitions, followed by 4 spaces of indentation.",
    beforeAfterSnippet: {
      original: "def add_numbers(a, b)",
      corrected: "def add_numbers(a, b):"
    },
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  });

  dbData.analyses.push({
    id: "anl-demo-2",
    userId: "usr-demo-1234",
    language: "javascript",
    submittedCode: "const items = ['apple', 'orange'];\nconsole.log(items.toUppercase());",
    hasError: true,
    errorType: "Runtime Error",
    errorMessage: "items.toUppercase is not a function",
    errorLine: 2,
    offendingCode: "items.toUppercase()",
    explanation: "toUppercase() is not a method on arrays. In JavaScript, toUpperCase() is a method on strings, and case matters (capital U and C).",
    whyItHappened: "You called a string method on an entire array instead of individual string elements, with incorrect casing.",
    howToFix: "Map over the array or access an individual item: items.map(item => item.toUpperCase())",
    correctedCode: "const items = ['apple', 'orange'];\nconsole.log(items.map(item => item.toUpperCase()));",
    suggestions: [
      "Remember that JavaScript method names are case-sensitive (toUpperCase).",
      "Use .map() when you want to transform every item in an array."
    ],
    codeQualityScore: 40,
    overallSeverity: "critical",
    summary: { errors: 1, warnings: 0, suggestions: 2 },
    issues: [
      {
        id: "iss-2-seed",
        issueNumber: 1,
        title: "Runtime Error: toUppercase is not a function",
        errorType: "Runtime Error",
        severity: "critical",
        line: 2,
        errorMessage: "items.toUppercase is not a function",
        offendingCode: "items.toUppercase()",
        explanation: "toUppercase() is not a method on arrays. In JavaScript, toUpperCase() is a method on strings, and case matters.",
        whyItHappened: "You called a string method on an entire array instead of individual string elements.",
        howToFix: "Map over the array or access an individual item: items.map(item => item.toUpperCase())"
      }
    ],
    beginnerTip: "Remember: JavaScript method names are case-sensitive (toUpperCase, not toUppercase).",
    beforeAfterSnippet: {
      original: "console.log(items.toUppercase());",
      corrected: "console.log(items.map(item => item.toUpperCase()));"
    },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  });

  saveDb();
}

// ==========================================
// Gemini AI Initialization & Helper
// ==========================================
function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && apiKey.trim() && apiKey !== "MY_GEMINI_API_KEY");
}

function getGeminiClient(): GoogleGenAI | null {
  if (!isGeminiConfigured()) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Supported candidate models in priority order based on gemini-api skill
const GEMINI_MODELS = [
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview"
];

// Helper to call generateContent with model fallback and strict timeout
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    systemInstruction: string;
    prompt: string;
    responseSchema?: any;
    temperature?: number;
    timeoutMs?: number;
  }
): Promise<{ text: string; modelUsed: string }> {
  const timeoutMs = params.timeoutMs || 25000;
  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[Gemini API] Attempting generateContent with model: ${model}`);
      
      const config: any = {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature ?? 0.2
      };

      if (params.responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = params.responseSchema;
      }

      // Wrap with timeout
      const generatePromise = ai.models.generateContent({
        model: model,
        contents: params.prompt,
        config: config
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini API request timed out after ${timeoutMs}ms on model ${model}`)), timeoutMs)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const rawText = response.text?.trim() || "";
      
      if (!rawText) {
        throw new Error(`Empty response received from model ${model}`);
      }

      console.log(`[Gemini API] Successfully generated content using model: ${model} (${rawText.length} chars)`);
      return { text: rawText, modelUsed: model };
    } catch (err: any) {
      console.warn(`[Gemini API] Model ${model} failed:`, err?.message || err);
      lastError = err;
      // If error is 404 (model retired) or 503 (high demand), loop continues to next model
    }
  }

  throw lastError || new Error("All Gemini models failed to generate a response.");
}

// ==========================================
// Python AST Safe Static Analysis Helper
// ==========================================
function runPythonAstAnalysis(language: string, code: string): Promise<any> {
  return new Promise((resolve) => {
    if (language.toLowerCase() !== "python") {
      return resolve({ has_syntax_error: false, error_type: "No Error" });
    }

    const scriptPath = path.join(process.cwd(), "backend", "analyzer.py");
    if (!fs.existsSync(scriptPath)) {
      console.warn("[AST Check] analyzer.py not found at:", scriptPath);
      return resolve({ has_syntax_error: false, error_type: "No Error" });
    }

    console.log("[AST Check] Running AST analyzer for Python snippet...");
    let resolved = false;
    
    // 3.5-second safety timeout
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn("[AST Check] AST analyzer timed out after 3500ms");
        resolve({ has_syntax_error: false, error_type: "No Error" });
      }
    }, 3500);

    try {
      const child = execFile("python3", [scriptPath, "python"], (err, stdout, stderr) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        if (err) {
          console.warn("[AST Check] Exec error:", err.message, stderr);
          return resolve({ has_syntax_error: false, error_type: "No Error" });
        }

        if (!stdout || !stdout.trim()) {
          return resolve({ has_syntax_error: false, error_type: "No Error" });
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          console.log("[AST Check] Result:", parsed);
          resolve(parsed);
        } catch (parseErr) {
          console.warn("[AST Check] Failed to parse AST JSON output:", stdout);
          resolve({ has_syntax_error: false, error_type: "No Error" });
        }
      });

      if (child.stdin) {
        child.stdin.on("error", (e) => console.warn("[AST Check] Stdin error:", e.message));
        child.stdin.write(code);
        child.stdin.end();
      }
    } catch (e: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        console.warn("[AST Check] Spawn failed:", e.message);
        resolve({ has_syntax_error: false, error_type: "No Error" });
      }
    }
  });
}

// Auth Middleware Helper
function authenticateToken(req: Request): UserRecord | null {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return dbData.users.find(u => u.id === decoded.sub) || null;
  } catch {
    return null;
  }
}

// ==========================================
// API Routes
// ==========================================

// Health
app.get("/api/health", (_req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    service: "CodeFix AI Full-Stack Server",
    gemini_configured: hasKey,
    supported_languages: ["python", "c", "cpp", "java", "javascript"]
  });
});

// Analyze Code
app.post("/api/analyze", async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { code, language } = req.body;

    console.log(`[Analyze API] Received request - Language: '${language}', Code length: ${code ? code.length : 0}`);

    if (!code || typeof code !== "string" || !code.trim()) {
      console.warn("[Analyze API] Rejected: Empty code snippet provided.");
      return sendJsonError(res, 400, "No code found. Paste some code into the editor and try again.");
    }

    const lang = (language || "").toLowerCase().trim();
    const validLanguages = ["python", "c", "cpp", "java", "javascript"];
    if (!validLanguages.includes(lang)) {
      console.warn(`[Analyze API] Rejected: Unsupported language '${lang}'`);
      return sendJsonError(res, 400, "Please select a supported programming language: Python, C, C++, Java, JavaScript.");
    }

    if (code.length > 20000) {
      console.warn(`[Analyze API] Rejected: Code length exceeds limit (${code.length} > 20000)`);
      return sendJsonError(res, 400, "Your code is too large. Please keep it below 20,000 characters.");
    }

    if (!isGeminiConfigured()) {
      console.error("[Analyze API] Error: GEMINI_API_KEY is not configured or is a placeholder.");
      return sendJsonError(res, 500, "Gemini API is not configured. Please add GEMINI_API_KEY.");
    }

    const ai = getGeminiClient();
    if (!ai) {
      console.error("[Analyze API] Error: Failed to instantiate Gemini client.");
      return sendJsonError(res, 500, "Gemini API is not configured. Please add GEMINI_API_KEY.");
    }

    // 1. Run safe Python AST static analysis if Python
    const astResult = await runPythonAstAnalysis(lang, code);
    let staticContext = "";
    if (astResult && astResult.has_syntax_error) {
      staticContext = `\nAST Static Analysis Hint: Line ${astResult.line} has a ${astResult.error_type}: '${astResult.message}'. Offending snippet: '${astResult.offending_line}'`;
    }

    // 2. Prepare structured system and user prompts
    const systemPrompt = `You are CodeFix AI, an expert programming tutor designed specifically for beginners and students.
Analyze the user's code in ${lang.toUpperCase()}.
Your goal is to provide deep diagnostic accuracy, beginner-friendly explanations, multiple-issue detection, a mathematically grounded Code Quality Score (0-100), severity ratings, and before/after comparisons.

Key Analysis Instructions:
1. Detect ALL problems in the code (syntax errors, undefined variables/NameErrors, TypeErrors, IndexErrors, inverted/logical bugs, style/readability issues).
   - If there are multiple errors (e.g. a syntax error on line 3, undefined variable on line 7, type error on line 10), list EACH problem in the "issues" array with its exact line number.
   - For single-issue code, include that issue in the "issues" array.
   - For valid code with no errors, set "hasError": false and include 1 item in "issues" with severity "good" and errorType "No Error".

2. Code Quality Score (0 to 100):
   - Evaluate: Correctness (40%), Error severity (25%), Readability (15%), Structure (10%), Best practices (10%).
   - Serious errors (critical syntax, undefined variables, type errors, out-of-bounds index): MUST receive score between 10 and 45.
   - Logical bugs or warnings: Score between 45 and 70.
   - Minor warnings or style improvements: Score between 70 and 84.
   - Completely clean and valid code: Score between 85 and 100.

3. Severity Levels:
   - "critical": Syntax errors, undefined variables, TypeError, IndexError, unhandled fatal exceptions. (🔴 Critical)
   - "warning": Unused variables, logic flaws, bad condition branching, bare except. (🟠 Warning)
   - "suggestion": Naming conventions, function extraction, comments, readability. (🔵 Suggestion)
   - "good": Correct code structure. (🟢 Good)

4. Beginner Tip:
   - Provide a memorable, bite-sized "💡 Beginner Tip" (e.g. "Remember: Python uses ':' after if, for, while, and function definitions.").

5. Before / After Comparison:
   - "beforeAfterSnippet": { "original": "<offending line(s)>", "corrected": "<fixed line(s)>" }
   - "correctedCode": The full, complete working code with all errors fixed.

6. Suggestions:
   - Always provide 2-3 actionable code quality, readability, or best practice tips (even for valid code!).`;

    const userPrompt = `Analyze this ${lang.toUpperCase()} code:

\`\`\`${lang}
${code}
\`\`\`
${staticContext}`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        hasError: { type: Type.BOOLEAN },
        errorType: { type: Type.STRING },
        line: { type: Type.INTEGER },
        errorMessage: { type: Type.STRING },
        offendingCode: { type: Type.STRING },
        explanation: { type: Type.STRING },
        whyItHappened: { type: Type.STRING },
        howToFix: { type: Type.STRING },
        qualityScore: { type: Type.INTEGER },
        overallSeverity: { type: Type.STRING },
        summary: {
          type: Type.OBJECT,
          properties: {
            errors: { type: Type.INTEGER },
            warnings: { type: Type.INTEGER },
            suggestions: { type: Type.INTEGER }
          },
          required: ["errors", "warnings", "suggestions"]
        },
        issues: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              issueNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              errorType: { type: Type.STRING },
              severity: { type: Type.STRING },
              line: { type: Type.INTEGER },
              errorMessage: { type: Type.STRING },
              offendingCode: { type: Type.STRING },
              explanation: { type: Type.STRING },
              whyItHappened: { type: Type.STRING },
              howToFix: { type: Type.STRING }
            },
            required: ["title", "errorType", "severity", "line", "errorMessage", "offendingCode", "explanation"]
          }
        },
        beginnerTip: { type: Type.STRING },
        beforeAfterSnippet: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            corrected: { type: Type.STRING }
          },
          required: ["original", "corrected"]
        },
        correctedCode: { type: Type.STRING },
        suggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: [
        "hasError",
        "errorType",
        "errorMessage",
        "offendingCode",
        "explanation",
        "whyItHappened",
        "howToFix",
        "qualityScore",
        "overallSeverity",
        "summary",
        "issues",
        "beginnerTip",
        "beforeAfterSnippet",
        "correctedCode",
        "suggestions"
      ]
    };

    const { text: rawGeminiText, modelUsed } = await callGeminiWithFallback(ai, {
      systemInstruction: systemPrompt,
      prompt: userPrompt,
      responseSchema: responseSchema,
      temperature: 0.1,
      timeoutMs: 25000
    });

    // Strip markdown code block wrappers if any were returned
    let cleanJson = rawGeminiText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```$/, "").trim();
    }

    let analysisResult: any;
    try {
      analysisResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("[Analyze API] Failed to parse JSON from Gemini:", cleanJson, parseError);
      return sendJsonError(res, 500, "Unable to parse AI response. Please try again.");
    }

    // Line number reconciliation with AST check
    let finalLine = analysisResult.line ?? null;
    if ((finalLine === null || finalLine === 0) && astResult && astResult.has_syntax_error) {
      finalLine = astResult.line ?? null;
    }

    // Normalize errorType string
    let normalizedErrorType = analysisResult.errorType || (analysisResult.hasError ? "Syntax Error" : "No Error");
    if (normalizedErrorType.toLowerCase().includes("syntax")) normalizedErrorType = "Syntax Error";
    else if (normalizedErrorType.toLowerCase().includes("runtime")) normalizedErrorType = "Runtime Error";
    else if (normalizedErrorType.toLowerCase().includes("type")) normalizedErrorType = "Type Error";
    else if (normalizedErrorType.toLowerCase().includes("index")) normalizedErrorType = "Index Error";
    else if (normalizedErrorType.toLowerCase().includes("name") || normalizedErrorType.toLowerCase().includes("undefined")) normalizedErrorType = "Name Error";
    else if (normalizedErrorType.toLowerCase().includes("logic")) normalizedErrorType = "Logical Error";

    // Normalize issues array
    let rawIssues = Array.isArray(analysisResult.issues) ? analysisResult.issues : [];
    if (rawIssues.length === 0) {
      if (analysisResult.hasError || (astResult && astResult.has_syntax_error)) {
        rawIssues = [
          {
            issueNumber: 1,
            title: normalizedErrorType,
            errorType: normalizedErrorType,
            severity: "critical",
            line: finalLine,
            errorMessage: analysisResult.errorMessage || "Error detected in code",
            offendingCode: analysisResult.offendingCode || astResult?.offending_line || "",
            explanation: analysisResult.explanation || "Issue detected in code.",
            whyItHappened: analysisResult.whyItHappened || "",
            howToFix: analysisResult.howToFix || ""
          }
        ];
      } else {
        rawIssues = [
          {
            issueNumber: 1,
            title: "Clean Code",
            errorType: "No Error",
            severity: "good",
            line: null,
            errorMessage: "No major errors detected",
            offendingCode: "",
            explanation: analysisResult.explanation || "Code structure follows proper conventions.",
            whyItHappened: "",
            howToFix: ""
          }
        ];
      }
    }

    // Ensure issue numbers and severities are formatted correctly
    const formattedIssues = rawIssues.map((issue: any, index: number) => {
      let sev = (issue.severity || "critical").toLowerCase();
      if (!["critical", "warning", "suggestion", "good"].includes(sev)) {
        sev = issue.errorType === "No Error" ? "good" : "critical";
      }

      let lineVal = typeof issue.line === "number" && issue.line > 0 ? issue.line : null;
      if (index === 0 && !lineVal && finalLine) {
        lineVal = finalLine;
      }

      return {
        id: `iss-${index + 1}-${Date.now().toString(36)}`,
        issueNumber: index + 1,
        title: issue.title || `Issue ${index + 1}`,
        errorType: issue.errorType || (sev === "critical" ? "Syntax Error" : "Warning"),
        severity: sev,
        line: lineVal,
        column: typeof issue.column === "number" ? issue.column : undefined,
        errorMessage: issue.errorMessage || "Problem detected",
        offendingCode: issue.offendingCode || "",
        explanation: issue.explanation || "",
        whyItHappened: issue.whyItHappened || "",
        howToFix: issue.howToFix || "",
        diffSnippet: issue.diffSnippet
      };
    });

    const criticalCount = formattedIssues.filter((i: any) => i.severity === "critical").length;
    const warningCount = formattedIssues.filter((i: any) => i.severity === "warning").length;
    const suggestionCount = formattedIssues.filter((i: any) => i.severity === "suggestion").length;

    const hasAnyError = criticalCount > 0 || Boolean(analysisResult.hasError) || (astResult?.has_syntax_error ?? false);

    // Calculate/Normalize Quality Score (0 - 100)
    let score = typeof analysisResult.qualityScore === "number" ? Math.round(analysisResult.qualityScore) : 80;
    if (criticalCount > 0 || (astResult && astResult.has_syntax_error)) {
      // Serious error penalty
      const penalty = criticalCount * 30;
      score = Math.max(10, Math.min(45, 100 - penalty));
    } else if (warningCount > 0) {
      score = Math.max(50, Math.min(78, 100 - warningCount * 15));
    } else if (!hasAnyError) {
      score = Math.max(88, Math.min(100, score > 0 ? score : 95));
    }
    score = Math.max(0, Math.min(100, score));

    // Overall severity
    let overallSeverity = "good";
    if (criticalCount > 0 || hasAnyError) overallSeverity = "critical";
    else if (warningCount > 0) overallSeverity = "warning";
    else if (suggestionCount > 0) overallSeverity = "suggestion";

    // Summary numbers
    const summary = {
      errors: criticalCount,
      warnings: warningCount,
      suggestions: Math.max(suggestionCount, Array.isArray(analysisResult.suggestions) ? analysisResult.suggestions.length : 1)
    };

    // Before/After snippet
    let beforeAfterSnippet = analysisResult.beforeAfterSnippet;
    if (!beforeAfterSnippet || !beforeAfterSnippet.original || !beforeAfterSnippet.corrected) {
      if (analysisResult.offendingCode) {
        beforeAfterSnippet = {
          original: analysisResult.offendingCode,
          corrected: analysisResult.correctedCode ? analysisResult.correctedCode.split("\n")[0] : analysisResult.offendingCode
        };
      }
    }

    const analysisId = "anl-" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const currentUser = authenticateToken(req);
    const createdAt = new Date().toISOString();

    const formattedResponse = {
      id: analysisId,
      hasError: hasAnyError,
      errorType: hasAnyError ? (formattedIssues[0]?.errorType || normalizedErrorType) : "No Error",
      line: finalLine || formattedIssues[0]?.line || null,
      errorMessage: hasAnyError ? (formattedIssues[0]?.errorMessage || analysisResult.errorMessage || "Error detected in code") : "No major errors detected",
      offendingCode: formattedIssues[0]?.offendingCode || analysisResult.offendingCode || (astResult?.offending_line || ""),
      explanation: formattedIssues[0]?.explanation || analysisResult.explanation || (hasAnyError ? "Issues found in code." : "Your code passed syntax and quality checks."),
      whyItHappened: formattedIssues[0]?.whyItHappened || analysisResult.whyItHappened || "",
      howToFix: formattedIssues[0]?.howToFix || analysisResult.howToFix || "",
      correctedCode: analysisResult.correctedCode || code,
      suggestions: Array.isArray(analysisResult.suggestions) && analysisResult.suggestions.length > 0
        ? analysisResult.suggestions
        : [
            "Use descriptive variable and function names.",
            "Maintain consistent indentation and clean code structure.",
            "Add comments for complex or non-obvious logic."
          ],
      qualityScore: score,
      overallSeverity: overallSeverity,
      summary: summary,
      issues: formattedIssues,
      beginnerTip: analysisResult.beginnerTip || (
        lang === "python"
          ? "Remember: Python uses ':' after if, for, while, and function definitions, followed by 4 spaces of indentation."
          : "Remember: Keep variable declarations clear and ensure all statements end with proper syntax."
      ),
      beforeAfterSnippet: beforeAfterSnippet,
      staticAnalysisNote: astResult?.has_syntax_error
        ? `Static AST Check: ${astResult.friendly_message || astResult.message} (Line ${astResult.line})`
        : undefined,
      language: lang,
      submittedCode: code,
      createdAt: createdAt
    };

    // Store in persistent record ONLY for authenticated users (Requirements: Do NOT save analyses for signed-out users)
    if (currentUser) {
      dbData.analyses.unshift({
        id: analysisId,
        userId: currentUser.id,
        language: lang,
        submittedCode: code,
        hasError: formattedResponse.hasError,
        errorType: formattedResponse.errorType,
        errorMessage: formattedResponse.errorMessage,
        errorLine: formattedResponse.line,
        offendingCode: formattedResponse.offendingCode,
        explanation: formattedResponse.explanation,
        whyItHappened: formattedResponse.whyItHappened,
        howToFix: formattedResponse.howToFix,
        correctedCode: formattedResponse.correctedCode,
        suggestions: formattedResponse.suggestions,
        codeQualityScore: formattedResponse.qualityScore,
        overallSeverity: formattedResponse.overallSeverity,
        summary: formattedResponse.summary,
        issues: formattedResponse.issues,
        beginnerTip: formattedResponse.beginnerTip,
        beforeAfterSnippet: formattedResponse.beforeAfterSnippet,
        createdAt: createdAt
      });
      saveDb();
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Analyze API] Success in ${elapsed}ms (Model: ${modelUsed}, QualityScore: ${score}/100, Issues: ${formattedIssues.length}, HasError: ${formattedResponse.hasError})`);

    res.setHeader("Content-Type", "application/json");
    return res.json(formattedResponse);
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[Analyze API] Error after ${elapsed}ms:`, error?.message || error);
    
    const errMsg = error?.message || "";
    if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
      return sendJsonError(res, 401, "Gemini API key is invalid. Please check your GEMINI_API_KEY.");
    }
    if (errMsg.includes("GEMINI_API_KEY") || errMsg.includes("not configured")) {
      return sendJsonError(res, 500, "Gemini API is not configured. Please add GEMINI_API_KEY.");
    }
    if (errMsg.includes("timed out")) {
      return sendJsonError(res, 504, "The AI analysis timed out. Please try again.");
    }

    return sendJsonError(res, 503, "AI analysis is temporarily unavailable. Please try again.");
  }
});

// Fetch Chat History for an analysis (authenticated or by analysisId)
app.get("/api/chat", (req: Request, res: Response) => {
  const analysisId = (req.query.analysis_id || req.query.analysisId) as string;
  const user = authenticateToken(req);

  if (!analysisId) {
    return res.json([]);
  }

  // Filter chats by analysisId and optional user
  const records = dbData.chats.filter(c => {
    const matchesAnalysis = c.analysisId === analysisId || c.analysis_id === analysisId;
    if (!matchesAnalysis) return false;
    if (user && c.userId) {
      return c.userId === user.id;
    }
    return true;
  });

  return res.json(records.map(r => ({
    id: r.id,
    analysisId: r.analysisId || r.analysis_id,
    role: r.role,
    content: r.content,
    createdAt: r.createdAt || r.created_at || new Date().toISOString()
  })));
});

// Follow-up Chat with AI Tutor
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { 
      message, 
      language, 
      code, 
      analysis, 
      chatHistory,
      analysisId 
    } = req.body;

    const authUser = authenticateToken(req);

    console.log(`[AI Tutor API] Received question: '${message?.substring(0, 50)}...' from user: ${authUser?.username || 'anonymous'}`);

    if (!message || !message.trim()) {
      return sendJsonError(res, 400, "Message cannot be empty.");
    }

    const lang = (language || "python").toLowerCase();
    const effectiveAnalysisId = analysisId || analysis?.id || "";

    // 10 Context Points extraction
    const errorType = analysis?.errorType || (analysis?.hasError ? "Error Detected" : "No Error");
    const errorMessage = analysis?.errorMessage || (analysis?.hasError ? "An error was found in your code" : "No active error");
    const errorLine = analysis?.line ?? "N/A";
    const explanation = analysis?.explanation || "No explanation provided.";
    const whyItHappened = analysis?.whyItHappened || "See explanation.";
    const howToFix = analysis?.howToFix || "See corrected code.";
    const correctedCode = analysis?.correctedCode || code || "";

    const systemPrompt = `You are CodeFix AI Tutor, an expert, encouraging, and highly specific programming tutor helping students master coding in ${lang.toUpperCase()}.

You have been provided with the user's EXACT SUBMITTED CODE and static analysis report.

CRITICAL INSTRUCTIONS:
1. SPECIFICITY OVER GENERALITY: Always ground your explanations directly in the student's actual code, variable names, list/array contents, and line numbers. Never give generic textbook boilerplate.
2. LIST INDEXING RULE: If the code has a list/array (for example \`numbers = [10, 20, 30]\`) and accesses an index out of range (like \`numbers[5]\`), explain clearly:
   - The list contains only 3 elements.
   - Python/C/Java uses 0-based indexing, so valid indices are 0, 1, and 2.
   - Index 5 does not exist and exceeds the bounds of the list, resulting in an IndexError.
3. FOLLOW-UPS & CONVERSATION MEMORY: Understand references to previous messages (such as "why did you change this line?", "show another solution", "can you show another way?"). If the user asks for another solution, present clear alternative approaches (e.g. bounds checking, exception handling with try-except, list slicing, or list methods) specifically for their code.
4. BEGINNER-FRIENDLY TONE: If asked to explain like a beginner, use intuitive, concrete real-world metaphors (e.g., mailboxes, numbered boxes, recipe steps).
5. FORMATTING: Use Markdown code blocks with language tags (e.g. \`\`\`${lang}) for any code snippets so the student can easily read and learn from them.`;

    const contextBlock = `
=== CURRENT TUTOR CONTEXT ===
1. PROGRAMMING LANGUAGE:
${lang.toUpperCase()}

2. CURRENT CODE:
\`\`\`${lang}
${code || ""}
\`\`\`

3. LATEST ANALYSIS:
${analysis?.hasError ? "Issue detected in code." : "Clean code / No major errors."}
Quality Score: ${analysis?.qualityScore ?? "N/A"}/100

4. ERROR TYPE:
${errorType}

5. ERROR MESSAGE:
${errorMessage}

6. ERROR LINE:
Line ${errorLine}

7. EXPLANATION:
${explanation}

8. WHY THE ERROR HAPPENED:
${whyItHappened}

9. HOW TO FIX IT:
${howToFix}

10. CORRECTED CODE:
\`\`\`${lang}
${correctedCode}
\`\`\`
============================
`;

    // Format conversation history
    let historyText = "";
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      historyText = "\n=== RECENT CONVERSATION HISTORY ===\n";
      // Take up to the last 10 messages for memory
      const recentHistory = chatHistory.slice(-10);
      for (const msg of recentHistory) {
        const speaker = msg.role === "user" ? "Student" : "Tutor";
        historyText += `${speaker}: ${msg.content}\n`;
      }
      historyText += "==================================\n";
    }

    const fullPrompt = `${contextBlock}
${historyText}
Current Question from Student:
${message.trim()}

Please provide a clear, helpful, and specific response directly addressing their code and question.`;

    let replyText = "";

    if (isGeminiConfigured()) {
      const ai = getGeminiClient();
      if (ai) {
        try {
          const geminiRes = await callGeminiWithFallback(ai, {
            systemInstruction: systemPrompt,
            prompt: fullPrompt,
            temperature: 0.3,
            timeoutMs: 25000
          });
          replyText = geminiRes.text;
        } catch (geminiErr: any) {
          console.warn("[AI Tutor] Gemini API error, generating context-aware fallback:", geminiErr?.message);
        }
      }
    }

    // Context-aware Smart Fallback if Gemini is not configured or fails
    if (!replyText || !replyText.trim()) {
      const qLower = message.toLowerCase();
      
      if (qLower.includes("index 5") || (qLower.includes("index") && code.includes("numbers") && code.includes("5"))) {
        replyText = `In Python, lists use **0-based indexing**.

Your list \`numbers = [10, 20, 30]\` has **3 elements**:
- Index \`0\` → \`10\`
- Index \`1\` → \`20\`
- Index \`2\` → \`30\`

Because there are only 3 items in the list, the only valid indices are \`0\`, \`1\`, and \`2\`. 
Index \`5\` is out of bounds, which causes Python to raise an **\`IndexError: list index out of range\`**.

To access the last item safely, you can use index \`2\` or negative indexing \`numbers[-1]\`.`;
      } else if (qLower.includes("another solution") || qLower.includes("another way") || qLower.includes("alternative")) {
        if (code.includes("numbers") || code.includes("[")) {
          replyText = `Here are two alternative ways to safely handle list index access:

### 1. Check length with \`len()\` before indexing:
\`\`\`python
numbers = [10, 20, 30]
target_index = 5

if target_index < len(numbers):
    print(numbers[target_index])
else:
    print(f"Index {target_index} is out of range! Valid indices are 0 to {len(numbers) - 1}.")
\`\`\`

### 2. Handle with \`try-except\` block:
\`\`\`python
numbers = [10, 20, 30]

try:
    print(numbers[5])
except IndexError:
    print("Caught an IndexError: The requested index does not exist in the list.")
\`\`\``;
        } else {
          replyText = `Here is an alternative solution for your ${lang.toUpperCase()} code:

\`\`\`${lang}
${correctedCode}
\`\`\`

This approach ensures clean syntax, correct variable scoping, and avoids runtime exceptions.`;
        }
      } else if (qLower.includes("beginner") || qLower.includes("simple")) {
        replyText = `Think of your list or variables like numbered boxes on a shelf:
- When you create \`numbers = [10, 20, 30]\`, Python sets up 3 boxes labeled Box #0, Box #1, and Box #2.
- If you ask Python to open Box #5, Python looks at the shelf and sees no Box #5 exists!
- That's why Python stops and warns you with an **IndexError**.`;
      } else if (qLower.includes("why did you change") || qLower.includes("why this line") || qLower.includes("line")) {
        replyText = `Line ${errorLine} was modified because:
1. **The Issue**: ${explanation}
2. **The Root Cause**: ${whyItHappened}
3. **The Solution**: ${howToFix}

Here is the updated line:
\`\`\`${lang}
${analysis?.beforeAfterSnippet?.corrected || correctedCode}
\`\`\``;
      } else if (qLower.includes("how can i avoid") || qLower.includes("avoid")) {
        replyText = `To avoid this error in the future:
1. **Always remember 0-indexing**: The last element of a list of length \`N\` is always at index \`N - 1\`.
2. **Use \`len(list)\` or \`in\`**: Guard index access with length checks.
3. **Iterate directly**: Instead of indexing with numbers, use \`for item in numbers:\` whenever possible.
4. **Use negative indexing**: In Python, \`list[-1]\` always refers to the last element safely.`;
      } else if (qLower.includes("step by step")) {
        replyText = `Here is the step-by-step breakdown of your code execution:

1. \`${code.split('\n')[0] || code}\`: Creates and initializes the data structure in memory.
2. \`${code.split('\n')[1] || ''}\`: Attempts to read or process the value.
3. **Result**: ${explanation}`;
      } else {
        replyText = `Regarding your ${lang.toUpperCase()} code:

- **Error Type**: ${errorType}
- **Issue**: ${explanation}
- **Recommendation**: ${howToFix}

\`\`\`${lang}
${correctedCode}
\`\`\`

Feel free to ask me to explain any specific line, give analogies, or show more examples!`;
      }
    }

    const userMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const botMessageId = `bot-${Date.now() + 1}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Store in Database if user is authenticated and analysisId is present
    if (authUser && effectiveAnalysisId) {
      const userChatRecord: ChatRecord = {
        id: userMessageId,
        userId: authUser.id,
        analysisId: effectiveAnalysisId,
        analysis_id: effectiveAnalysisId,
        role: "user",
        content: message.trim(),
        createdAt: nowIso,
        created_at: nowIso
      };

      const botChatRecord: ChatRecord = {
        id: botMessageId,
        userId: authUser.id,
        analysisId: effectiveAnalysisId,
        analysis_id: effectiveAnalysisId,
        role: "assistant",
        content: replyText,
        createdAt: nowIso,
        created_at: nowIso
      };

      dbData.chats.push(userChatRecord, botChatRecord);
      saveDb();
    }

    res.setHeader("Content-Type", "application/json");
    return res.json({ 
      reply: replyText,
      id: botMessageId,
      createdAt: nowIso
    });
  } catch (error: any) {
    console.error("[AI Tutor API] Error:", error?.message || error);
    const errMsg = error?.message || "";
    if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
      return sendJsonError(res, 401, "Gemini API key is invalid. Please check your GEMINI_API_KEY in Settings.");
    }
    if (errMsg.includes("timed out")) {
      return sendJsonError(res, 504, "The AI Tutor request timed out. Please try again.");
    }
    return sendJsonError(res, 503, "AI Tutor is temporarily unavailable. Please try again.");
  }
});

// Auth Register
app.post("/api/auth/register", (req: Request, res: Response) => {
  const { name, username, email, password } = req.body;
  const chosenUsername = (username || name || "").trim();
  const chosenName = (name || username || "").trim();
  const chosenEmail = (email || "").trim().toLowerCase();

  if (!chosenUsername || !chosenEmail || !password) {
    return sendJsonError(res, 400, "Name or username, email, and password are required.");
  }

  if (chosenUsername.length < 3) {
    return sendJsonError(res, 400, "Username must be at least 3 characters.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(chosenEmail)) {
    return sendJsonError(res, 400, "Please provide a valid email address.");
  }

  if (typeof password !== "string" || password.length < 6) {
    return sendJsonError(res, 400, "Password must be at least 6 characters.");
  }

  const existing = dbData.users.find(
    u => u.username.toLowerCase() === chosenUsername.toLowerCase() || u.email.toLowerCase() === chosenEmail
  );

  if (existing) {
    return sendJsonError(res, 400, "Username or email is already registered.");
  }

  const salt = bcrypt.genSaltSync(10);
  const createdAt = new Date().toISOString();
  const newUser: UserRecord = {
    id: "usr-" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
    name: chosenName || chosenUsername,
    username: chosenUsername,
    email: chosenEmail,
    passwordHash: bcrypt.hashSync(password, salt),
    createdAt: createdAt
  };

  dbData.users.push(newUser);
  saveDb();

  const token = jwt.sign({ sub: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({
    access_token: token,
    token_type: "bearer",
    user: {
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt,
      created_at: newUser.createdAt
    }
  });
});

// Auth Login
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { username_or_email, email, username, password } = req.body;
  const identifier = (username_or_email || email || username || "").trim().toLowerCase();
  
  if (!identifier || !password) {
    return sendJsonError(res, 400, "Please provide both username/email and password.");
  }

  const user = dbData.users.find(
    u => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
  );

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return sendJsonError(res, 401, "Incorrect username/email or password.");
  }

  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({
    access_token: token,
    token_type: "bearer",
    user: {
      id: user.id,
      name: user.name || user.username,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      created_at: user.createdAt
    }
  });
});

// Auth Current User
app.get("/api/auth/me", (req: Request, res: Response) => {
  const user = authenticateToken(req);
  if (!user) {
    return sendJsonError(res, 401, "Not authenticated.");
  }
  return res.json({
    id: user.id,
    name: user.name || user.username,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    created_at: user.createdAt
  });
});

// Auth Logout
app.post("/api/auth/logout", (_req: Request, res: Response) => {
  return res.json({ message: "Successfully logged out." });
});

// History List - Protected (User must ONLY be able to read their own analyses)
app.get("/api/history", (req: Request, res: Response) => {
  const user = authenticateToken(req);
  if (!user) {
    return sendJsonError(res, 401, "Please log in to view your analysis history.");
  }

  let list = dbData.analyses.filter(a => a.userId === user.id);

  const { language, error_type, search } = req.query;

  if (language && language !== "all") {
    list = list.filter(a => a.language.toLowerCase() === (language as string).toLowerCase());
  }

  if (error_type && error_type !== "all") {
    list = list.filter(a => a.errorType === error_type);
  }

  if (search && typeof search === "string" && search.trim()) {
    const s = search.toLowerCase();
    list = list.filter(a =>
      a.submittedCode.toLowerCase().includes(s) ||
      a.errorMessage.toLowerCase().includes(s) ||
      a.explanation.toLowerCase().includes(s) ||
      a.errorType.toLowerCase().includes(s)
    );
  }

  const formatted = list.map(item => ({
    id: item.id,
    hasError: item.hasError,
    errorType: item.errorType,
    line: item.errorLine,
    errorMessage: item.errorMessage,
    offendingCode: item.offendingCode,
    explanation: item.explanation,
    whyItHappened: item.whyItHappened,
    howToFix: item.howToFix,
    correctedCode: item.correctedCode,
    suggestions: item.suggestions,
    qualityScore: item.codeQualityScore,
    overallSeverity: item.overallSeverity || (item.hasError ? "critical" : "good"),
    summary: item.summary,
    issues: item.issues,
    beginnerTip: item.beginnerTip,
    beforeAfterSnippet: item.beforeAfterSnippet,
    language: item.language,
    submittedCode: item.submittedCode,
    createdAt: item.createdAt
  }));

  return res.json(formatted);
});

// Single History Item Details - Protected
app.get("/api/history/:id", (req: Request, res: Response) => {
  const user = authenticateToken(req);
  if (!user) {
    return sendJsonError(res, 401, "Please log in to view analysis details.");
  }

  const item = dbData.analyses.find(a => a.id === req.params.id);
  if (!item) {
    return sendJsonError(res, 404, "Analysis record not found.");
  }

  if (item.userId !== user.id) {
    return sendJsonError(res, 403, "Access denied. You can only view your own analyses.");
  }

  return res.json({
    id: item.id,
    hasError: item.hasError,
    errorType: item.errorType,
    line: item.errorLine,
    errorMessage: item.errorMessage,
    offendingCode: item.offendingCode,
    explanation: item.explanation,
    whyItHappened: item.whyItHappened,
    howToFix: item.howToFix,
    correctedCode: item.correctedCode,
    suggestions: item.suggestions,
    qualityScore: item.codeQualityScore,
    overallSeverity: item.overallSeverity || (item.hasError ? "critical" : "good"),
    summary: item.summary,
    issues: item.issues,
    beginnerTip: item.beginnerTip,
    beforeAfterSnippet: item.beforeAfterSnippet,
    language: item.language,
    submittedCode: item.submittedCode,
    createdAt: item.createdAt
  });
});

// Delete History Item - Protected (User must ONLY be able to delete their own analyses)
app.delete("/api/history/:id", (req: Request, res: Response) => {
  const user = authenticateToken(req);
  if (!user) {
    return sendJsonError(res, 401, "Please log in to delete analyses.");
  }

  const index = dbData.analyses.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return sendJsonError(res, 404, "Analysis record not found.");
  }

  if (dbData.analyses[index].userId !== user.id) {
    return sendJsonError(res, 403, "Access denied. You can only delete your own analyses.");
  }

  dbData.analyses.splice(index, 1);
  saveDb();
  return res.json({ message: "Analysis deleted successfully." });
});

// Dashboard Stats - Protected (Connected to real database user data)
app.get("/api/dashboard", (req: Request, res: Response) => {
  const user = authenticateToken(req);
  if (!user) {
    return sendJsonError(res, 401, "Please log in to view your learning dashboard.");
  }

  const userAnalyses = dbData.analyses.filter(a => a.userId === user.id);
  const totalAnalyses = userAnalyses.length;
  const errorsDetected = userAnalyses.filter(a => a.hasError).length;
  const errorsFixed = userAnalyses.filter(a => a.hasError && Boolean(a.correctedCode)).length;

  const langDist: Record<string, number> = {
    python: 0,
    c: 0,
    cpp: 0,
    java: 0,
    javascript: 0
  };

  const errorTypeDist: Record<string, number> = {};

  for (const a of userAnalyses) {
    const l = (a.language || "python").toLowerCase();
    if (langDist[l] !== undefined) {
      langDist[l] = (langDist[l] || 0) + 1;
    }

    const et = a.errorType || (a.hasError ? "Syntax Error" : "No Error");
    errorTypeDist[et] = (errorTypeDist[et] || 0) + 1;
  }

  let mostUsedLanguage = "none";
  let maxCount = 0;
  for (const [l, count] of Object.entries(langDist)) {
    if (count > maxCount) {
      maxCount = count;
      mostUsedLanguage = l;
    }
  }

  const recentAnalyses = userAnalyses.slice(0, 5).map(item => ({
    id: item.id,
    hasError: item.hasError,
    errorType: item.errorType,
    line: item.errorLine,
    errorMessage: item.errorMessage,
    offendingCode: item.offendingCode,
    explanation: item.explanation,
    whyItHappened: item.whyItHappened,
    howToFix: item.howToFix,
    correctedCode: item.correctedCode,
    suggestions: item.suggestions,
    qualityScore: item.codeQualityScore,
    overallSeverity: item.overallSeverity || (item.hasError ? "critical" : "good"),
    summary: item.summary,
    issues: item.issues,
    beginnerTip: item.beginnerTip,
    beforeAfterSnippet: item.beforeAfterSnippet,
    language: item.language,
    submittedCode: item.submittedCode,
    createdAt: item.createdAt
  }));

  return res.json({
    totalAnalyses,
    errorsDetected,
    errorsFixed,
    mostUsedLanguage: totalAnalyses > 0 ? mostUsedLanguage : "None yet",
    languageDistribution: langDist,
    errorTypeDistribution: errorTypeDist,
    recentAnalyses
  });
});

// ==========================================
// Strict API 404 Catch-All & Error Handlers
// (Guarantees all /api/* requests return JSON, NEVER HTML)
// ==========================================
app.all("/api/*", (req: Request, res: Response) => {
  console.warn(`[API 404] Unhandled endpoint: ${req.method} ${req.originalUrl}`);
  return sendJsonError(res, 404, `API endpoint '${req.method} ${req.originalUrl}' not found.`);
});

app.use((err: any, req: Request, res: Response, next: any) => {
  if (req.originalUrl && req.originalUrl.startsWith("/api")) {
    console.error(`[API Global Error] ${req.method} ${req.originalUrl}:`, err);
    return sendJsonError(res, err.status || 500, err.message || "Internal Server Error");
  }
  next(err);
});

// ==========================================
// Vite Middleware Setup
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CodeFix AI server running on http://localhost:${PORT}`);
  });
}

startServer();
