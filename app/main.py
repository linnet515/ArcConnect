from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.routers import auth, applications, opportunities, chat

app = FastAPI(title="ArcConnect API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:3000"] if you want to restrict
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check route
@app.get("/api/health")
def health_check():
    return {"message": "ArcConnect backend is running!"}

# 1. Include backend routers FIRST
app.include_router(auth.router, prefix="/api/auth")
app.include_router(applications.router, prefix="/api/applications")
app.include_router(opportunities.router, prefix="/api/opportunities")
app.include_router(chat.router, prefix="/api/chat")

# 2. Move static frontend files mount to the BOTTOM
app.mount("/", StaticFiles(directory="public", html=True), name="static")
