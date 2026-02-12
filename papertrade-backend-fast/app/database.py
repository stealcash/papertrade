import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# asyncpg doesn't support 'sslmode' query parameter. 
# We strip it and pass ssl=True explicitly if it was requested.
if DATABASE_URL and "sslmode=" in DATABASE_URL:
    from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
    u = urlparse(DATABASE_URL)
    query = parse_qs(u.query)
    has_ssl = 'sslmode' in query
    query.pop('sslmode', None)
    DATABASE_URL = urlunparse(u._replace(query=urlencode(query, doseq=True)))
else:
    has_ssl = False

def get_ssl_context():
    if not (has_ssl or (DATABASE_URL and "neon.tech" in DATABASE_URL)):
        return {}
    
    import ssl
    import certifi
    
    ctx = ssl.create_default_context(cafile=certifi.where())
    # For some environments, we might still need to skip hostname check if it fails
    # ctx.check_hostname = False
    # ctx.verify_mode = ssl.CERT_NONE
    return {"ssl": ctx}

engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    connect_args=get_ssl_context()
)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
