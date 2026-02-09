import json
import os

from ..agent_manager.agent import model_card_output, model_suggest_response, model_summary
from ..prompts.agent_prompts import LLM_1, LLM_2, LLM_3, LLM_SUGGEST, LLM_SUMMARY
from ..schemas.types import State

# Debug mode from env
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


def debug_log_node(node_name: str, state: State):
    """Log node input data in debug mode"""
    if DEBUG_MODE:
        print(f"\n{'=' * 60}")
        print(f"[WORKFLOW NODE] {node_name} - INPUT DATA")
        print(f"{'=' * 60}")
        print(f"User Info: {json.dumps(state.get('user_info', {}), indent=2, ensure_ascii=False)}")
        print(f"\nContext Summary ({len(state.get('context_summary', []))} items):")
        for i, summary in enumerate(state.get("context_summary", [])[-3:], 1):
            preview = summary[:100] + "..." if len(summary) > 100 else summary
            print(f"  {i}. {preview}")
        print(f"\nConversation Data ({len(state.get('conversation_data', []))} turns):")
        for turn in state.get("conversation_data", []):
            speaker = turn.get("speaker", "Unknown")
            text = turn.get("text", "")
            preview = text[:120] + "..." if len(text) > 120 else text
            print(f"  [{speaker}]: {preview}")
        print(f"{'=' * 60}\n")


def call_model_card_1(state: State):
    """Call the LLM to Live Suggest 1"""
    debug_log_node("CARD_1 (EMOTION)", state)

    model_response = model_card_output.invoke(
        [
            {"role": "system", "content": LLM_1},
            {
                "role": "user",
                "content": f"""

            user_info :
            {(state["user_info"])}

            Summary Previous Conversation :
            {state["context_summary"]}

            Current Conversation :
            {state["conversation_data"]}
            """,
            },
        ]
    )

    if DEBUG_MODE:
        print(f"[WORKFLOW NODE] CARD_1 Response: {model_response.model_dump()}")

    return {"llm_card_1_response": model_response.model_dump()}


def call_model_card_2(state: State):
    """Call the LLM to Live Suggest 2"""
    debug_log_node("CARD_2 (LEVERAGE)", state)

    model_response = model_card_output.invoke(
        [
            {"role": "system", "content": LLM_2},
            {
                "role": "user",
                "content": f"""

            user_info :
            {state["user_info"]}

            Summary Previous Conversation :
            {state["context_summary"]}

            Current Conversation :
            {state["conversation_data"]}
            """,
            },
        ]
    )

    if DEBUG_MODE:
        print(f"[WORKFLOW NODE] CARD_2 Response: {model_response.model_dump()}")

    return {"llm_card_2_response": model_response.model_dump()}


def call_model_card_3(state: State):
    """Call the LLM to Live Suggest 3"""
    debug_log_node("CARD_3 (STRATEGY)", state)

    model_response = model_card_output.invoke(
        [
            {"role": "system", "content": LLM_3},
            {
                "role": "user",
                "content": f"""

            user_info :
            {state["user_info"]}

            Summary Previous Conversation :
            {state["context_summary"]}

            Current Conversation :
            {state["conversation_data"]}
            """,
            },
        ]
    )

    if DEBUG_MODE:
        print(f"[WORKFLOW NODE] CARD_3 Response: {model_response.model_dump()}")

    return {"llm_card_3_response": model_response.model_dump()}


def aggregator_suggest_response(state: State):
    """Call the LLM to Process and Gen Suggest Response"""

    if DEBUG_MODE:
        print(f"\n{'=' * 60}")
        print("[WORKFLOW NODE] AGGREGATOR - INPUT DATA")
        print(f"{'=' * 60}")
        print(
            f"Card 1 Response: {json.dumps(state.get('llm_card_1_response', {}), indent=2, ensure_ascii=False)}"
        )
        print(
            f"Card 2 Response: {json.dumps(state.get('llm_card_2_response', {}), indent=2, ensure_ascii=False)}"
        )
        print(
            f"Card 3 Response: {json.dumps(state.get('llm_card_3_response', {}), indent=2, ensure_ascii=False)}"
        )
        print(
            f"\nUser Info: {json.dumps(state.get('user_info', {}), indent=2, ensure_ascii=False)}"
        )
        print(f"\nConversation Data ({len(state.get('conversation_data', []))} turns):")
        for turn in state.get("conversation_data", []):
            speaker = turn.get("speaker", "Unknown")
            text = turn.get("text", "")
            preview = text[:120] + "..." if len(text) > 120 else text
            print(f"  [{speaker}]: {preview}")
        print(f"{'=' * 60}\n")

    model_response = model_suggest_response.invoke(
        [
            {"role": "system", "content": LLM_SUGGEST},
            {
                "role": "user",
                "content": f"""

            user_info :
            {state["user_info"]}

            Live Suggest Card:
            {
                    (
                        state["llm_card_1_response"],
                        state["llm_card_2_response"],
                        state["llm_card_3_response"],
                    )
                }

            Summary Previous Conversation :
            {state["context_summary"]}

            Current Conversation :
            {state["conversation_data"]}
            """,
            },
        ]
    )

    if DEBUG_MODE:
        print(f"[WORKFLOW NODE] AGGREGATOR Response: {model_response.model_dump()}")

    return {"suggest_response": model_response.model_dump()}


def call_model_summary(state: State):
    """Call the LLM to Summarize Conversation"""

    # model_response = model_summary.invoke(
    #     [
    #         {"role": "system", "content": LLM_SUMMARY},
    #         {
    #             "role": "user",
    #             "content": f"""

    #         user_info :
    #         {state["user_info"]}

    #         Current Conversation :
    #         {state["conversation_data"]}
    #         """,
    #         },
    #     ]
    # )

    # if DEBUG_MODE:
    #     print(f"[WORKFLOW NODE] SUMMARY Response: {model_response.model_dump()}")

    # return {"summary_response": model_response.model_dump()}

    print("Good")