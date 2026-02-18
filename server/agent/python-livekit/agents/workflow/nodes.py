import json
import os

from ..agent_manager.agent import model_card_output, model_suggest_response, model_summary, model_promotion_analyzer
from ..prompts.agent_prompts import LLM_1, LLM_2, LLM_3, LLM_SUGGEST, LLM_SUMMARY, LLM_PROMOTION_ANALYZER
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


def call_model_promotion_analyzer(state: State):
    """Call the LLM to analyze if a promotion should be suggested"""
    
    # Get available promotions from state
    available_promotions = state.get("available_promotions", [])
    
    if DEBUG_MODE:
        print(f"\n{'=' * 70}")
        print("[WORKFLOW NODE] PROMOTION_ANALYZER")
        print(f"{'=' * 70}")
        print(f"\n🎁 Available Promotions: {len(available_promotions)}")
        for i, promo in enumerate(available_promotions, 1):
            promo_name = promo.get('name', 'Unknown')
            promo_type = promo.get('type', 'unknown')
            print(f"   {i}. [{promo_type}] {promo_name}")
        print(f"{'=' * 70}\n")
    
    # If no promotions available, return empty result
    if not available_promotions:
        return {"llm_promotion_response": {
            "should_suggest": False,
            "promo_id": None,
            "promo_name": None,
            "promo_name_th": None,
            "suggestion_reason": "No promotions available for this customer",
            "suggested_script": "",
            "suggested_script_th": "",
            "urgency": "low"
        }}
    
    model_response = model_promotion_analyzer.invoke(
        [
            {"role": "system", "content": LLM_PROMOTION_ANALYZER},
            {
                "role": "user",
                "content": f"""

            user_info :
            {(state["user_info"])}

            available_promotions :
            {available_promotions}

            Summary Previous Conversation :
            {state["context_summary"]}

            Current Conversation :
            {state["conversation_data"]}
            """,
            },
        ]
    )

    if DEBUG_MODE:
        print(f"[WORKFLOW NODE] PROMOTION_ANALYZER Response: {model_response.model_dump()}")

    return {"llm_promotion_response": model_response.model_dump()}


def aggregator_suggest_response(state: State):
    """Call the LLM to Process and Gen Suggest Response"""

    # Get promotion analysis
    promo_response = state.get("llm_promotion_response", {})
    should_suggest_promo = promo_response.get("should_suggest", False)

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
        
        # Show promotion suggestion if available
        if should_suggest_promo:
            print(f"\n🎁 PROMOTION SUGGESTION:")
            print(f"   Promo: {promo_response.get('promo_name', 'N/A')}")
            print(f"   Urgency: {promo_response.get('urgency', 'N/A')}")
            print(f"   Reason: {promo_response.get('suggestion_reason', 'N/A')[:100]}...")
        
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
        if should_suggest_promo:
            print(f"   → INCLUDE promotion: {promo_response.get('promo_name', 'N/A')}")
        print(f"{'=' * 70}\n")

    # Build enhanced LLM_SUGGEST prompt with promotion context
    enhanced_llm_suggest = LLM_SUGGEST
    
    # If promotion should be suggested, add it to the prompt
    if should_suggest_promo:
        promo_context = f"""

══════════════════════════════════════════════════════════════════
🎁 PROMOTION SUGGESTION (INCLUDE IN RESPONSE IF APPROPRIATE):
══════════════════════════════════════════════════════════════════

A promotion has been identified that may help this conversation:

Promotion: {promo_response.get('promo_name', 'N/A')}
Reason: {promo_response.get('suggestion_reason', 'N/A')}
Script to use: {promo_response.get('suggested_script', 'N/A')}
Urgency: {promo_response.get('urgency', 'N/A')}

When creating the suggested_script in your response, NATURALLY INCORPORATE 
the promotion offer if it fits the conversation flow. Don't force it if 
the moment isn't right, but DO use it if the customer is showing signs 
of churn risk or asking about deals.
"""
        enhanced_llm_suggest = LLM_SUGGEST + promo_context

    model_response = model_suggest_response.invoke(
        [
            {"role": "system", "content": enhanced_llm_suggest},
            {
                "role": "user",
                "content": f"""

            user_info :
            {state["user_info"]}

            Live Suggest Card:
            {{
                    (
                        state["llm_card_1_response"],
                        state["llm_card_2_response"],
                        state["llm_card_3_response"],
                    )
                }}

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

    # Return both the suggestion and promotion data for the data channel
    return {
        "suggest_response": model_response.model_dump(),
        "promotion_suggestion": promo_response if should_suggest_promo else None
    }


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