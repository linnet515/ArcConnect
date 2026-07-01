import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/chat", tags=["chat"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

SYSTEM_PROMPT = """You are Arc Assistant, a friendly and knowledgeable AI helper for ArcConnect — a mentorship platform that connects alumni (mentors) and students.

About ArcConnect:
- ArcConnect is a structured mentorship platform built for alumni and students.
- Alumni (mentors) can post mentorship opportunities, define criteria and slots, review applicants, and accept or reject them.
- Students can browse opportunities, apply for mentorships, and track their application status in real time.
- The platform supports domains like placements, internships, higher studies (MS/MBA), entrepreneurship, software engineering, product management, data science, research, finance, consulting, design, and core engineering.
- Registration is free for both mentors and students.
- Mentors manage only their own opportunities; students can apply but cannot manage opportunities.
- Both roles get tailored dashboards.

Your job:
- Answer questions about ArcConnect clearly and helpfully.
- Keep answers concise — 2 to 4 sentences unless more detail is needed.
- Be warm, encouraging, and direct.
- If someone asks how to get started, guide them to register at the bottom of the page.
- Do not make up features that aren't described above."""


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "claude-sonnet-4-5"
    max_tokens: int = 1000


@router.post("")
async def chat(payload: ChatRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI chat is not configured. Set ANTHROPIC_API_KEY in your .env file."
        )

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            res = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": payload.model,
                    "max_tokens": payload.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [m.model_dump() for m in payload.messages],
                },
            )
            res.raise_for_status()
            return res.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="AI service error")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Could not reach AI service")
