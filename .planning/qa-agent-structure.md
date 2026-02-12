# QA Agent Structure

Document showing how the QA agent follows the existing project structure.

---

## 📁 File Structure Comparison

### Existing Call Summary Agent Structure
```
agents/
├── agent_manager/
│   └── call_summary_agent.py      # Initialize LLM with structured output
├── prompts/
│   └── call_summary_prompts.py    # Prompts for each node
├── schemas/
│   └── call_summary_types.py      # State + Pydantic models
├── services/
│   └── hierarchical_summary.py    # Service layer (optional)
└── workflow/
    ├── summary_build.py            # Workflow builder
    └── summary_nodes.py            # Node functions
```

### NEW QA Analysis Agent Structure (Following Same Pattern)
```
agents/
├── agent_manager/
│   ├── call_summary_agent.py      # Existing
│   └── qa_analysis_agent.py       # NEW - Initialize LLM
├── prompts/
│   ├── call_summary_prompts.py    # Existing
│   └── qa_analysis_prompts.py     # NEW - Prompts
├── schemas/
│   ├── call_summary_types.py      # Existing
│   └── qa_types.py                # NEW - State + Pydantic
├── services/
│   └── hierarchical_summary.py    # Existing
└── workflow/
    ├── summary_build.py            # Existing
    ├── summary_nodes.py            # Existing
    ├── qa_analysis_build.py        # NEW - Workflow builder
    └── qa_analysis_nodes.py        # NEW - Node functions
```

---

## 🔍 Pattern Comparison

### 1. Schema (Types) Pattern

**Call Summary (`call_summary_types.py`):**
```python
class CallSummaryState(TypedDict):
    call_metadata: dict
    transcripts: list
    coaching_history: list
    sentiment_analysis: dict  # Node output
    key_moments: dict         # Node output
    operator_performance: dict # Node output
    call_summary: dict        # Final output

class SentimentAnalysis(BaseModel): ...
class KeyMoments(BaseModel): ...
class OperatorPerformance(BaseModel): ...
class CallSummaryOutput(BaseModel): ...
```

**QA Analysis (`qa_types.py`) - Same Pattern:**
```python
class QAnalysisState(TypedDict):
    call_metadata: dict
    transcripts: list
    coaching_history: list
    criteria: list
    criteria_results: dict   # Node output
    qa_report: dict          # Final output

class CriteriaResult(BaseModel): ...
class QAReportOutput(BaseModel): ...
```

### 2. Agent Manager Pattern

**Call Summary (`call_summary_agent.py`):**
```python
model = init_chat_model("google_genai:gemini-2.5-flash-lite", ...)

# Structured outputs for each node
model_sentiment = model.with_structured_output(SentimentAnalysis)
model_key_moments = model.with_structured_output(KeyMoments)
model_performance = model.with_structured_output(OperatorPerformance)
model_summary = model.with_structured_output(CallSummaryOutput)
```

**QA Analysis (`qa_analysis_agent.py`) - Same Pattern:**
```python
model = init_chat_model("google_genai:gemini-2.5-flash-lite", ...)

# Structured outputs for each node
model_criteria_result = model.with_structured_output(CriteriaResult)
model_qa_report = model.with_structured_output(QAReportOutput)
```

### 3. Workflow Builder Pattern

**Call Summary (`summary_build.py`):**
```python
def build_call_summary_workflow():
    builder = StateGraph(CallSummaryState)
    
    # Parallel nodes
    builder.add_node("analyze_sentiment", analyze_sentiment_node)
    builder.add_node("extract_key_moments", extract_key_moments_node)
    builder.add_node("evaluate_performance", evaluate_performance_node)
    builder.add_node("aggregate_summary", aggregate_summary_node)
    
    # Parallel edges
    builder.add_edge(START, "analyze_sentiment")
    builder.add_edge(START, "extract_key_moments")
    builder.add_edge(START, "evaluate_performance")
    
    # Aggregation
    builder.add_edge("analyze_sentiment", "aggregate_summary")
    builder.add_edge("extract_key_moments", "aggregate_summary")
    builder.add_edge("evaluate_performance", "aggregate_summary")
    builder.add_edge("aggregate_summary", END)
    
    return builder.compile()

# Singleton
def get_call_summary_workflow(): ...
```

**QA Analysis (`qa_analysis_build.py`) - Same Pattern:**
```python
def build_qa_analysis_workflow():
    builder = StateGraph(QAnalysisState)
    
    # Sequential nodes (criteria evaluation then aggregation)
    builder.add_node("evaluate_criteria", evaluate_criteria_node)
    builder.add_node("aggregate_qa_report", aggregate_qa_report_node)
    
    # Sequential edges
    builder.add_edge(START, "evaluate_criteria")
    builder.add_edge("evaluate_criteria", "aggregate_qa_report")
    builder.add_edge("aggregate_qa_report", END)
    
    return builder.compile()

# Singleton
def get_qa_analysis_workflow(): ...
```

