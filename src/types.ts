export type SupportedLanguage = 'python' | 'c' | 'cpp' | 'java' | 'javascript';

export type ErrorSeverity = 'error' | 'warning' | 'success';

export type IssueSeverity = 'critical' | 'warning' | 'suggestion' | 'good';

export type ErrorType =
  | 'Syntax Error'
  | 'Runtime Error'
  | 'Logical Error'
  | 'Type Error'
  | 'Index Error'
  | 'Name Error'
  | 'Warning'
  | 'Code Quality Issue'
  | 'Optimization Suggestion'
  | 'No Error';

export interface CodeIssue {
  id?: string;
  issueNumber?: number;
  title: string;
  errorType: ErrorType;
  severity: IssueSeverity;
  line: number | null;
  column?: number;
  errorMessage: string;
  offendingCode: string;
  explanation: string;
  whyItHappened?: string;
  howToFix?: string;
  diffSnippet?: {
    original: string;
    corrected: string;
  };
}

export interface AnalysisSummary {
  errors: number;
  warnings: number;
  suggestions: number;
}

export interface AnalysisResult {
  id?: string;
  userId?: string;
  hasError: boolean;
  errorType: ErrorType;
  line: number | null;
  errorMessage: string;
  offendingCode: string;
  explanation: string;
  whyItHappened: string;
  howToFix: string;
  correctedCode: string;
  suggestions: string[];
  staticAnalysisNote?: string;
  language: SupportedLanguage;
  submittedCode: string;
  createdAt?: string;

  // Enhanced features
  qualityScore?: number;
  overallSeverity?: IssueSeverity;
  summary?: AnalysisSummary;
  issues?: CodeIssue[];
  beginnerTip?: string;
  beforeAfterSnippet?: {
    original: string;
    corrected: string;
  };
}

export interface ChatMessage {
  id: string;
  analysisId?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface CodeExample {
  id: string;
  title: string;
  language: SupportedLanguage;
  category: string;
  description: string;
  code: string;
  expectedIssue: string;
}

export interface User {
  id: string;
  name?: string;
  username: string;
  email: string;
  createdAt: string;
  created_at?: string;
}

export interface DashboardStats {
  totalAnalyses: number;
  errorsDetected: number;
  errorsFixed: number;
  mostUsedLanguage: string;
  languageDistribution: Record<SupportedLanguage, number>;
  errorTypeDistribution: Record<string, number>;
  recentAnalyses: AnalysisResult[];
}
