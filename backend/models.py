"""
SQLAlchemy Database Models for CodeFix AI.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    language = Column(String(20), nullable=False, index=True)
    submitted_code = Column(Text, nullable=False)
    has_error = Column(Boolean, default=False)
    error_type = Column(String(50), default="No Error")
    error_message = Column(Text, default="")
    error_line = Column(Integer, nullable=True)
    offending_code = Column(Text, default="")
    explanation = Column(Text, default="")
    why_it_happened = Column(Text, default="")
    how_to_fix = Column(Text, default="")
    corrected_code = Column(Text, default="")
    suggestions_json = Column(Text, default="[]")  # Serialized JSON list of suggestions
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="analyses")
    chat_messages = relationship("ChatMessage", back_populates="analysis", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String(36), ForeignKey("analyses.id"), nullable=True, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("Analysis", back_populates="chat_messages")
