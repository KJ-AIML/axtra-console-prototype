"""
QA Analysis Schema Types
Pydantic models for structured output from QA workflow nodes
"""

from typing import List, Literal, TypedDict, Optional
from pydantic import BaseModel, Field


# ============== LangGraph State ==============

class QAnalysisState(TypedDict):
    """State for QA analysis workflow"""
    # Inputs
    call_metadata: dict                  # {call_id, duration_seconds, total_turns, scenario_type}
    transcripts: list                    # Full conversation
    coaching_history: list               # AXTRA Copilot history
    criteria: list                       # QA criteria to evaluate
    
    # Intermediate outputs (parallel nodes - one per criteria)
    criteria_results: dict               # {criteria_id: CriteriaResult}
    
    # Final output
    qa_report: dict                      # Aggregated QA report


# ============== Structured Output Models ==============

class CriteriaResult(BaseModel):
    """Result for a single criteria evaluation"""
    criteria_id: str = Field(description="ID of the criteria being evaluated")
    criteria_name: str = Field(description="Name of the criteria")
    score: int = Field(ge=1, le=5, description="Score 1-5: 1=Poor, 2=Below Average, 3=Average, 4=Good, 5=Excellent")
    reasoning: str = Field(description="Detailed explanation of why this score was given")
    evidence_quote: str = Field(description="Specific quote from transcript supporting the score")
    evidence_timestamp: int = Field(ge=0, description="Approximate timestamp in seconds where evidence appears")


class QAReportOutput(BaseModel):
    """Final aggregated QA report output"""
    overall_score: int = Field(
        ge=0, le=100,
        description="Overall QA score calculated as average of criteria scores (converted to 0-100 scale)"
    )
    summary_feedback: str = Field(
        description="Brief summary (2-3 sentences) of the call quality assessment"
    )
    key_strengths: List[str] = Field(
        description="2-3 specific things the operator did well"
    )
    key_improvements: List[str] = Field(
        description="2-3 specific areas for improvement"
    )


# ============== API Input/Output ==============

class QAAnalysisInput(BaseModel):
    """Input from backend to QA agent"""
    call_id: str
    transcripts: List[dict]
    coaching_history: List[dict] = []
    duration_seconds: int
    total_turns: int
    scenario_type: str = "customer_service"
    criteria: List[dict] = []  # Optional custom criteria


class QAAnalysisResponse(BaseModel):
    """Output from QA agent to backend"""
    success: bool
    data: dict  # Contains overall_score, summary_feedback, criteria_scores, etc.
    processing_time_ms: Optional[int] = None
    error: Optional[str] = None
