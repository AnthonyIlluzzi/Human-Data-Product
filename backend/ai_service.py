from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DB_PATH = BASE_DIR / "human_data_product.db"
AI_CONFIG_PATH = PROJECT_ROOT / "data" / "hdp_ai_inference_config.json"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini").strip()
PUBLIC_AI_ENABLED = os.getenv("PUBLIC_AI_ENABLED", "false").strip().lower() == "true"

MAX_INPUT_CHARS = 1000
MAX_OUTPUT_TOKENS = 500
MAX_CORE_RECORDS = 6
MAX_BEHAVIORAL_SIGNALS = 4
MAX_SIGNAL_EVIDENCE_LINKS = 2

MAX_DAILY_REQUESTS = 40
MAX_MONTHLY_REQUESTS = 1000


class AiLimitError(RuntimeError):
    pass


def get_connection() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise RuntimeError(f"Database not found at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def load_ai_config() -> dict[str, Any]:
    if not AI_CONFIG_PATH.exists():
        raise RuntimeError(f"AI config file not found at: {AI_CONFIG_PATH}")

    with AI_CONFIG_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def ensure_ai_usage_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ai_usage_counter (
            counter_key TEXT PRIMARY KEY,
            request_count INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    conn.commit()


def get_counter_key(period_type: str) -> str:
    now = datetime.utcnow()
    if period_type == "daily":
        return f"daily:{now.date().isoformat()}"
    if period_type == "monthly":
        return f"monthly:{now.strftime('%Y-%m')}"
    raise ValueError(f"Unsupported period type: {period_type}")


def get_usage_count(conn: sqlite3.Connection, counter_key: str) -> int:
    row = conn.execute(
        "SELECT request_count FROM ai_usage_counter WHERE counter_key = ?",
        (counter_key,),
    ).fetchone()
    return int(row["request_count"]) if row else 0


def increment_usage_count(conn: sqlite3.Connection, counter_key: str) -> None:
    conn.execute(
        """
        INSERT INTO ai_usage_counter (counter_key, request_count)
        VALUES (?, 1)
        ON CONFLICT(counter_key)
        DO UPDATE SET request_count = request_count + 1
        """,
        (counter_key,),
    )
    conn.commit()


def enforce_usage_limits(conn: sqlite3.Connection) -> None:
    ensure_ai_usage_table(conn)

    daily_key = get_counter_key("daily")
    monthly_key = get_counter_key("monthly")

    daily_count = get_usage_count(conn, daily_key)
    monthly_count = get_usage_count(conn, monthly_key)

    if daily_count >= MAX_DAILY_REQUESTS:
        raise AiLimitError("AI is temporarily unavailable today. Please try again later.")

    if monthly_count >= MAX_MONTHLY_REQUESTS:
        raise AiLimitError(
            "AI usage is temporarily unavailable right now. Please explore the Insights Workspace for deeper analysis."
        )


def register_successful_ai_call(conn: sqlite3.Connection) -> None:
    increment_usage_count(conn, get_counter_key("daily"))
    increment_usage_count(conn, get_counter_key("monthly"))


def classify_question(question: str) -> str:
    q = question.lower()

    if any(term in q for term in ["role", "fit", "best suited", "suited", "aligned", "alignment"]):
        return "role_fit"

    if any(term in q for term in ["strength", "strongest", "good at", "best at", "value"]):
        return "strengths"

    if any(term in q for term in ["work style", "workstyle", "communicate", "collaborate", "decision", "ambiguity", "conflict"]):
        return "work_style"

    if any(term in q for term in ["environment", "culture", "best work", "chaos", "political"]):
        return "environment_fit"

    if any(term in q for term in ["evolve", "evolution", "trajectory", "career path", "changed over time"]):
        return "career_evolution"

    if any(term in q for term in ["blind spot", "risk", "friction", "weakness", "overdo", "stress"]):
        return "blind_spots_or_risks"

    if any(term in q for term in ["evidence", "proof", "show me", "supporting"]):
        return "evidence_request"

    return "strengths"


def get_question_class_config(config: dict[str, Any], question_class: str) -> dict[str, Any]:
    for item in config.get("question_routing", {}).get("question_classes", []):
        if item.get("question_class") == question_class:
            return item
    raise RuntimeError(f"Question class not configured: {question_class}")


def search_core_evidence(conn: sqlite3.Connection, question: str, question_class: str, class_config: dict[str, Any]) -> list[dict[str, Any]]:
    q = f"%{question.lower()}%"
    results: list[dict[str, Any]] = []

    if question_class == "role_fit":
        rows = conn.execute(
            """
            SELECT 'role_preference' AS record_type,
                   value AS title,
                   dimension || ' / ' || category AS supporting_text
            FROM role_preference
            WHERE priority IN ('high', 'medium')
            ORDER BY CASE priority WHEN 'high' THEN 0 ELSE 1 END, preference_id
            LIMIT 3
            """
        ).fetchall()
        results.extend(rows_to_dicts(rows))

    project_rows = conn.execute(
        """
        SELECT 'project' AS record_type,
               name AS title,
               value AS supporting_text
        FROM project
        WHERE lower(name) LIKE ? OR lower(domain) LIKE ? OR lower(value) LIKE ?
        LIMIT 3
        """,
        (q, q, q),
    ).fetchall()
    results.extend(rows_to_dicts(project_rows))

    feedback_rows = conn.execute(
        """
        SELECT 'feedback' AS record_type,
               theme AS title,
               quote AS supporting_text
        FROM feedback
        WHERE lower(theme) LIKE ? OR lower(quote) LIKE ?
        ORDER BY year DESC, feedback_id DESC
        LIMIT 3
        """,
        (q, q),
    ).fetchall()
    results.extend(rows_to_dicts(feedback_rows))

    experience_rows = conn.execute(
        """
        SELECT 'experience' AS record_type,
               role AS title,
               impact AS supporting_text
        FROM experience
        WHERE lower(role) LIKE ? OR lower(domain) LIKE ? OR lower(focus_area) LIKE ? OR lower(impact) LIKE ?
        ORDER BY sort_order
        LIMIT 2
        """,
        (q, q, q, q),
    ).fetchall()
    results.extend(rows_to_dicts(experience_rows))

    if not results:
        fallback_rows = conn.execute(
            """
            SELECT 'project' AS record_type,
                   name AS title,
                   value AS supporting_text
            FROM project
            ORDER BY project_id DESC
            LIMIT 3
            """
        ).fetchall()
        results.extend(rows_to_dicts(fallback_rows))

    deduped: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for row in results:
        key = (row["record_type"], row["title"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)

    return deduped[:MAX_CORE_RECORDS]


def get_behavioral_signals(
    conn: sqlite3.Connection,
    class_config: dict[str, Any],
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    dimensions = class_config.get("behavioral_priority_dimensions", [])
    if not dimensions or "all_relevant" in dimensions:
        rows = conn.execute(
            """
            SELECT ds.signal_id,
                   ds.signal_key,
                   ds.signal_label,
                   ds.signal_value,
                   ds.confidence_score,
                   ds.summary_rationale,
                   d.dimension_key
            FROM derived_signal ds
            JOIN dimension d
              ON ds.dimension_id = d.dimension_id
            WHERE ds.confidence_score >= 0.6
            ORDER BY ds.confidence_score DESC, ds.signal_id ASC
            LIMIT ?
            """,
            (MAX_BEHAVIORAL_SIGNALS,),
        ).fetchall()
        return rows_to_dicts(rows)

    placeholders = ", ".join(["?"] * len(dimensions))
    rows = conn.execute(
        f"""
        SELECT ds.signal_id,
               ds.signal_key,
               ds.signal_label,
               ds.signal_value,
               ds.confidence_score,
               ds.summary_rationale,
               d.dimension_key
        FROM derived_signal ds
        JOIN dimension d
          ON ds.dimension_id = d.dimension_id
        WHERE d.dimension_key IN ({placeholders})
          AND ds.confidence_score >= 0.6
        ORDER BY ds.confidence_score DESC, ds.signal_id ASC
        LIMIT ?
        """,
        (*dimensions, MAX_BEHAVIORAL_SIGNALS),
    ).fetchall()
    return rows_to_dicts(rows)


def get_signal_evidence(conn: sqlite3.Connection, signal_ids: list[int]) -> list[dict[str, Any]]:
    if not signal_ids:
        return []

    placeholders = ", ".join(["?"] * len(signal_ids))
    rows = conn.execute(
        f"""
        SELECT sel.signal_id,
               sa.artifact_name,
               sel.evidence_excerpt,
               sel.evidence_weight
        FROM signal_evidence_link sel
        JOIN source_artifact sa
          ON sel.artifact_id = sa.artifact_id
        WHERE sel.signal_id IN ({placeholders})
        ORDER BY sel.evidence_weight DESC, sel.signal_evidence_id ASC
        """,
        signal_ids,
    ).fetchall()

    grouped: dict[int, list[dict[str, Any]]] = {}
    for row in rows_to_dicts(rows):
        grouped.setdefault(row["signal_id"], [])
        if len(grouped[row["signal_id"]]) < MAX_SIGNAL_EVIDENCE_LINKS:
            grouped[row["signal_id"]].append(row)

    flattened: list[dict[str, Any]] = []
    for signal_id in signal_ids:
        flattened.extend(grouped.get(signal_id, []))
    return flattened


def build_prompt(
    question: str,
    question_class: str,
    class_config: dict[str, Any],
    core_evidence: list[dict[str, Any]],
    behavioral_signals: list[dict[str, Any]],
    signal_evidence: list[dict[str, Any]],
) -> str:
    lines: list[str] = []
    lines.append("You are generating a grounded response for Anthony Illuzzi's Human Data Product.")
    lines.append("Respond in third person. Do not write as Anthony.")
    lines.append("Do not present assessment labels as definitive truth.")
    lines.append("Prefer concise, evidence-backed statements over personality language.")
    lines.append("If support is partial, say so explicitly.")
    lines.append("")
    lines.append(f"Question class: {question_class}")
    lines.append(f"Response goal: {class_config.get('response_goal', '')}")
    lines.append(f"User question: {question}")
    lines.append("")
    lines.append("Observed professional evidence:")
    for item in core_evidence:
        lines.append(f"- [{item['record_type']}] {item['title']}: {item['supporting_text']}")
    lines.append("")
    lines.append("Behavioral signals:")
    for item in behavioral_signals:
        lines.append(
            f"- [{item['dimension_key']}] {item['signal_label']} "
            f"(confidence {item['confidence_score']:.2f}): {item['summary_rationale']}"
        )
    lines.append("")
    lines.append("Behavioral evidence excerpts:")
    for item in signal_evidence:
        lines.append(
            f"- Signal {item['signal_id']} / {item['artifact_name']}: {item['evidence_excerpt']}"
        )
    lines.append("")
    lines.append("Write a concise response with these sections in plain text:")
    lines.append("1. Direct answer")
    lines.append("2. Why this appears true")
    lines.append("3. Supporting evidence")
    lines.append("4. Caution or limitation if needed")
    return "\n".join(lines)


def call_openai(prompt: str) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured on the backend.")

    payload = {
        "model": OPENAI_MODEL,
        "input": prompt,
        "max_output_tokens": MAX_OUTPUT_TOKENS,
    }

    req = urlrequest.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenAI request failed: {body or exc.reason}") from exc
    except URLError as exc:
        raise RuntimeError(f"OpenAI connection failed: {exc.reason}") from exc

    if isinstance(data.get("output_text"), str) and data["output_text"].strip():
        return data["output_text"].strip()

    try:
        output = data.get("output", [])
        texts: list[str] = []
        for item in output:
            for content in item.get("content", []):
                if content.get("type") == "output_text" and content.get("text"):
                    texts.append(content["text"])
        if texts:
            return "\n".join(texts).strip()
    except Exception:
        pass

    raise RuntimeError("OpenAI returned no usable response text.")


def chat_with_hdp_ai(question: str) -> dict[str, Any]:
    cleaned_question = (question or "").strip()

    if not cleaned_question:
        raise ValueError("Question is required.")

    if len(cleaned_question) > MAX_INPUT_CHARS:
        raise ValueError(f"Question is too long. Limit is {MAX_INPUT_CHARS} characters.")

    config = load_ai_config()
    question_class = classify_question(cleaned_question)
    class_config = get_question_class_config(config, question_class)

    with get_connection() as conn:
        enforce_usage_limits(conn)

        core_evidence = search_core_evidence(conn, cleaned_question, question_class, class_config)
        behavioral_signals = get_behavioral_signals(conn, class_config, config)
        signal_ids = [row["signal_id"] for row in behavioral_signals]
        signal_evidence = get_signal_evidence(conn, signal_ids)

        prompt = build_prompt(
            question=cleaned_question,
            question_class=question_class,
            class_config=class_config,
            core_evidence=core_evidence,
            behavioral_signals=behavioral_signals,
            signal_evidence=signal_evidence,
        )

        answer = call_openai(prompt)
        register_successful_ai_call(conn)

    return {
        "question": cleaned_question,
        "question_class": question_class,
        "answer": answer,
        "core_evidence": core_evidence,
        "behavioral_signals": behavioral_signals,
    }
