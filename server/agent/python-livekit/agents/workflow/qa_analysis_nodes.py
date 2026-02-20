"""
QA Analysis Workflow Nodes
LangGraph node functions for parallel criteria evaluation and aggregation
"""

import os
import json
from typing import Dict, Any

from agents.agent_manager.qa_analysis_agent import (
    model_criteria_result,
    model_qa_report,
)
from agents.prompts.qa_analysis_prompts import (
    QA_SYSTEM_PROMPT,
    CRITERIA_EVALUATION_PROMPT,
    QA_AGGREGATION_PROMPT,
    DEFAULT_CRITERIA,
)
from agents.schemas.qa_types import QAnalysisState

# Debug mode
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


def format_transcripts(transcripts: list) -> str:
    """Format transcript array for LLM input"""
    if not transcripts:
        return "No transcripts available."
    
    lines = []
    for i, t in enumerate(transcripts):
        speaker = t.get('speaker', 'unknown').upper()
        text = t.get('text', '')
        lines.append(f"[{i+1}] {speaker}: {text}")
    return "\n".join(lines)


def debug_log(state: QAnalysisState, node_name: str):
    """Debug logging for node execution"""
    if DEBUG_MODE:
        print(f"\n{'='*60}")
        print(f"[QA NODE] {node_name}")
        print(f"{'='*60}")
        metadata = state.get('call_metadata', {})
        print(f"Call ID: {metadata.get('call_id', 'N/A')}")
        print(f"Duration: {metadata.get('duration_seconds', 0)}s")
        print(f"Turns: {metadata.get('total_turns', 0)}")
        print(f"Criteria to evaluate: {len(state.get('criteria', []))}")
        print(f"Transcripts: {len(state.get('transcripts', []))} messages")
        print(f"{'='*60}\n")


# ============== Criteria Evaluation Node ==============

def evaluate_criteria_node(state: QAnalysisState) -> Dict[str, Any]:
    """
    Node: Evaluate all criteria sequentially
    
    For each criteria in the list:
    - Call LLM with criteria-specific prompt
    - Get structured result with score, reasoning, evidence
    
    Returns criteria_results dict with all evaluations
    """
    debug_log(state, "CRITERIA_EVALUATION")
    
    metadata = state["call_metadata"]
    transcripts = state["transcripts"]
    criteria_list = state.get("criteria", DEFAULT_CRITERIA)
    
    transcript_text = format_transcripts(transcripts)
    
    criteria_results = []
    
    for criteria in criteria_list:
        criteria_id = criteria.get('id', 'unknown')
        criteria_name = criteria.get('name', 'Unknown Criteria')
        criteria_desc = criteria.get('description', '')
        criteria_prompt = criteria.get('prompt', criteria.get('ai_prompt', ''))
        
        try:
            # Build prompt for this criteria
            prompt = CRITERIA_EVALUATION_PROMPT.format(
                criteria_name=criteria_name,
                criteria_description=criteria_desc,
                criteria_prompt=criteria_prompt,
                duration_seconds=metadata.get('duration_seconds', 0),
                total_turns=metadata.get('total_turns', 0),
                scenario_type=metadata.get('scenario_type', 'customer_service'),
                transcript=transcript_text
            )
            
            # Call LLM with structured output
            response = model_criteria_result.invoke([
                {"role": "system", "content": QA_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            
            result = response.model_dump()
            
            if DEBUG_MODE:
                print(f"[QA NODE] {criteria_name}: Score {result.get('score')}/5")
            
            criteria_results.append(result)
            
        except Exception as e:
            print(f"[ERROR] Failed to evaluate criteria {criteria_name}: {e}")
            # Add fallback result
            criteria_results.append({
                "criteria_id": criteria_id,
                "criteria_name": criteria_name,
                "score": 3,
                "reasoning": f"Evaluation failed: {str(e)}",
                "evidence_quote": "Unable to extract evidence due to processing error",
                "evidence_timestamp": 0
            })
    
    return {"criteria_results": criteria_results}


# ============== Aggregation Node ==============

def aggregate_qa_report_node(state: QAnalysisState) -> Dict[str, Any]:
    """
    Final Node: Aggregate all criteria evaluations into cohesive QA report
    Runs after all criteria evaluations complete
    """
    if DEBUG_MODE:
        print(f"\n{'='*60}")
        print("[QA NODE] AGGREGATOR")
        print(f"{'='*60}")
        print(f"Criteria Results: {json.dumps(state.get('criteria_results', []), indent=2, ensure_ascii=False)[:500]}...")
        print(f"{'='*60}\n")
    
    metadata = state.get("call_metadata", {})
    criteria_results = state.get("criteria_results", [])
    
    if not criteria_results:
        print("[ERROR] No criteria results to aggregate")
        return {"qa_report": {
            "overall_score": 60,
            "summary_feedback": "QA analysis incomplete - no criteria evaluated",
            "key_strengths": ["Unable to analyze"],
            "key_improvements": ["Please review manually"]
        }}
    
    try:
        # Build aggregation prompt
        criteria_results_text = json.dumps(criteria_results, indent=2, ensure_ascii=False)
        
        prompt = QA_AGGREGATION_PROMPT.format(
            criteria_results=criteria_results_text,
            duration_seconds=metadata.get('duration_seconds', 0),
            total_turns=metadata.get('total_turns', 0)
        )
        
        # Call LLM for aggregation
        response = model_qa_report.invoke([
            {"role": "system", "content": QA_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ])
        
        report = response.model_dump()
        
        # Add criteria scores to the report
        report["criteria_scores"] = criteria_results
        
        if DEBUG_MODE:
            print(f"[QA NODE] Final Report: Overall {report.get('overall_score')}/100")
        
        return {"qa_report": report}
        
    except Exception as e:
        print(f"[ERROR] QA report aggregation failed: {e}")
        
        # Calculate fallback overall score
        avg_score = sum(r.get('score', 3) for r in criteria_results) / len(criteria_results)
        overall_score = int((avg_score / 5) * 100)
        
        return {"qa_report": {
            "overall_score": overall_score,
            "summary_feedback": "QA analysis completed with partial results.",
            "key_strengths": ["Analysis completed"],
            "key_improvements": ["Review individual criteria for details"],
            "criteria_scores": criteria_results
        }}
