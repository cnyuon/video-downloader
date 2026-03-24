"""
Security and abuse-prevention helpers for contact form handling.
"""
import hashlib
import os
import re
import time
from typing import NamedTuple

import httpx
from redis.asyncio import Redis


TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
_redis_client: Redis | None = None


class LimitResult(NamedTuple):
    allowed: bool
    retry_after_seconds: int
    reason: str | None = None


def get_contact_redis() -> Redis | None:
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        return None

    _redis_client = Redis.from_url(redis_url, decode_responses=True)
    return _redis_client


def hash_email(email: str) -> str:
    normalized = email.strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def sanitize_text(value: str) -> str:
    # Remove tags and control chars except tab/newline, then normalize spacing.
    no_tags = re.sub(r"<[^>]*>", "", value)
    no_ctrl = re.sub(r"[^\x09\x0A\x20-\x7E]", "", no_tags)
    no_extra_lines = re.sub(r"\n{3,}", "\n\n", no_ctrl)
    return no_extra_lines.strip()


async def verify_turnstile(token: str, remote_ip: str) -> bool:
    secret = os.environ.get("CLOUDFLARE_TURNSTILE_SECRET", "").strip()
    if not secret:
        raise RuntimeError("CLOUDFLARE_TURNSTILE_SECRET is not configured")
    if not token.strip():
        return False

    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.post(
            TURNSTILE_VERIFY_URL,
            data={
                "secret": secret,
                "response": token,
                "remoteip": remote_ip,
            },
        )
        response.raise_for_status()
        data = response.json()
        return bool(data.get("success"))


async def _increment_limited_counter(redis: Redis, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window_seconds)
    ttl = await redis.ttl(key)
    retry_after = max(1, int(ttl)) if ttl and ttl > 0 else window_seconds
    return current <= limit, retry_after


async def enforce_contact_rate_limits(ip: str, email_hash: str) -> LimitResult:
    redis = get_contact_redis()
    if not redis:
        return LimitResult(False, 60, "Contact protection is not configured")

    now = int(time.time())
    minute_bucket = now // 60

    checks = [
        (f"contact:global:{minute_bucket}", 120, 120, "global"),
        (f"contact:ip:{ip}:1h", 8, 3600, "ip_hourly"),
        (f"contact:ip:{ip}:24h", 25, 86400, "ip_daily"),
        (f"contact:email:{email_hash}:24h", 5, 86400, "email_daily"),
    ]

    max_retry = 1
    for key, limit, window, reason in checks:
        allowed, retry_after = await _increment_limited_counter(redis, key, limit, window)
        if not allowed:
            max_retry = max(max_retry, retry_after)
            return LimitResult(False, max_retry, reason)

    return LimitResult(True, max_retry, None)


async def send_contact_email(
    *,
    name: str,
    email: str,
    reason: str,
    message: str,
    locale: str | None,
    ip: str,
    user_agent: str,
) -> None:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    from_email = os.environ.get("CONTACT_FROM_EMAIL", "").strip()
    to_email = os.environ.get("CONTACT_TO_EMAIL", "").strip()

    if not api_key or not from_email or not to_email:
        raise RuntimeError("Resend contact email settings are incomplete")

    safe_name = sanitize_text(name)
    safe_email = sanitize_text(email)
    safe_reason = sanitize_text(reason)
    safe_message = sanitize_text(message)
    safe_locale = sanitize_text(locale or "unknown")
    safe_ip = sanitize_text(ip)
    safe_ua = sanitize_text(user_agent)

    subject = f"[GetMediaTools Contact] {safe_reason} - {safe_name}"
    text_body = (
        f"Name: {safe_name}\n"
        f"Email: {safe_email}\n"
        f"Reason: {safe_reason}\n"
        f"Locale: {safe_locale}\n"
        f"IP: {safe_ip}\n"
        f"User-Agent: {safe_ua}\n\n"
        f"Message:\n{safe_message}\n"
    )

    html_body = (
        "<h2>New Contact Submission</h2>"
        f"<p><strong>Name:</strong> {safe_name}</p>"
        f"<p><strong>Email:</strong> {safe_email}</p>"
        f"<p><strong>Reason:</strong> {safe_reason}</p>"
        f"<p><strong>Locale:</strong> {safe_locale}</p>"
        f"<p><strong>IP:</strong> {safe_ip}</p>"
        f"<p><strong>User-Agent:</strong> {safe_ua}</p>"
        "<hr />"
        f"<pre style=\"white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\">{safe_message}</pre>"
    )

    payload = {
        "from": from_email,
        "to": [to_email],
        "reply_to": safe_email,
        "subject": subject,
        "text": text_body,
        "html": html_body,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        response.raise_for_status()