### 4. Node Function Pattern

**Call Summary (`summary_nodes.py`):**
```python
def analyze_sentiment_node(state: CallSummaryState) -> Dict[str, Any]:
    debug_log(state, "SENTIMENT_ANALYSIS")
    
    try:
        response = model_sentiment.invoke([
            {"role": "system", "content": SENTIMENT_ANALYSIS_PROMPT},
            {"role": "user", "content": format_prompt(state)}
        ])
        return {"sentiment_analysis": response.model_dump()}
    except Exception as e:
        print(f"[ERROR] ...")
        return {"sentiment_analysis": fallback_dict}
```

**QA Analysis (`qa_analysis_nodes.py`) - Same Pattern:**
```python
def evaluate_criteria_node(state: QAnalysisState) -> Dict[str, Any]:
    debug_log(state, "CRITERIA_EVALUATION")
    
    for criteria in criteria_list:
        try:
            response = model_criteria_result.invoke([
                {"role": "system", "content": QA_SYSTEM_PROMPT},
                {"role": "user", "content": format_prompt(criteria, state)}
            ])
            criteria_results.append(response.model_dump())
        except Exception as e:
            print(f"[ERROR] ...")
            criteria_results.append(fallback_dict)
    
    return {"criteria_results": criteria_results}
```

### 5. API Endpoint Pattern

**Call Summary:**
```python
@app.post("/api/summary/generate")
async def generate_summary(request: SummaryRequest):
    workflow = get_call_summary_workflow()
    
    initial_state = {
        "call_metadata": {...},
        "transcripts": request.transcripts,
        ...
    }
    
    final_state = workflow.invoke(initial_state)
    summary = final_state.get("call_summary", {})
    
    return SummaryResponse(success=True, data=summary, ...)
```

**QA Analysis - Same Pattern:**
```python
@app.post("/api/qa/analyze")
async def analyze_qa(request: QAAnalysisRequest):
    workflow = get_qa_analysis_workflow()
    
    initial_state = {
        "call_metadata": {...},
        "transcripts": request.transcripts,
        "criteria": request.criteria or DEFAULT_CRITERIA,
        ...
    }
    
    final_state = workflow.invoke(initial_state)
    qa_report = final_state.get("qa_report", {})
    
    return QAAnalysisResponse(success=True, data=qa_report, ...)
```

---

## ✅ Benefits of This Structure

1. **Consistency** - QA agent follows exact same pattern as call summary agent
2. **Maintainability** - Easy to understand if you know one workflow, you know both
3. **Debuggability** - Same debug logging pattern, same error handling
4. **Testability** - Same structure means same testing approaches work
5. **Scalability** - Easy to add more workflows following this pattern

---

## 🎯 Key Differences (By Design)

| Aspect | Call Summary | QA Analysis |
|--------|--------------|-------------|
| **Parallelism** | 3 parallel nodes → 1 aggregator | Sequential criteria eval → aggregator |
| **Output Structure** | Single summary object | List of criteria scores + overall report |
| **Node Count** | 4 nodes (3 parallel + 1 agg) | 2 nodes (sequential) |
| **Use Case** | Post-call summary | Quality assurance scoring |

---

## 📊 Workflow Diagrams

### Call Summary Workflow
```
START
  │
  ├──▶ analyze_sentiment ──┐
  │                        │
  ├──▶ extract_key_moments ─┤
  │                        │  (parallel)
  └──▶ evaluate_performance─┤
                           │
                    aggregate_summary
                           │
                          END
```

### QA Analysis Workflow
```
START
  │
  ▼
evaluate_criteria (loops through all 5 criteria sequentially)
  │
  ▼
aggregate_qa_report
  │
  END
```

---

## 🔧 How to Debug

Both workflows support the same `DEBUG_MODE` environment variable:

```bash
DEBUG_MODE=true python api/server.py
```

This enables detailed logging showing:
- Node entry/exit
- State contents
- LLM inputs/outputs
- Processing times

---

## 📁 Files Created

### Following Your Structure:

| File | Purpose |
|------|---------|
| `agents/schemas/qa_types.py` | State + Pydantic models |
| `agents/prompts/qa_analysis_prompts.py` | Prompts + default criteria |
| `agents/agent_manager/qa_analysis_agent.py` | LLM initialization |
| `agents/workflow/qa_analysis_nodes.py` | Node functions |
| `agents/workflow/qa_analysis_build.py` | Workflow builder |

### Updated Files:

| File | Change |
|------|--------|
| `api/server.py` | Added QA endpoint using LangGraph workflow |

---

## ✅ Summary

The QA agent now **perfectly follows your existing structure**:

1. ✅ Same directory structure
2. ✅ Same file naming conventions
3. ✅ Same class/function patterns
4. ✅ Same debug logging approach
5. ✅ Same error handling strategy
6. ✅ Same API endpoint pattern

You can now debug and maintain it the same way you debug the call summary agent!
