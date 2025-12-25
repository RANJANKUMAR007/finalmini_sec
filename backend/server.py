from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import secrets
import hashlib
from datetime import datetime, timezone, timedelta

# Rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.responses import JSONResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create the main app
app = FastAPI()

# Add rate limit error handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"error": "Too many requests. Please try again later."}
    )

app.state.limiter = limiter

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class SecretCreate(BaseModel):
    encrypted_data: str
    iv: str
    pin_hash: Optional[str] = None
    expiry_minutes: int = Field(ge=1, le=1440)  # 1 min to 24 hours
    one_time_view: bool = False

class SecretResponse(BaseModel):
    id: str
    message: str

class SecretFetch(BaseModel):
    encrypted_data: str
    iv: str
    one_time_view: bool
    expires_at: str
    has_pin: bool

class PinVerify(BaseModel):
    pin_hash: str

# Helper to generate secure random token (32 bytes = 64 hex chars)
def generate_secure_token() -> str:
    return secrets.token_hex(32)

# Helper to hash PIN for comparison
def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

@api_router.get("/")
async def root():
    return {"message": "CipherShare API - Secure Secret Sharing"}

@api_router.post("/secrets", response_model=SecretResponse)
async def create_secret(secret: SecretCreate):
    """Create a new encrypted secret"""
    token = generate_secure_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=secret.expiry_minutes)
    
    doc = {
        "id": token,
        "encrypted_data": secret.encrypted_data,
        "iv": secret.iv,
        "pin_hash": secret.pin_hash,
        "expiry_minutes": secret.expiry_minutes,
        "one_time_view": secret.one_time_view,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
        "viewed": False
    }
    
    await db.secrets.insert_one(doc)
    
    return SecretResponse(
        id=token,
        message="Secret created successfully"
    )

@api_router.get("/secrets/{secret_id}")
@limiter.limit("10/minute")
async def get_secret_info(request: Request, secret_id: str):
    """Check if secret exists and if it requires a PIN"""
    secret = await db.secrets.find_one({"id": secret_id}, {"_id": 0})
    
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found or has expired")
    
    # Check if expired
    expires_at = datetime.fromisoformat(secret["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.secrets.delete_one({"id": secret_id})
        raise HTTPException(status_code=410, detail="Secret has expired")
    
    # Check if already viewed (one-time view)
    if secret.get("one_time_view") and secret.get("viewed"):
        await db.secrets.delete_one({"id": secret_id})
        raise HTTPException(status_code=410, detail="Secret has already been viewed")
    
    return {
        "has_pin": secret.get("pin_hash") is not None,
        "one_time_view": secret.get("one_time_view", False),
        "expires_at": secret["expires_at"]
    }

@api_router.post("/secrets/{secret_id}/view")
@limiter.limit("5/minute")
async def view_secret(request: Request, secret_id: str, pin_data: Optional[PinVerify] = None):
    """View and decrypt a secret (with optional PIN verification)"""
    secret = await db.secrets.find_one({"id": secret_id}, {"_id": 0})
    
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found or has expired")
    
    # Check if expired
    expires_at = datetime.fromisoformat(secret["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.secrets.delete_one({"id": secret_id})
        raise HTTPException(status_code=410, detail="Secret has expired")
    
    # Check if already viewed (one-time view)
    if secret.get("one_time_view") and secret.get("viewed"):
        await db.secrets.delete_one({"id": secret_id})
        raise HTTPException(status_code=410, detail="Secret has already been viewed")
    
    # Verify PIN if required
    if secret.get("pin_hash"):
        if not pin_data or not pin_data.pin_hash:
            raise HTTPException(status_code=401, detail="PIN required")
        if pin_data.pin_hash != secret["pin_hash"]:
            raise HTTPException(status_code=401, detail="Invalid PIN")
    
    # Mark as viewed if one-time view
    if secret.get("one_time_view"):
        await db.secrets.update_one(
            {"id": secret_id},
            {"$set": {"viewed": True}}
        )
    
    return SecretFetch(
        encrypted_data=secret["encrypted_data"],
        iv=secret["iv"],
        one_time_view=secret.get("one_time_view", False),
        expires_at=secret["expires_at"],
        has_pin=secret.get("pin_hash") is not None
    )

@api_router.delete("/secrets/{secret_id}")
async def delete_secret(secret_id: str):
    """Delete a secret"""
    result = await db.secrets.delete_one({"id": secret_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Secret not found")
    
    return {"message": "Secret deleted successfully"}

# Cleanup expired secrets (can be called periodically)
@api_router.post("/cleanup")
async def cleanup_expired_secrets():
    """Remove expired secrets from the database"""
    current_time = datetime.now(timezone.utc).isoformat()
    result = await db.secrets.delete_many({
        "expires_at": {"$lt": current_time}
    })
    
    return {"deleted_count": result.deleted_count}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
