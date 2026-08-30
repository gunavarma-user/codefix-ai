"""
CodeFix AI - FastAPI Application Backend
Provides RESTful API endpoints for Code Analysis, AI Tutoring Chat, Authentication, History, and Dashboard.
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import engine, get_db, init_db
import models as models
import schemas as schemas
from analyzer import perform_static_check
from ai_service import analyze_code_with_gemini, generate_chat_reply
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_optional,
    get_current_user_required
)

# Initialize SQLite database schema
init_db()

app = FastAPI(
    title="CodeFix AI Backend",
    description="AI-Powered Code Error Analyzer API using FastAPI & Google Gemini",
    version="1.0.0"
)

# Enable CORS for local dev and frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_LANGUAGES = {"python", "c", "cpp", "java", "javascript"}

@app.get("/api/health")
def health_check():
    gemini_key_present = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "service": "CodeFix AI Backend (FastAPI)",
        "gemini_configured": gemini_key_present,
        "supported_languages": list(SUPPORTED_LANGUAGES)
    }

# ==========================================
# 1. CODE ANALYSIS ENDPOINT
# ==========================================
@app.post("/api/analyze", response_model=schemas.AnalyzeResponse)
def analyze_code(
    payload: schemas.AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    code = payload.code.strip()
    language = payload.language.lower().strip()

    # Validations
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No code found. Paste some code into the editor and try again."
        )

    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please select a supported programming language: {', '.join(SUPPORTED_LANGUAGES)}"
        )

    if len(payload.code) > 20000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your code is too large. Please keep it below 20,000 characters."
        )

    # 1. Run local safe static analysis (AST check for Python / structural syntax check)
    static_result = perform_static_check(language, payload.code)
    static_note = None
    if static_result.get("has_syntax_error"):
        static_note = f"Static check detected {static_result.get('error_type')} on line {static_result.get('line')}: {static_result.get('message')}"

    # 2. Call Gemini for AI tutor explanation and complete corrected code
    try:
        gemini_result = analyze_code_with_gemini(language, payload.code, static_result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI analysis is temporarily unavailable. ({str(e)})"
        )

    # 3. If line was detected by AST static analyzer and Gemini returned None, enrich it
    final_line = gemini_result.get("line")
    if final_line is None and static_result.get("has_syntax_error"):
        final_line = static_result.get("line")

    analysis_id = str(uuid.uuid4())
    created_at = datetime.utcnow()

    # 4. Save to database if user is authenticated or store transient record
    if current_user:
        db_analysis = models.Analysis(
            id=analysis_id,
            user_id=current_user.id,
            language=language,
            submitted_code=payload.code,
            has_error=gemini_result.get("hasError", False),
            error_type=gemini_result.get("errorType", "No Error"),
            error_message=gemini_result.get("errorMessage", ""),
            error_line=final_line,
            offending_code=gemini_result.get("offendingCode", ""),
            explanation=gemini_result.get("explanation", ""),
            why_it_happened=gemini_result.get("whyItHappened", ""),
            how_to_fix=gemini_result.get("howToFix", ""),
            corrected_code=gemini_result.get("correctedCode", payload.code),
            suggestions_json=json.dumps(gemini_result.get("suggestions", [])),
            created_at=created_at
        )
        db.add(db_analysis)
        db.commit()

    return schemas.AnalyzeResponse(
        id=analysis_id,
        hasError=gemini_result.get("hasError", False),
        errorType=gemini_result.get("errorType", "No Error"),
        line=final_line,
        errorMessage=gemini_result.get("errorMessage", ""),
        offendingCode=gemini_result.get("offendingCode", ""),
        explanation=gemini_result.get("explanation", ""),
        whyItHappened=gemini_result.get("whyItHappened", ""),
        howToFix=gemini_result.get("howToFix", ""),
        correctedCode=gemini_result.get("correctedCode", payload.code),
        suggestions=gemini_result.get("suggestions", []),
        staticAnalysisNote=static_note,
        language=language,
        submittedCode=payload.code,
        createdAt=created_at.isoformat()
    )

# ==========================================
# 2. AI FOLLOW-UP CHAT ENDPOINT
# ==========================================
@app.post("/api/chat", response_model=schemas.ChatResponse)
def chat_with_tutor(
    payload: schemas.ChatRequest,
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        reply = generate_chat_reply(
            message=payload.message,
            language=payload.language,
            code=payload.code,
            analysis=payload.analysis,
            history=payload.chatHistory
        )
        return schemas.ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"AI chat is temporarily unavailable. ({str(e)})"
        )

# ==========================================
# 3. AUTHENTICATION ENDPOINTS
# ==========================================
@app.post("/api/auth/register", response_model=schemas.TokenResponse)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if username or email is taken
    existing = db.query(models.User).filter(
        (models.User.username == payload.username) | (models.User.email == payload.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username or email is already registered."
        )

    user = models.User(
        id=str(uuid.uuid4()),
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        created_at=datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "username": user.username})
    user_out = schemas.UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        createdAt=user.created_at.isoformat()
    )
    return schemas.TokenResponse(access_token=token, user=user_out)

@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.username == payload.username_or_email) | (models.User.email == payload.username_or_email)
    ).first()
    
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password."
        )

    token = create_access_token({"sub": user.id, "username": user.username})
    user_out = schemas.UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        createdAt=user.created_at.isoformat()
    )
    return schemas.TokenResponse(access_token=token, user=user_out)

@app.get("/api/auth/me", response_model=schemas.UserOut)
def get_current_user_profile(user: models.User = Depends(get_current_user_required)):
    return schemas.UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        createdAt=user.created_at.isoformat()
    )

@app.post("/api/auth/logout")
def logout():
    return {"message": "Successfully logged out."}

# ==========================================
# 4. HISTORY ENDPOINTS
# ==========================================
@app.get("/api/history", response_model=List[schemas.AnalyzeResponse])
def get_history(
    language: Optional[str] = None,
    error_type: Optional[str] = None,
    search: Optional[str] = None,
    user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    query = db.query(models.Analysis).filter(models.Analysis.user_id == user.id)

    if language and language != "all":
        query = query.filter(models.Analysis.language == language.lower())
    if error_type and error_type != "all":
        query = query.filter(models.Analysis.error_type == error_type)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (models.Analysis.submitted_code.ilike(s)) |
            (models.Analysis.error_message.ilike(s)) |
            (models.Analysis.explanation.ilike(s))
        )

    analyses = query.order_by(desc(models.Analysis.created_at)).limit(50).all()

    results = []
    for item in analyses:
        suggestions = []
        try:
            suggestions = json.loads(item.suggestions_json) if item.suggestions_json else []
        except Exception:
            pass

        results.append(schemas.AnalyzeResponse(
            id=item.id,
            hasError=item.has_error,
            errorType=item.error_type,
            line=item.error_line,
            errorMessage=item.error_message,
            offendingCode=item.offending_code or "",
            explanation=item.explanation or "",
            whyItHappened=item.why_it_happened or "",
            howToFix=item.how_to_fix or "",
            correctedCode=item.corrected_code or item.submitted_code,
            suggestions=suggestions,
            language=item.language,
            submittedCode=item.submitted_code,
            createdAt=item.created_at.isoformat() if item.created_at else None
        ))
    return results

@app.get("/api/history/{item_id}", response_model=schemas.AnalyzeResponse)
def get_history_item(
    item_id: str,
    user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    item = db.query(models.Analysis).filter(
        models.Analysis.id == item_id,
        models.Analysis.user_id == user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Analysis item not found.")
    
    suggestions = []
    try:
        suggestions = json.loads(item.suggestions_json) if item.suggestions_json else []
    except Exception:
        pass

    return schemas.AnalyzeResponse(
        id=item.id,
        hasError=item.has_error,
        errorType=item.error_type,
        line=item.error_line,
        errorMessage=item.error_message,
        offendingCode=item.offending_code or "",
        explanation=item.explanation or "",
        whyItHappened=item.why_it_happened or "",
        howToFix=item.how_to_fix or "",
        correctedCode=item.corrected_code or item.submitted_code,
        suggestions=suggestions,
        language=item.language,
        submittedCode=item.submitted_code,
        createdAt=item.created_at.isoformat() if item.created_at else None
    )

@app.delete("/api/history/{item_id}")
def delete_history_item(
    item_id: str,
    user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    item = db.query(models.Analysis).filter(
        models.Analysis.id == item_id,
        models.Analysis.user_id == user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Analysis item not found.")
    
    db.delete(item)
    db.commit()
    return {"message": "Analysis deleted successfully."}

# ==========================================
# 5. DASHBOARD STATS ENDPOINT
# ==========================================
@app.get("/api/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    analyses = db.query(models.Analysis).filter(models.Analysis.user_id == user.id).all()
    total = len(analyses)
    errors_detected = sum(1 for a in analyses if a.has_error)
    errors_fixed = sum(1 for a in analyses if a.has_error and a.corrected_code)

    # Language distribution
    lang_dist = {l: 0 for l in SUPPORTED_LANGUAGES}
    error_types = {}
    for a in analyses:
        l = a.language.lower()
        if l in lang_dist:
            lang_dist[l] += 1
        else:
            lang_dist[l] = 1
        
        et = a.error_type or "No Error"
        error_types[et] = error_types.get(et, 0) + 1

    most_used = max(lang_dist.items(), key=lambda x: x[1])[0] if total > 0 else "python"

    # Recent 5 analyses
    recent = db.query(models.Analysis).filter(
        models.Analysis.user_id == user.id
    ).order_by(desc(models.Analysis.created_at)).limit(5).all()

    recent_list = []
    for r in recent:
        sugs = []
        try:
            sugs = json.loads(r.suggestions_json) if r.suggestions_json else []
        except Exception:
            pass
        recent_list.append(schemas.AnalyzeResponse(
            id=r.id,
            hasError=r.has_error,
            errorType=r.error_type,
            line=r.error_line,
            errorMessage=r.error_message,
            offendingCode=r.offending_code or "",
            explanation=r.explanation or "",
            whyItHappened=r.why_it_happened or "",
            howToFix=r.how_to_fix or "",
            correctedCode=r.corrected_code or r.submitted_code,
            suggestions=sugs,
            language=r.language,
            submittedCode=r.submitted_code,
            createdAt=r.created_at.isoformat() if r.created_at else None
        ))

    return schemas.DashboardStats(
        totalAnalyses=total,
        errorsDetected=errors_detected,
        errorsFixed=errors_fixed,
        mostUsedLanguage=most_used,
        languageDistribution=lang_dist,
        errorTypeDistribution=error_types,
        recentAnalyses=recent_list
    )
