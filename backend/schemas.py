"""
Pydantic Data Schemas for FastAPI Request and Response Validation.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

class AnalyzeRequest(BaseModel):
    code: str = Field(..., max_length=20000, description="Code snippet to analyze")
    language: str = Field(..., description="Programming language: python, c, cpp, java, javascript")

class AnalyzeResponse(BaseModel):
    id: Optional[str] = None
    hasError: bool
    errorType: str
    line: Optional[int] = None
    errorMessage: str
    offendingCode: str
    explanation: str
    whyItHappened: str
    howToFix: str
    correctedCode: str
    suggestions: List[str]
    staticAnalysisNote: Optional[str] = None
    language: str
    submittedCode: str
    createdAt: Optional[str] = None

class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    language: str
    code: str = Field(..., max_length=20000)
    analysis: Optional[Dict[str, Any]] = None
    chatHistory: Optional[List[Dict[str, str]]] = None

class ChatResponse(BaseModel):
    reply: str

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    createdAt: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class DashboardStats(BaseModel):
    totalAnalyses: int = 0
    errorsDetected: int = 0
    errorsFixed: int = 0
    mostUsedLanguage: str = "python"
    languageDistribution: Dict[str, int]
    errorTypeDistribution: Dict[str, int]
    recentAnalyses: List[AnalyzeResponse]
