"""JWT utilities for portal customer auth."""

from datetime import datetime, timezone, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

HTTP_BEARER = HTTPBearer(auto_error=False)

PORTAL_TOKEN_EXPIRE_DAYS = 7


def create_portal_token(customer_id: int) -> str:
    """Create JWT for portal customer session."""
    expire = datetime.now(timezone.utc) + timedelta(days=PORTAL_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(customer_id),
        "type": "portal_customer",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_portal_token(token: str) -> dict | None:
    """Decode and validate portal JWT. Returns payload or None."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        if payload.get("type") != "portal_customer":
            return None
        return payload
    except JWTError:
        return None


async def get_current_customer_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTP_BEARER),
) -> int:
    """FastAPI dependency: require valid portal JWT and return customer_id."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_portal_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
