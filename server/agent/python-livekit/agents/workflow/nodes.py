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
        print(f"\n{'=' * 70}")
        print(f"[WORKFLOW NODE] {node_name}")
        print(f"{'=' * 70}")
        
        # Show coaching context
        coaching_ctx = state.get("coaching_context", {})
        if coaching_ctx:
            print(f"\n🎯 COACHING CONTEXT:")
            print(f"   Last Speaker: {coaching_ctx.get('last_speaker_label', 'N/A')}")
            print(f"   Who Needs Coaching: {coaching_ctx.get('who_needs_coaching', 'N/A')}")
            print(f"   Who They're Talking To: {coaching_ctx.get('who_they_are_talking_to', 'N/A')}")
            print(f"   Flow: {coaching_ctx.get('conversation_flow', 'N/A')}")
        
        print(f"\n👤 Customer Profile:")
        print(f"   {json.dumps(state.get('user_info', {}), indent=2, ensure_ascii=False)}")
        
        print(f"\n💬 Conversation Data ({len(state.get('conversation_data', []))} turns):")
        for i, turn in enumerate(state.get("conversation_data", []), 1):
            speaker_type = turn.get("speaker_type", "Unknown")
            speaker_label = turn.get("speaker_label", speaker_type)
            text = turn.get("text", "")
            preview = text[:100] + "..." if len(text) > 100 else text
            marker = "👉 " if i == len(state.get("conversation_data", [])) else "   "
            print(f"{marker}{i}. [{speaker_label}]: {preview}")
        
        last_turn = state.get("conversation_data", [])[-1] if state.get("conversation_data") else None
        if last_turn and coaching_ctx:
            print(f"\n⚡ LAST SPEAKER: {last_turn.get('speaker_type')} → COACH: {coaching_ctx.get('who_needs_coaching', 'N/A')}")
        
        print(f"{'=' * 70}\n")


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
        print(f"\n{'=' * 70}")
        print("[WORKFLOW NODE] AGGREGATOR - FINAL SYNTHESIS")
        print(f"{'=' * 70}")
        
        # Show coaching context clearly
        coaching_ctx = state.get("coaching_context", {})
        if coaching_ctx:
            print(f"\n🎯 COACHING TARGET:")
            print(f"   Coaching: {coaching_ctx.get('who_needs_coaching', 'N/A')}")
            print(f"   Responding To: {coaching_ctx.get('who_they_are_talking_to', 'N/A')}")
            print(f"   Last Speaker Was: {coaching_ctx.get('last_speaker_label', 'N/A')}")
        
        print(f"\n📊 CARD RESPONSES:")
        print(f"   Card 1 (Emotion): {json.dumps(state.get('llm_card_1_response', {}), indent=2, ensure_ascii=False)}")
        print(f"   Card 2 (Leverage): {json.dumps(state.get('llm_card_2_response', {}), indent=2, ensure_ascii=False)}")
        print(f"   Card 3 (Strategy): {json.dumps(state.get('llm_card_3_response', {}), indent=2, ensure_ascii=False)}")
        
        print(f"\n💬 CONVERSATION FLOW:")
        for i, turn in enumerate(state.get("conversation_data", []), 1):
            speaker_label = turn.get("speaker_label", turn.get("speaker_type", "Unknown"))
            text = turn.get("text", "")
            preview = text[:80] + "..." if len(text) > 80 else text
            print(f"   {i}. {speaker_label}: {preview}")
        
        print(f"\n⚡ SYNTHESIS TASK:")
        print(f"   → Create script for: {coaching_ctx.get('who_needs_coaching', 'N/A')}")
        print(f"   → To respond to: {coaching_ctx.get('who_they_are_talking_to', 'N/A')}")
        print(f"   → Based on last message from: {coaching_ctx.get('last_speaker_label', 'N/A')}")
        print(f"{'=' * 70}\n")

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