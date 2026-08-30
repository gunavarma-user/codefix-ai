"""
Authentication utilities: password hashing and JWT token handling.
"""

import os
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import backend.models as models
from backend.database import get_db

SECRET_KEY = os.environ.get("JWT_SECRET", "codefix-ai-secret-key-2026-prod-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def hash_password(password: str) -> str:
    """Safely hashes password using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}${pw_hash}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a password against the PBKDF2 hash."""
    if not hashed_password or '$' not in hashed_password:
        return False
    try:
        salt, pw_hash = hashed_password.split('$', 1)
        test_hash = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return hmac.compare_digest(pw_hash, test_hash)
    except Exception:
        return False

# Simple robust JWT token simulation / generation using standard Python libraries
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": int(expire.timestamp())})
    
    # Try using python-jose or fall back to signature with HMAC
    try:
        from jose import jwt
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    except Exception:
        import base64
        import json
        header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip('=')
        payload = base64.urlsafe_b64encode(json.dumps(to_encode).encode()).decode().rstrip('=')
        signature = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
        sig_str = base64.urlsafe_b64encode(signature).decode().rstrip('=')
        return f"{header}.{payload}.{sig_str}"

def decode_access_token(token: str) -> Optional[dict]:
    try:
        from jose import jwt
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        import base64
        import json
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        expected_sig = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
        actual_sig = base64.urlsafe_b64decode(sig + '=' * (-len(sig) % 4))
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload_data = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)).decode())
        if payload_data.get('exp', 0) < datetime.utcnow().timestamp():
            return None
        return payload_data

def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Returns the current user if token is provided and valid, otherwise None."""
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return user

def get_current_user_required(
    user: Optional[models.User] = Depends(get_current_user_optional)
) -> models.User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access this resource",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
