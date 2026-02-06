from langgraph.graph import END, START, StateGraph

from ..schemas.types import State
from .nodes import (
    aggregator_suggest_response,
    call_model_card_1,
    call_model_card_2,
    call_model_card_3,
)


def build_workflow():
    # Build workflow
    parallel_builder = StateGraph(State)

    # Add nodes
    parallel_builder.add_node("call_model_card_1", call_model_card_1)
    parallel_builder.add_node("call_model_card_2", call_model_card_2)
    parallel_builder.add_node("call_model_card_3", call_model_card_3)
    parallel_builder.add_node("aggregator_suggest_response", aggregator_suggest_response)

    # Add edges to connect nodes
    parallel_builder.add_edge(START, "call_model_card_1")
    parallel_builder.add_edge(START, "call_model_card_2")
    parallel_builder.add_edge(START, "call_model_card_3")
    parallel_builder.add_edge("call_model_card_1", "aggregator_suggest_response")
    parallel_builder.add_edge("call_model_card_2", "aggregator_suggest_response")
    parallel_builder.add_edge("call_model_card_3", "aggregator_suggest_response")
    parallel_builder.add_edge("aggregator_suggest_response", END)
    parallel_workflow = parallel_builder.compile()

    return parallel_workflow
