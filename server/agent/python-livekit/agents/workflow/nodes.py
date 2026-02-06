from ..agent_manager.agent import model_card_output, model_suggest_response
from ..prompts.agent_prompts import LLM_1, LLM_2, LLM_3, LLM_SUGGEST
from ..schemas.types import State


def call_model_card_1(state: State):
    """Call the LLM to Live Suggest 1"""
    model_response = model_card_output.invoke(
        [
            {"role": "system", "content": LLM_1},
            {"role": "user", "content": f"""

            user_info :
            {(state["user_info"])}

            Summary Previous Conversation :
            {state["context_summary"]}

            Current Conversation :
            {state["conversation_data"]}
            """}
        ]
    )
    return { "llm_card_1_response": model_response.model_dump()}

def call_model_card_2(state: State):
    """Call the LLM to Live Suggest 2"""
    model_response = model_card_output.invoke(
        [
            {"role": "system", "content": LLM_2},
            {"role": "user", "content": f"""

            user_info :
            {state["user_info"]}

            Summary Previous Conversation :
            {state["context_summary"]}

            Current Conversation :
            {state["conversation_data"]}
            """}
        ]
    )
    return { "llm_card_2_response": model_response.model_dump()}

def call_model_card_3(state: State):
    """Call the LLM to Live Suggest 3"""
    model_response = model_card_output.invoke(
        [
            {"role": "system", "content": LLM_3},
            {"role": "user", "content": f"""

            user_info :
            {state["user_info"]}

            Summary Previous Conversation :
            {state["context_summary"]}

            Current Conversation :
            {state["conversation_data"]}
            """}
        ]
    )
    return { "llm_card_3_response": model_response.model_dump()}


def aggregator_suggest_response(state: State):
    """Call the LLM to Process and Gen Suggest Response"""

    model_response = model_suggest_response.invoke(
        [
            {"role": "system", "content": LLM_SUGGEST},
            {"role": "user", "content": f"""

            user_info :
            {state["user_info"]}

            Live Suggest Card:
            {
                state["llm_card_1_response"],
                state["llm_card_2_response"],
                state["llm_card_3_response"]
            }

            Summary Previous Conversation :
            {state["context_summary"]}

            Current Conversation :
            {state["conversation_data"]}
            """}
        ]
    )
    return { "suggest_response": model_response.model_dump()}
