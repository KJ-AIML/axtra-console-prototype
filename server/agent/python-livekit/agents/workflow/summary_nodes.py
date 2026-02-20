"""
Call Summary Workflow Nodes
LangGraph node functions for parallel analysis and aggregation
"""

import os
import json
from typing import Dict, Any

from agents.agent_manager.call_summary_agent import (
    model_sentiment,
    model_key_moments,
    model_performance,
    model_summary,
)
from agents.prompts.call_summary_prompts import (
    SENTIMENT_ANALYSIS_PROMPT,
    KEY_MOMENTS_PROMPT,
    OPERATOR_PERFORMANCE_PROMPT,
    SUMMARY_AGGREGATION_PROMPT,
)
from agents.schemas.call_summary_types import CallSummaryState

# Debug mode
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


def format_transcripts(transcripts: list) -> str:
    """Format transcript array for LLM input"""
    if not transcripts:
        return "No transcripts available."
    
    lines = []
    for t in transcripts:
        speaker = t.get('speaker', 'unknown').upper()
        text = t.get('text', '')
        time = t.get('timestamp', '')
        lines.append(f"[{time}] {speaker}: {text}")
    return "\n".join(lines)


def format_coaching(coaching_history: list) -> str:
    """Format coaching history for LLM input"""
    if not coaching_history:
        return "No coaching suggestions were provided during this call."
    
    lines = []
    for c in coaching_history:
        analysis_id = c.get('analysis_id', 0)
        cards = c.get('cards', [])
        lines.append(f"\nCoaching Update #{analysis_id}:")
        for i, card in enumerate(cards, 1):
            lines.append(f"  Card {i}: {card.get('title')} ({card.get('status')})")
            lines.append(f"    Suggestion: {card.get('action')}")
    return "\n".join(lines)


def debug_log(state: CallSummaryState, node_name: str):
    """Debug logging for node execution"""
    if DEBUG_MODE:
        print(f"\n{'='*60}")
        print(f"[SUMMARY NODE] {node_name}")
        print(f"{'='*60}")
        metadata = state.get('call_metadata', {})
        print(f"Call ID: {metadata.get('call_id', 'N/A')}")
        print(f"Duration: {metadata.get('duration_seconds', 0)}s")
        print(f"Turns: {metadata.get('total_turns', 0)}")
        print(f"Transcripts: {len(state.get('transcripts', []))} messages")
        print(f"Coaching: {len(state.get('coaching_history', []))} updates")
        print(f"{'='*60}\n")


# ============== Parallel Analysis Nodes ==============

def analyze_sentiment_node(state: CallSummaryState) -> Dict[str, Any]:
    """
    Node 1: Analyze customer sentiment journey
    Parallel processing - independent of other analysis nodes
    """
    debug_log(state, "SENTIMENT_ANALYSIS")
    
    metadata = state["call_metadata"]
    transcripts = state["transcripts"]
    
    try:
        response = model_sentiment.invoke([
            {"role": "system", "content": SENTIMENT_ANALYSIS_PROMPT},
            {"role": "user", "content": f"""Call Metadata:
- Duration: {metadata.get('duration_seconds', 0)} seconds
- Total exchanges: {metadata.get('total_turns', 0)}
- Initial sentiment (from coaching): {metadata.get('customer_sentiment', 'unknown')}
- Scenario: {metadata.get('scenario_type', 'customer_service')}

Conversation:
{format_transcripts(transcripts)}"""}
        ])
        
        if DEBUG_MODE:
            print(f"[SENTIMENT] Result: {response.model_dump()}")
        
        return {"sentiment_analysis": response.model_dump()}
        
    except Exception as e:
        print(f"[ERROR] Sentiment analysis failed: {e}")
        # Return fallback
        return {"sentiment_analysis": {
            "initial_sentiment": "neutral",
            "final_sentiment": "neutral",
            "sentiment_journey": "Unable to analyze sentiment due to processing error.",
            "key_triggers": []
        }}


