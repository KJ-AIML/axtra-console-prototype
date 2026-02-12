"""
QA Analysis Workflow Builder
Construct the LangGraph state graph for QA analysis
"""

from langgraph.graph import END, START, StateGraph

from agents.schemas.qa_types import QAnalysisState
from agents.workflow.qa_analysis_nodes import (
    evaluate_criteria_node,
    aggregate_qa_report_node,
)


def build_qa_analysis_workflow():
    """
    Build the QA analysis workflow graph.
    
    Architecture: Criteria Evaluation → Aggregation
    
    Node 1: evaluate_criteria
        - Evaluates each criteria sequentially
        - Produces detailed scores with evidence
    
    Node 2: aggregate_qa_report
        - Combines all criteria results
        - Generates overall score and summary
    
    Returns:
        Compiled StateGraph ready for invocation
    """
    # Initialize graph with our state type
    builder = StateGraph(QAnalysisState)
    
    # Add nodes
    builder.add_node("evaluate_criteria", evaluate_criteria_node)
    builder.add_node("aggregate_qa_report", aggregate_qa_report_node)
    
    # Define edges
    builder.add_edge(START, "evaluate_criteria")
    builder.add_edge("evaluate_criteria", "aggregate_qa_report")
    builder.add_edge("aggregate_qa_report", END)
    
    # Compile and return
    return builder.compile()


# Singleton instance for reuse
_qa_analysis_workflow = None


def get_qa_analysis_workflow():
    """
    Get or create the QA analysis workflow singleton.
    Reuses compiled workflow instance for performance.
    """
    global _qa_analysis_workflow
    if _qa_analysis_workflow is None:
        _qa_analysis_workflow = build_qa_analysis_workflow()
    return _qa_analysis_workflow
