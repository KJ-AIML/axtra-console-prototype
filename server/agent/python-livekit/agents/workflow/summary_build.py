"""
Call Summary Workflow Builder
Construct the LangGraph state graph for call summary generation
"""

from langgraph.graph import END, START, StateGraph

from agents.schemas.call_summary_types import CallSummaryState
from agents.workflow.summary_nodes import (
    analyze_sentiment_node,
    extract_key_moments_node,
    evaluate_performance_node,
    aggregate_summary_node,
)


def build_call_summary_workflow():
    """
    Build the call summary workflow graph.
    
    Architecture: Parallel Analysis → Aggregation
    
    Parallel Nodes (run simultaneously):
    - analyze_sentiment: Customer sentiment journey analysis
    - extract_key_moments: Key moments and facts extraction
    - evaluate_performance: Operator performance evaluation
    
    Aggregation Node (runs after all parallel nodes complete):
    - aggregate_summary: Combines all analyses into final summary
    
    Returns:
        Compiled StateGraph ready for invocation
    """
    # Initialize graph with our state type
    builder = StateGraph(CallSummaryState)
    
    # Add parallel analysis nodes
    builder.add_node("analyze_sentiment", analyze_sentiment_node)
    builder.add_node("extract_key_moments", extract_key_moments_node)
    builder.add_node("evaluate_performance", evaluate_performance_node)
    
    # Add aggregation node
    builder.add_node("aggregate_summary", aggregate_summary_node)
    
    # Parallel edges from START to all analysis nodes
    # These three nodes run simultaneously (independent of each other)
    builder.add_edge(START, "analyze_sentiment")
    builder.add_edge(START, "extract_key_moments")
    builder.add_edge(START, "evaluate_performance")
    
    # All parallel nodes must complete before aggregation
    # LangGraph automatically waits for all upstream nodes to complete
    builder.add_edge("analyze_sentiment", "aggregate_summary")
    builder.add_edge("extract_key_moments", "aggregate_summary")
    builder.add_edge("evaluate_performance", "aggregate_summary")
    
    # End after aggregation
    builder.add_edge("aggregate_summary", END)
    
    # Compile and return
    return builder.compile()


# Singleton instance for reuse
_call_summary_workflow = None


def get_call_summary_workflow():
    """
    Get or create the call summary workflow singleton.
    Reuses compiled workflow instance for performance.
    """
    global _call_summary_workflow
    if _call_summary_workflow is None:
        _call_summary_workflow = build_call_summary_workflow()
    return _call_summary_workflow
