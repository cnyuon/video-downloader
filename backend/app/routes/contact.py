"""
Contact API routes for secure form submission.
"""
import time
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from app.utils.contact_security import (
    enforce_contact_rate_limits,
    hash_email,
    sanitize_text,
    send_contact_email,
    verify_turnstile,
)


router = APIRouter(prefix="/api", tags=["contact"])


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    reason: Literal["general", "technical", "privacy", "billing", "partnership"]
    message: str = Field(min_length=20, max_length=5000)
    honeypot: str = Field(default="", max_length=255)
    turnstileToken: str = Field(default="", max_length=4096)
    submittedAtMs: int
    locale: str = Field(default="en", max_length=10)


class ContactResponse(BaseModel):
    ok: bool
    message: str


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/contact", response_model=ContactResponse)
async def submit_contact(request: Request, body: ContactRequest):
    now_ms = int(time.time() * 1000)
    client_ip = get_client_ip(request)

    if body.honeypot.strip():
        raise HTTPException(status_code=400, detail="Invalid submission")

    # Basic human-timing check (prevents instant bot submits)
    if now_ms - body.submittedAtMs < 3000:
        raise HTTPException(status_code=400, detail="Form submitted too quickly")

    clean_name = sanitize_text(body.name)
    clean_email = sanitize_text(str(body.email))
    clean_reason = sanitize_text(body.reason)
    clean_message = sanitize_text(body.message)
    clean_locale = sanitize_text(body.locale)
    user_agent = request.headers.get("User-Agent", "")

    if len(clean_message) < 20:
        raise HTTPException(status_code=400, detail="Message is too short")

    limit_result = await enforce_contact_rate_limits(client_ip, hash_email(clean_email))
    if not limit_result.allowed:
        if limit_result.reason == "Contact protection is not configured":
            raise HTTPException(status_code=500, detail="REDIS_URL is required for contact protection")
        raise HTTPException(
            status_code=429,
            detail="Too many contact submissions. Please try again later.",
            headers={"Retry-After": str(limit_result.retry_after_seconds)},
        )

    try:
        turnstile_ok = await verify_turnstile(body.turnstileToken, client_ip)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Unable to validate anti-spam challenge")

    if not turnstile_ok:
        raise HTTPException(status_code=400, detail="Anti-spam verification failed")

    try:
        await send_contact_email(
            name=clean_name,
            email=clean_email,
            reason=clean_reason,
            message=clean_message,
            locale=clean_locale,
            ip=client_ip,
            user_agent=user_agent,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Unable to deliver contact message")

    return ContactResponse(ok=True, message="Message sent")
