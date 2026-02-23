"""
FastAPI Server for Call Summary Generation
HTTP endpoint for Node.js backend to request AI-powered call summaries
"""

import os
import sys
import time
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.prompts.qa_analysis_prompts import DEFAULT_CRITERIA
from agents.schemas.call_summary_types import (
    CallSummaryInput,
    CallSummaryResponse,
    CallSummaryState,
)
from agents.schemas.qa_types import (
    QAAnalysisInput,
    QAAnalysisResponse,
    QAnalysisState,
)
from agents.services.hierarchical_summary import (
    HierarchicalSummarizer,
    get_hierarchical_summarizer,
)
from agents.workflow.qa_analysis_build import get_qa_analysis_workflow
from agents.workflow.summary_build import get_call_summary_workflow

# ============== Pydantic Models for API ==============

class SummaryRequest(BaseModel):
    """Request from Node.js backend"""
    call_id: str
    duration_seconds: int
    total_turns: int
    customer_sentiment: str
    scenario_type: str = "customer_service"
    transcripts: list
    coaching_history: list


class SummaryResponse(BaseModel):
    """Response to Node.js backend"""
    success: bool
    data: dict
    processing_time_ms: int
    error: Optional[str] = None


# ============== FastAPI App ==============

def configure_console_encoding() -> None:
    """Ensure Thai text is printed correctly in logs on all platforms."""
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if stream and hasattr(stream, "reconfigure"):
            try:
                stream.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - preload workflow on startup"""
    configure_console_encoding()
    print("\n" + "="*70)
    print(" CALL SUMMARY API SERVER STARTING ")
    print("="*70)
    
    # Pre-load workflow for faster first response
    print("[Setup] Pre-loading LangGraph workflow...")
    try:
        workflow = get_call_summary_workflow()
        print(f"[Setup] Workflow loaded successfully: {type(workflow).__name__}")
    except Exception as e:
        print(f"[Setup] Warning: Failed to preload workflow: {e}")
    
    print("="*70 + "\n")
    yield
    
    # Shutdown
    print("\n[Shutdown] Cleaning up...")


app = FastAPI(
    title="AXTRA Call Summary API",
    description="AI-powered call summary generation for call center training",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow requests from Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Helper Functions ==============

def chunk_transcripts(transcripts: list, max_chars: int = 8000) -> list:
    """
    Smart chunking for long transcripts
    Keeps most recent messages if total exceeds limit
    """
    total_chars = sum(len(t.get('text', '')) for t in transcripts)
    
    if total_chars <= max_chars:
        return transcripts
    
    # Keep most recent messages that fit within limit
    # Always keep first greeting and most recent messages
    if len(transcripts) <= 3:
        return transcripts
    
    # Strategy: Keep first message (greeting) + most recent messages
    first_message = [transcripts[0]]
    remaining_chars = max_chars - len(transcripts[0].get('text', ''))
    
    recent_messages = []
    for msg in reversed(transcripts[1:]):
        msg_len = len(msg.get('text', ''))
        if remaining_chars - msg_len >= 0:
            recent_messages.insert(0, msg)
            remaining_chars -= msg_len
        else:
            break
    
    return first_message + recent_messages


def create_state_from_request(request: SummaryRequest) -> CallSummaryState:
    """Convert API request to LangGraph state"""
    
    # Handle long transcripts
    processed_transcripts = chunk_transcripts(request.transcripts)
    if len(processed_transcripts) < len(request.transcripts):
        print(f"[Chunking] Reduced {len(request.transcripts)} transcripts to {len(processed_transcripts)}")
    
    return {
        "call_metadata": {
            "call_id": request.call_id,
            "duration_seconds": request.duration_seconds,
            "total_turns": request.total_turns,
            "customer_sentiment": request.customer_sentiment,
            "scenario_type": request.scenario_type,
        },
        "transcripts": processed_transcripts,
        "coaching_history": request.coaching_history,
        "sentiment_analysis": {},
        "key_moments": {},
        "operator_performance": {},
        "call_summary": {},
    }


# ============== API Endpoints ==============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "axtra-call-summary-api",
        "version": "1.0.0",
    }


@app.post("/api/summary/generate", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest):
    """
    Generate a call summary using LangGraph workflow
    
    This endpoint receives call data from the Node.js backend,
    processes it through the AI workflow, and returns a structured summary.
    
    For calls longer than 10 minutes, uses hierarchical summarization
    to avoid context overflow and maintain quality.
    """
    start_time = time.time()
    
    print(f"\n{'='*70}")
    print(f"[API] Summary Request Received: {request.call_id}")
    print(f"{'='*70}")
    print(f"Duration: {request.duration_seconds}s ({request.duration_seconds//60}min)")
    print(f"Turns: {request.total_turns}")
    print(f"Transcripts: {len(request.transcripts)} messages")
    print(f"Coaching updates: {len(request.coaching_history)}")
    
    try:
        # Use hierarchical summarization for longer calls
        # This handles chunking for long calls automatically
        summarizer = get_hierarchical_summarizer()
        
        call_data = {
            'call_id': request.call_id,
            'duration_seconds': request.duration_seconds,
            'total_turns': request.total_turns,
            'customer_sentiment': request.customer_sentiment,
            'scenario_type': request.scenario_type,
            'transcripts': chunk_transcripts(request.transcripts),
            'coaching_history': request.coaching_history,
        }
        
        print("[API] Processing with hierarchical summarizer...")
        summary_output = summarizer.summarize(call_data)
        
        # Convert Pydantic model to dict
        call_summary = summary_output.model_dump()
        
        processing_time = int((time.time() - start_time) * 1000)
        
        print(f"[API] Summary generated in {processing_time}ms")
        print(f"[API] Satisfaction: {call_summary.get('customer_satisfaction')}/5")
        print(f"[API] Resolution: {call_summary.get('resolution_status')}")
        print(f"{'='*70}\n")
        
        return SummaryResponse(
            success=True,
            data=call_summary,
            processing_time_ms=processing_time,
        )
        
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        print(f"[API] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return fallback response
        fallback_summary = {
            "summary": "The call was completed but we encountered an issue generating the detailed summary. Please try again.",
            "key_points": [
                f"Call lasted {request.duration_seconds} seconds",
                f"{request.total_turns} conversation exchanges",
                "Summary generation encountered a temporary issue"
            ],
            "strengths": ["Completed the training session"],
            "improvements": ["Try again for detailed AI feedback"],
            "customer_satisfaction": 3,
            "resolution_status": "pending",
            "coaching_effectiveness": 3,
        }
        
        return SummaryResponse(
            success=False,
            data=fallback_summary,
            processing_time_ms=processing_time,
            error=str(e),
        )


@app.post("/api/summary/generate-sync")
async def generate_summary_sync(request: SummaryRequest):
    """
    Synchronous version with timeout handling
    Returns immediately if processing takes too long
    """
    import asyncio
    
    try:
        # Run with 30-second timeout
        result = await asyncio.wait_for(
            generate_summary(request),
            timeout=30.0
        )
        return result
    except asyncio.TimeoutError:
        return SummaryResponse(
            success=False,
            data={
                "summary": "Summary generation timed out. The call data has been saved.",
                "key_points": ["Call completed successfully"],
                "strengths": ["Training session completed"],
                "improvements": ["Review transcript manually"],
                "customer_satisfaction": 3,
                "resolution_status": "pending",
                "coaching_effectiveness": 3,
            },
            processing_time_ms=30000,
            error="Processing timeout",
        )


# ============== QA Analysis Endpoints ==============

class QAAnalysisRequest(BaseModel):
    """Request for QA analysis"""
    call_id: str
    transcripts: list
    coaching_history: list = []
    duration_seconds: int
    total_turns: int
    scenario_type: str = "customer_service"
    criteria: list = []  # List of criteria to evaluate


class QAAnalysisResponse(BaseModel):
    """Response from QA analysis"""
    success: bool
    data: dict
    processing_time_ms: int
    error: Optional[str] = None


@app.post("/api/qa/analyze", response_model=QAAnalysisResponse)
async def analyze_qa(request: QAAnalysisRequest):
    """
    Analyze call quality using LangGraph QA workflow
    
    This endpoint evaluates a call against configurable QA criteria
    and returns detailed scoring with evidence.
    
    Workflow:
    1. Evaluate each criteria sequentially (with structured LLM output)
    2. Aggregate all criteria results into final QA report
    """
    start_time = time.time()
    
    print(f"\n{'='*70}")
    print(f"[API] QA Analysis Request: {request.call_id}")
    print(f"{'='*70}")
    print(f"Duration: {request.duration_seconds}s")
    print(f"Turns: {request.total_turns}")
    print(f"Criteria: {len(request.criteria) if request.criteria else 5} items")
    
    try:
        # Get or create workflow
        workflow = get_qa_analysis_workflow()
        
        # Use default criteria if none provided
        criteria = request.criteria if request.criteria else DEFAULT_CRITERIA
        
        # Prepare initial state
        initial_state: QAnalysisState = {
            "call_metadata": {
                "call_id": request.call_id,
                "duration_seconds": request.duration_seconds,
                "total_turns": request.total_turns,
                "scenario_type": request.scenario_type,
            },
            "transcripts": request.transcripts,
            "coaching_history": request.coaching_history,
            "criteria": criteria,
            "criteria_results": {},
            "qa_report": {},
        }
        
        print("[API] Invoking QA analysis workflow...")
        
        # Run workflow
        final_state = workflow.invoke(initial_state)
        
        # Extract result
        qa_report = final_state.get("qa_report", {})
        
        processing_time = int((time.time() - start_time) * 1000)
        
        print(f"[API] QA workflow completed in {processing_time}ms")
        print(f"[API] Overall Score: {qa_report.get('overall_score')}/100")
        print(f"[API] Criteria evaluated: {len(qa_report.get('criteria_scores', []))}")
        print(f"{'='*70}\n")
        
        return QAAnalysisResponse(
            success=True,
            data=qa_report,
            processing_time_ms=processing_time,
        )
        
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        print(f"[API] QA Analysis Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return fallback
        return QAAnalysisResponse(
            success=False,
            data={
                "overall_score": 60,
                "summary_feedback": "QA analysis encountered an error. Please review manually.",
                "key_strengths": ["Unable to analyze"],
                "key_improvements": ["Please review manually"],
                "criteria_scores": []
            },
            processing_time_ms=processing_time,
            error=str(e),
        )


# ============== Main Entry Point ==============

def main():
    """Run the API server"""
    configure_console_encoding()
    port = int(os.getenv("SUMMARY_API_PORT", "8001"))
    host = os.getenv("SUMMARY_API_HOST", "0.0.0.0")
    
    print(f"\nStarting Call Summary API Server on {host}:{port}")
    print(f"Health check: http://{host}:{port}/health")
    print(f"Summary endpoint: http://{host}:{port}/api/summary/generate")
    print(f"QA Analysis endpoint: http://{host}:{port}/api/qa/analyze")
    
    uvicorn.run(
        "api.server:app",
        host=host,
        port=port,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
