import os
from fastapi import FastAPI, Header, HTTPException, Depends
from dotenv import load_dotenv
from app.api.router import router

load_dotenv()

app = FastAPI(title="Papertrade Compute Engine")

INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET")

async def verify_secret(x_internal_secret: str = Header(None)):
    if x_internal_secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid internal secret")
    return True

@app.get("/health")
async def health():
    return {"status": "healthy"}

app.include_router(router, prefix="/api/v1", dependencies=[Depends(verify_secret)])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8001)))
