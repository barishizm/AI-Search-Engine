import time

import httpx
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError

from app.config import get_settings

_JWKS_TTL_SECONDS = 300
_jwks_cache: dict[str, tuple[float, dict]] = {}


def _get_jwks_url(token: str) -> str | None:
    claims = jwt.get_unverified_claims(token)
    issuer = claims.get("iss")
    if not isinstance(issuer, str) or not issuer.startswith("http"):
        return None
    return issuer.rstrip("/") + "/.well-known/jwks.json"


async def _get_jwks(jwks_url: str) -> dict:
    cached = _jwks_cache.get(jwks_url)
    now = time.time()
    if cached and now - cached[0] < _JWKS_TTL_SECONDS:
        return cached[1]

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        jwks = response.json()

    _jwks_cache[jwks_url] = (now, jwks)
    return jwks


async def _decode_token(token: str) -> dict:
    settings = get_settings()
    header = jwt.get_unverified_header(token)
    algorithm = header.get("alg")
    if not isinstance(algorithm, str):
        raise JWTError("Missing token algorithm")

    if algorithm == "HS256":
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )

    jwks_url = _get_jwks_url(token)
    if not jwks_url:
        raise JWTError("Missing issuer for JWKS verification")

    try:
        jwks = await _get_jwks(jwks_url)
    except httpx.HTTPError as exc:
        raise JWTError("Unable to fetch JWKS") from exc

    return jwt.decode(
        token,
        jwks,
        algorithms=[algorithm],
        audience="authenticated",
    )


async def get_current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "", 1)

    try:
        payload = await _decode_token(token)
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