def extract_key_moments_node(state: CallSummaryState) -> Dict[str, Any]:
    """
    Node 2: Extract key moments and facts
    Parallel processing - independent of other analysis nodes
    """
    debug_log(state, "KEY_MOMENTS")
    
    metadata = state["call_metadata"]
    transcripts = state["transcripts"]
    
    try:
        response = model_key_moments.invoke([
            {"role": "system", "content": KEY_MOMENTS_PROMPT},
            {"role": "user", "content": f"""Scenario: {metadata.get('scenario_type', 'customer_service')}
Duration: {metadata.get('duration_seconds', 0)} seconds

Conversation:
{format_transcripts(transcripts)}"""}
        ])
        
        if DEBUG_MODE:
            print(f"[KEY_MOMENTS] Result: {response.model_dump()}")
        
        return {"key_moments": response.model_dump()}
        
    except Exception as e:
        print(f"[ERROR] Key moments extraction failed: {e}")
        return {"key_moments": {
            "greeting_quality": "average",
            "problem_identified": False,
            "problem_clarity": "Unable to analyze due to processing error.",
            "resolution_attempted": False,
            "resolution_achieved": False,
            "key_facts": []
        }}


def evaluate_performance_node(state: CallSummaryState) -> Dict[str, Any]:
    """
    Node 3: Evaluate operator performance
    Parallel processing - independent of other analysis nodes
    """
    debug_log(state, "OPERATOR_PERFORMANCE")
    
    metadata = state["call_metadata"]
    transcripts = state["transcripts"]
    coaching = state["coaching_history"]
    
    operator_messages = len([t for t in transcripts if t.get('speaker') == 'operator'])
    customer_messages = len([t for t in transcripts if t.get('speaker') == 'customer'])
    
    try:
        response = model_performance.invoke([
            {"role": "system", "content": OPERATOR_PERFORMANCE_PROMPT},
            {"role": "user", "content": f"""Call Statistics:
- Duration: {metadata.get('duration_seconds', 0)} seconds
- Total messages: {len(transcripts)}
- Operator messages: {operator_messages}
- Customer messages: {customer_messages}
- Coaching suggestions provided: {len(coaching)}

Conversation:
{format_transcripts(transcripts)}

Coaching History:
{format_coaching(coaching)}"""}
        ])
        
        if DEBUG_MODE:
            print(f"[PERFORMANCE] Result: {response.model_dump()}")
        
        return {"operator_performance": response.model_dump()}
        
    except Exception as e:
        print(f"[ERROR] Performance evaluation failed: {e}")
        return {"operator_performance": {
            "professionalism": 3,
            "empathy": 3,
            "problem_solving": 3,
            "coaching_utilization": 3,
            "strengths": ["Attempted to handle the call"],
            "improvements": ["Unable to analyze due to processing error"]
        }}


# ============== Aggregation Node ==============

def aggregate_summary_node(state: CallSummaryState) -> Dict[str, Any]:
    """
    Final Node: Aggregate all parallel analyses into cohesive summary
    Runs only after sentiment, key_moments, and performance complete
    """
    if DEBUG_MODE:
        print(f"\n{'='*60}")
        print("[SUMMARY NODE] AGGREGATOR")
        print(f"{'='*60}")
        print(f"Sentiment: {json.dumps(state.get('sentiment_analysis', {}), indent=2, ensure_ascii=False)}")
        print(f"Key Moments: {json.dumps(state.get('key_moments', {}), indent=2, ensure_ascii=False)}")
        print(f"Performance: {json.dumps(state.get('operator_performance', {}), indent=2, ensure_ascii=False)}")
        print(f"{'='*60}\n")
    
    try:
        response = model_summary.invoke([
            {"role": "system", "content": SUMMARY_AGGREGATION_PROMPT},
            {"role": "user", "content": f"""SENTIMENT ANALYSIS:
{json.dumps(state.get('sentiment_analysis', {}), indent=2, ensure_ascii=False)}

KEY MOMENTS:
{json.dumps(state.get('key_moments', {}), indent=2, ensure_ascii=False)}

OPERATOR PERFORMANCE:
{json.dumps(state.get('operator_performance', {}), indent=2, ensure_ascii=False)}

Create a cohesive call summary for the trainee."""}
        ])
        
        if DEBUG_MODE:
            print(f"[AGGREGATOR] Final Summary: {response.model_dump()}")
        
        return {"call_summary": response.model_dump()}
        
    except Exception as e:
        print(f"[ERROR] Summary aggregation failed: {e}")
        # Return fallback summary
        return {"call_summary": {
            "summary": "The call was completed but we encountered an issue generating the detailed summary.",
            "key_points": ["Call completed", "Summary generation encountered an error"],
            "strengths": ["Completed the training session"],
            "improvements": ["Try again for detailed feedback"],
            "customer_satisfaction": 3,
            "resolution_status": "pending",
            "coaching_effectiveness": 3
        }}
