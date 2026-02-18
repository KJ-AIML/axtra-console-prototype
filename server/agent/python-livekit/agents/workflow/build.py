from langgraph.graph import END, START, StateGraph

from ..schemas.types import State
from .nodes import (
    aggregator_suggest_response,
    call_model_card_1,
    call_model_card_2,
    call_model_card_3,
    call_model_promotion_analyzer,
    call_model_summary,
)


def build_workflow():
    # Build workflow
    parallel_builder = StateGraph(State)

    # Add nodes - 4 parallel analyzers (cards + promotion)
    parallel_builder.add_node("call_model_card_1", call_model_card_1)
    parallel_builder.add_node("call_model_card_2", call_model_card_2)
    parallel_builder.add_node("call_model_card_3", call_model_card_3)
    parallel_builder.add_node("call_model_promotion_analyzer", call_model_promotion_analyzer)
    parallel_builder.add_node("aggregator_suggest_response", aggregator_suggest_response)

    # Add edges to connect nodes - all 4 run in parallel from START
    parallel_builder.add_edge(START, "call_model_card_1")
    parallel_builder.add_edge(START, "call_model_card_2")
    parallel_builder.add_edge(START, "call_model_card_3")
    parallel_builder.add_edge(START, "call_model_promotion_analyzer")
    
    # All 4 must complete before aggregator
    parallel_builder.add_edge("call_model_card_1", "aggregator_suggest_response")
    parallel_builder.add_edge("call_model_card_2", "aggregator_suggest_response")
    parallel_builder.add_edge("call_model_card_3", "aggregator_suggest_response")
    parallel_builder.add_edge("call_model_promotion_analyzer", "aggregator_suggest_response")
    parallel_builder.add_edge("aggregator_suggest_response", END)
    parallel_workflow = parallel_builder.compile()

    return parallel_workflow

def build_summary_workflow():
    # Build workflow
    summary_builder = StateGraph(State)

    # Add nodes
    summary_builder.add_node("call_model_summary", call_model_summary)

    # Add edges to connect nodes
    summary_builder.add_edge(START, "call_model_summary")
    summary_builder.add_edge("call_model_summary", END)
    summary_workflow = summary_builder.compile()

    return summary_workflow
