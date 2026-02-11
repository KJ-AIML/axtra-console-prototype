"""
Call Summary Schema Types
Pydantic models for structured output from LLM nodes
"""

from typing import List, Literal, TypedDict, Optional
from pydantic import BaseModel, Field


# ============== LangGraph State ==============

class CallSummaryState(TypedDict):
    """State for post-call summary workflow"""
    # Inputs
    call_metadata: dict                  # {duration_seconds, total_turns, customer_sentiment, scenario_type}
    transcripts: list                    # Full conversation
    coaching_history: list               # AXTRA Copilot history
    
    # Intermediate outputs (parallel nodes)
    sentiment_analysis: dict             # Node 1 output
    key_moments: dict                    # Node 2 output
    operator_performance: dict           # Node 3 output
    
    # Final output
    call_summary: dict                   # Aggregated result


# ============== Structured Output Models ==============

class SentimentAnalysis(BaseModel):
    """Node 1: Analyze customer sentiment journey"""
    initial_sentiment: Literal["happy", "neutral", "frustrated", "angry"] = Field(
        description="Customer sentiment at the start of the call"
    )
    final_sentiment: Literal["happy", "neutral", "frustrated", "angry"] = Field(
        description="Customer sentiment at the end of the call"
    )
    sentiment_journey: str = Field(
        description="Description of how sentiment changed throughout the call"
    )
    key_triggers: List[str] = Field(
        description="Events or statements that caused sentiment shifts"
    )


class KeyMoments(BaseModel):
    """Node 2: Extract key moments from conversation"""
    greeting_quality: Literal["excellent", "good", "average", "poor"] = Field(
        description="Quality of the opening/greeting"
    )
    problem_identified: bool = Field(
        description="Whether the customer's issue was clearly identified"
    )
    problem_clarity: str = Field(
        description="Clear description of the customer's issue"
    )
    resolution_attempted: bool = Field(
        description="Whether a resolution was attempted"
    )
    resolution_achieved: bool = Field(
        description="Whether the issue was resolved by the end of the call"
    )
    key_facts: List[str] = Field(
        description="Important facts learned during the call"
    )


class OperatorPerformance(BaseModel):
    """Node 3: Evaluate operator performance"""
    professionalism: int = Field(ge=1, le=5, description="Professional tone and language (1-5)")
    empathy: int = Field(ge=1, le=5, description="Understanding and responding to customer emotions (1-5)")
    problem_solving: int = Field(ge=1, le=5, description="Effectiveness in resolving the issue (1-5)")
    coaching_utilization: int = Field(ge=1, le=5, description="How well coaching suggestions were used (1-5)")
    strengths: List[str] = Field(description="2-3 specific things the operator did well")
    improvements: List[str] = Field(description="2-3 specific areas for improvement")


class CallSummaryOutput(BaseModel):
    """Final aggregated output - matches backend TypeScript interface"""
    summary: str = Field(
        description="2-3 sentence overview of the call"
    )
    key_points: List[str] = Field(
        description="3-5 important facts or moments from the call"
    )
    strengths: List[str] = Field(
        description="2-3 things the operator did well"
    )
    improvements: List[str] = Field(
        description="2-3 areas for improvement"
    )
    customer_satisfaction: int = Field(
        ge=1, le=5,
        description="Overall customer satisfaction score (1=very unhappy, 5=very satisfied)"
    )
    resolution_status: Literal["resolved", "pending", "escalated", "unresolved"] = Field(
        description="Status of the issue resolution"
    )
    coaching_effectiveness: int = Field(
        ge=1, le=5,
        description="How effectively the operator used coaching (1-5)"
    )


# ============== API Input/Output ==============

class CallSummaryInput(BaseModel):
    """Input from backend to AI agent"""
    call_id: str
    duration_seconds: int
    total_turns: int
    customer_sentiment: str
    scenario_type: str = "customer_service"
    transcripts: List[dict]
    coaching_history: List[dict]


class CallSummaryResponse(BaseModel):
    """Output from AI agent to backend"""
    success: bool
    data: CallSummaryOutput
    processing_time_ms: Optional[int] = None
