from pathlib import Path
from collections import Counter, defaultdict
import sqlite3
import re


DB_PATH = Path(__file__).resolve().parent / "human_data_product.db"


def get_connection():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows_to_dicts(rows):
    return [dict(row) for row in rows]


def execute_readonly_query(sql: str):
    if not sql or not sql.strip():
        raise ValueError("SQL query is required.")

    normalized = sql.strip()
    normalized_no_semicolon = normalized.rstrip(";").strip()
    lowered = normalized_no_semicolon.lower()

    if not (lowered.startswith("select") or lowered.startswith("with")):
        raise ValueError("Only SELECT / WITH read-only queries are allowed.")

    forbidden_terms = [
        "insert ",
        "update ",
        "delete ",
        "drop ",
        "alter ",
        "create ",
        "replace ",
        "attach ",
        "detach ",
        "pragma ",
    ]

    if any(term in lowered for term in forbidden_terms):
        raise ValueError("Only read-only SQL is allowed.")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(normalized_no_semicolon)
        rows = cursor.fetchall()

        if cursor.description is None:
          raise ValueError("Query did not return tabular results.")

        columns = [desc[0] for desc in cursor.description]
        values = [[row[col] for col in columns] for row in rows]

    return {
        "columns": columns,
        "rows": values,
        "row_count": len(values)
    }

def get_health():
    return {
        "status": "ok",
        "service": "human-data-product-api"
    }


def get_product_metadata():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT meta_key, meta_value
            FROM product_metadata
            ORDER BY meta_key
        """)
        return rows_to_dicts(cursor.fetchall())


def get_contact_info():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT contact_id, category, value, is_public
            FROM contact_info
            WHERE is_public = 1
            ORDER BY contact_id
        """)
        return rows_to_dicts(cursor.fetchall())


def get_summary():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT meta_value
            FROM product_metadata
            WHERE meta_key = 'owner'
        """)
        owner_row = cursor.fetchone()
        owner = owner_row["meta_value"] if owner_row else "Unknown"

        cursor.execute("""
            SELECT company, role, start_date
            FROM experience
            WHERE end_date IS NULL
            ORDER BY
                CASE WHEN company = 'SAP' THEN 0 ELSE 1 END,
                start_date DESC
            LIMIT 1
        """)
        current_role = cursor.fetchone()

        cursor.execute("SELECT COUNT(*) AS count FROM experience")
        experience_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) AS count FROM project")
        project_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) AS count FROM skill")
        skill_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) AS count FROM system_improvement")
        system_improvement_count = cursor.fetchone()["count"]

        cursor.execute("""
            SELECT category, COUNT(*) AS skill_total
            FROM skill
            GROUP BY category
            ORDER BY skill_total DESC, category
        """)
        skill_categories = rows_to_dicts(cursor.fetchall())

    return {
        "owner": owner,
        "current_role": dict(current_role) if current_role else None,
        "experience_count": experience_count,
        "project_count": project_count,
        "skill_count": skill_count,
        "system_improvement_count": system_improvement_count,
        "skill_categories": skill_categories
    }

def get_identity():
    return {
        "specialization": "Enterprise Data Platforms & Analytics Enablement",
        "core_focus_areas": [
            "Data Platform Architecture",
            "Analytics Enablement",
            "Self-Service Analytics",
            "Data Product Thinking",
            "Metadata Modeling",
            "Data Governance",
            "Platform Adoption",
            "Value Realization"
        ],
        "architectural_pattern": (
            "Transform fragmented operational data into structured, trusted data products "
            "that enable scalable insight, decision intelligence, and enterprise adoption."
        ),
        "primary_strength": (
            "Bridging technical architecture, analytics intelligence, and organizational "
            "platform adoption to maximize value from enterprise data ecosystems."
        )
    }


def get_experiences():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT experience_id, company, role, start_date, end_date, domain, focus_area, impact, sort_order
            FROM experience
            ORDER BY sort_order ASC
        """)
        return rows_to_dicts(cursor.fetchall())


def get_projects():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT project_id, experience_id, name, domain, value, link
            FROM project
            ORDER BY project_id ASC
        """)
        return rows_to_dicts(cursor.fetchall())

def get_system_improvements(
    system_layer: str | None = None,
    problem_type: str | None = None,
    solution_type: str | None = None,
    impact_type: str | None = None,
    experience_id: int | None = None,
    project_id: int | None = None,
):
    with get_connection() as conn:
        cursor = conn.cursor()

        sql = """
            SELECT
                improvement_id,
                experience_id,
                project_id,
                system_layer,
                description,
                problem_type,
                solution_type,
                impact_type,
                delivered_date,
                sort_order
            FROM system_improvement
            WHERE 1 = 1
        """
        params = []

        if system_layer:
            sql += " AND system_layer = ?"
            params.append(system_layer)

        if problem_type:
            sql += " AND problem_type = ?"
            params.append(problem_type)

        if solution_type:
            sql += " AND solution_type = ?"
            params.append(solution_type)

        if impact_type:
            sql += " AND impact_type = ?"
            params.append(impact_type)

        if experience_id is not None:
            sql += " AND experience_id = ?"
            params.append(experience_id)

        if project_id is not None:
            sql += " AND project_id = ?"
            params.append(project_id)

        sql += """
            ORDER BY
                delivered_date DESC,
                sort_order ASC,
                improvement_id ASC
        """

        cursor.execute(sql, params)
        return rows_to_dicts(cursor.fetchall())

def get_system_improvement_detail(improvement_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                improvement_id,
                experience_id,
                project_id,
                system_layer,
                description,
                problem_type,
                solution_type,
                impact_type,
                delivered_date,
                sort_order
            FROM system_improvement
            WHERE improvement_id = ?
        """, (improvement_id,))
        row = cursor.fetchone()

    return dict(row) if row else None


def get_project_detail(project_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT project_id, experience_id, name, domain, value, link
            FROM project
            WHERE project_id = ?
        """, (project_id,))
        project = cursor.fetchone()

        if not project:
            return None

        cursor.execute("""
            SELECT s.skill_id, s.skill_name, s.category, s.level
            FROM skill s
            JOIN project_skill ps
              ON s.skill_id = ps.skill_id
            WHERE ps.project_id = ?
            ORDER BY s.skill_name
        """, (project_id,))
        associated_skills = rows_to_dicts(cursor.fetchall())

        cursor.execute("""
            SELECT
                improvement_id,
                experience_id,
                project_id,
                system_layer,
                description,
                problem_type,
                solution_type,
                impact_type,
                delivered_date,
                sort_order
            FROM system_improvement
            WHERE project_id = ?
            ORDER BY delivered_date DESC, sort_order ASC, improvement_id ASC
        """, (project_id,))
        related_system_improvements = rows_to_dicts(cursor.fetchall())

    return {
        "project": dict(project),
        "associated_skills": associated_skills,
        "related_system_improvements": related_system_improvements,
    }


def get_skills(category: str | None = None):
    with get_connection() as conn:
        cursor = conn.cursor()

        if category:
            cursor.execute("""
                SELECT skill_id, category, skill_name, level
                FROM skill
                WHERE category = ?
                ORDER BY skill_name
            """, (category,))
        else:
            cursor.execute("""
                SELECT skill_id, category, skill_name, level
                FROM skill
                ORDER BY category, skill_name
            """)

        return rows_to_dicts(cursor.fetchall())


def search_projects(query: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT project_id, experience_id, name, domain, value, link
            FROM project
            WHERE name LIKE ? OR domain LIKE ? OR value LIKE ?
            ORDER BY project_id
        """, (f"%{query}%", f"%{query}%", f"%{query}%"))

        return {
            "query": query,
            "results": rows_to_dicts(cursor.fetchall())
        }


def get_role_preferences(
    dimension: str | None = None,
    category: str | None = None,
    priority: str | None = None
):
    with get_connection() as conn:
        cursor = conn.cursor()

        sql = """
            SELECT preference_id, dimension, category, value, priority
            FROM role_preference
            WHERE 1 = 1
        """
        params = []

        if dimension:
            sql += " AND dimension = ?"
            params.append(dimension)

        if category:
            sql += " AND category = ?"
            params.append(category)

        if priority:
            sql += " AND priority = ?"
            params.append(priority)

        sql += """
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END,
                dimension,
                category,
                value
        """

        cursor.execute(sql, params)
        return rows_to_dicts(cursor.fetchall())


def get_target_opportunity():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT value
            FROM role_preference
            WHERE category = 'role_type'
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END,
                preference_id
        """)
        role_types = [row["value"] for row in cursor.fetchall()]

        cursor.execute("""
            SELECT value
            FROM role_preference
            WHERE category = 'career_level'
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END,
                preference_id
        """)
        career_levels = [row["value"] for row in cursor.fetchall()]

        cursor.execute("""
            SELECT value
            FROM role_preference
            WHERE category = 'work_mode'
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END,
                preference_id
        """)
        work_modes = [row["value"] for row in cursor.fetchall()]

        cursor.execute("""
            SELECT value
            FROM role_preference
            WHERE category IN ('domain', 'platform_focus', 'impact_focus', 'problem_space')
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END,
                preference_id
        """)
        focus_areas = [row["value"] for row in cursor.fetchall()]

        cursor.execute("""
            SELECT value
            FROM role_preference
            WHERE category = 'preferred_onsite_location'
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END,
                preference_id
        """)
        preferred_locations = [row["value"] for row in cursor.fetchall()]

        cursor.execute("""
            SELECT value
            FROM role_preference
            WHERE category = 'travel_percent_max'
            ORDER BY preference_id
            LIMIT 1
        """)
        travel_max_row = cursor.fetchone()

        cursor.execute("""
            SELECT value
            FROM role_preference
            WHERE category = 'people_leadership'
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END,
                preference_id
        """)
        leadership_preference = [row["value"] for row in cursor.fetchall()]

    return {
        "target_role_types": role_types,
        "target_career_levels": career_levels,
        "preferred_work_modes": work_modes,
        "focus_areas": focus_areas,
        "preferred_locations": preferred_locations,
        "travel_max": travel_max_row["value"] if travel_max_row else None,
        "leadership_preference": leadership_preference,
        "summary": (
            "Targeting senior architecture-oriented roles focused on enterprise data platforms, "
            "analytics enablement, and data product strategy, with strong preference for remote "
            "or hybrid work, strategic IC scope, and low-travel environments."
        )
    }


def get_career_timeline():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT experience_id, company, role, start_date, end_date, sort_order
            FROM experience
            ORDER BY sort_order ASC
        """)
        return rows_to_dicts(cursor.fetchall())


def get_skill_utilization():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                s.skill_id,
                s.skill_name,
                s.category,
                s.level,
                COUNT(ps.project_id) AS project_count
            FROM skill s
            LEFT JOIN project_skill ps
                ON s.skill_id = ps.skill_id
            GROUP BY s.skill_id, s.skill_name, s.category, s.level
            ORDER BY project_count DESC, s.skill_name ASC
        """)
        return rows_to_dicts(cursor.fetchall())

def get_skill_cooccurrence(limit: int = 6):
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT
                s.skill_id,
                s.skill_name,
                s.category,
                s.level,
                COUNT(ps.project_id) AS project_count
            FROM skill s
            JOIN project_skill ps
              ON s.skill_id = ps.skill_id
            GROUP BY s.skill_id, s.skill_name, s.category, s.level
            ORDER BY project_count DESC, s.skill_name ASC
            LIMIT ?
            """,
            (limit,),
        )
        skills = rows_to_dicts(cursor.fetchall())

        skill_ids = [row["skill_id"] for row in skills]
        if not skill_ids:
            return {"skills": [], "pairs": []}

        placeholders = ", ".join("?" for _ in skill_ids)

        cursor.execute(
            f"""
            SELECT
                ps1.skill_id AS skill_a_id,
                ps2.skill_id AS skill_b_id,
                COUNT(DISTINCT ps1.project_id) AS pair_count
            FROM project_skill ps1
            JOIN project_skill ps2
              ON ps1.project_id = ps2.project_id
             AND ps1.skill_id < ps2.skill_id
            WHERE ps1.skill_id IN ({placeholders})
              AND ps2.skill_id IN ({placeholders})
            GROUP BY ps1.skill_id, ps2.skill_id
            ORDER BY pair_count DESC, ps1.skill_id ASC, ps2.skill_id ASC
            """,
            (*skill_ids, *skill_ids),
        )
        pairs = rows_to_dicts(cursor.fetchall())

    return {
        "skills": skills,
        "pairs": pairs,
    }

def get_skill_projects(skill_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT skill_id, skill_name, category, level
            FROM skill
            WHERE skill_id = ?
        """, (skill_id,))
        skill = cursor.fetchone()

        cursor.execute("""
            SELECT p.project_id, p.name, p.domain, p.value
            FROM project p
            JOIN project_skill ps
              ON p.project_id = ps.project_id
            WHERE ps.skill_id = ?
            ORDER BY p.project_id
        """, (skill_id,))
        projects = rows_to_dicts(cursor.fetchall())

    return {
        "skill": dict(skill) if skill else None,
        "projects": projects
    }


def _get_grouped_system_improvement_counts(group_field: str):
    allowed_fields = {
        "system_layer",
        "problem_type",
        "solution_type",
        "impact_type",
    }
    if group_field not in allowed_fields:
        raise ValueError(f"Unsupported system improvement grouping: {group_field}")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            SELECT
                {group_field} AS category,
                COUNT(*) AS improvement_count
            FROM system_improvement
            GROUP BY {group_field}
            ORDER BY improvement_count DESC, category ASC
            """
        )
        return rows_to_dicts(cursor.fetchall())


def get_system_improvements_by_layer():
    return _get_grouped_system_improvement_counts("system_layer")


def get_system_improvements_by_problem():
    return _get_grouped_system_improvement_counts("problem_type")


def get_system_improvements_by_solution():
    return _get_grouped_system_improvement_counts("solution_type")


def get_system_improvements_by_impact():
    return _get_grouped_system_improvement_counts("impact_type")


def get_system_improvements_timeline():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                substr(delivered_date, 1, 7) AS year_month,
                COUNT(*) AS improvement_count
            FROM system_improvement
            GROUP BY substr(delivered_date, 1, 7)
            ORDER BY year_month ASC
        """)
        return rows_to_dicts(cursor.fetchall())


def get_project_system_improvements(project_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT project_id, experience_id, name, domain, value, link
            FROM project
            WHERE project_id = ?
        """, (project_id,))
        project = cursor.fetchone()

        cursor.execute("""
            SELECT
                improvement_id,
                experience_id,
                project_id,
                system_layer,
                description,
                problem_type,
                solution_type,
                impact_type,
                delivered_date,
                sort_order
            FROM system_improvement
            WHERE project_id = ?
            ORDER BY delivered_date DESC, sort_order ASC, improvement_id ASC
        """, (project_id,))
        improvements = rows_to_dicts(cursor.fetchall())

    return {
        "project": dict(project) if project else None,
        "system_improvements": improvements,
    }


def get_experience_system_improvements(experience_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT experience_id, company, role
            FROM experience
            WHERE experience_id = ?
        """, (experience_id,))
        experience = cursor.fetchone()

        cursor.execute("""
            SELECT
                improvement_id,
                experience_id,
                project_id,
                system_layer,
                description,
                problem_type,
                solution_type,
                impact_type,
                delivered_date,
                sort_order
            FROM system_improvement
            WHERE experience_id = ?
            ORDER BY delivered_date DESC, sort_order ASC, improvement_id ASC
        """, (experience_id,))
        improvements = rows_to_dicts(cursor.fetchall())

    return {
        "experience": dict(experience) if experience else None,
        "system_improvements": improvements,
    }


def get_feedback_themes(
    source_type: str | None = None,
    entity_type: str | None = None
):
    with get_connection() as conn:
        cursor = conn.cursor()

        sql = """
            SELECT
                theme,
                COUNT(*) AS feedback_count
            FROM feedback
            WHERE 1 = 1
        """
        params = []

        if source_type:
            sql += " AND source_type = ?"
            params.append(source_type)

        if entity_type:
            sql += " AND entity_type = ?"
            params.append(entity_type)

        sql += """
            GROUP BY theme
            ORDER BY feedback_count DESC, theme ASC
        """

        cursor.execute(sql, params)
        return rows_to_dicts(cursor.fetchall())


def get_feedback_theme_details(theme: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                feedback_id,
                entity_type,
                entity_id,
                source_type,
                quote,
                theme,
                year,
                viz_display_flag,
                viz_display_rank
            FROM feedback
            WHERE theme = ?
            ORDER BY
                COALESCE(viz_display_flag, 0) DESC,
                CASE
                    WHEN COALESCE(viz_display_flag, 0) = 1 THEN COALESCE(viz_display_rank, 999)
                    ELSE 999
                END ASC,
                year DESC,
                feedback_id DESC
        """, (theme,))
        entries = rows_to_dicts(cursor.fetchall())

    return {
        "theme": theme,
        "entries": entries
    }


def get_projects_by_domain():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                domain,
                COUNT(*) AS project_count
            FROM project
            GROUP BY domain
            ORDER BY project_count DESC, domain ASC
        """)
        return rows_to_dicts(cursor.fetchall())


def get_projects_by_experience():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                e.experience_id,
                e.company,
                e.role,
                COUNT(p.project_id) AS project_count
            FROM experience e
            LEFT JOIN project p
                ON e.experience_id = p.experience_id
            GROUP BY e.experience_id, e.company, e.role, e.sort_order
            ORDER BY e.sort_order ASC
        """)
        return rows_to_dicts(cursor.fetchall())


def get_experience_projects(experience_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT experience_id, company, role
            FROM experience
            WHERE experience_id = ?
        """, (experience_id,))
        experience = cursor.fetchone()

        cursor.execute("""
            SELECT project_id, name, domain, value, link
            FROM project
            WHERE experience_id = ?
            ORDER BY project_id
        """, (experience_id,))
        projects = rows_to_dicts(cursor.fetchall())

    return {
        "experience": dict(experience) if experience else None,
        "projects": projects
    }


DISPLAY_LABELS = {
    "solution_type": {
        "capability_expansion": "Capability Expansion",
        "metadata_standardization": "Metadata Standardization",
        "workflow_optimization": "Workflow Optimization",
        "experience_enhancement": "Experience Enhancement",
        "access_extension": "Access Extension",
        "analytical_refinement": "Analytical Refinement",
        "data_modeling": "Data Modeling",
        "workflow_automation": "Workflow Automation",
    },
    "problem_type": {
        "capability_gap": "Capability Gap",
        "metadata_gap": "Metadata Gap",
        "workflow_gap": "Workflow Gap",
        "clarity_gap": "Clarity Gap",
        "visibility_gap": "Visibility Gap",
        "decision_support_gap": "Decision Support Gap",
        "data_gap": "Data Gap",
    },
    "system_layer": {
        "integration": "Integration",
        "governance": "Governance",
        "UI": "UI",
        "workflow": "Workflow",
        "data": "Data",
    },
    "impact_type": {
        "reliability": "Reliability",
        "usability": "Usability",
        "self_service": "Self-Service",
        "governance": "Governance",
        "decision_support": "Decision Support",
        "scalability": "Scalability",
        "interoperability": "Interoperability",
        "interpretability": "Interpretability",
    },
    "priority": {
        "high": 3,
        "medium": 2,
        "low": 1,
    },
}


def _display_label(group: str, value: str | None) -> str:
    if value is None:
        return "Unknown"
    mapped = DISPLAY_LABELS.get(group, {}).get(value)
    if mapped:
        return mapped
    return str(value).replace("_", " ").title()


def _priority_weight(priority: str | None) -> int:
    return DISPLAY_LABELS["priority"].get((priority or "").lower(), 1)


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")


def _build_distribution_view(rows, dimension: str):
    total = sum(row["count"] for row in rows) or 1
    segments = []
    for row in rows:
        segments.append({
            "key": row["key"],
            "label": _display_label(dimension, row["key"]),
            "count": row["count"],
            "share": round((row["count"] / total) * 100, 1),
        })

    if not segments:
        return {
            "dimension": dimension,
            "title": "No distribution available",
            "total_records": 0,
            "segments": [],
            "observed_title": "No distribution available",
            "observed_copy": [
                "No records are currently available for this distribution view."
            ],
            "derivation": "This view requires structured system improvement records for the selected dimension.",
        }

    top_labels = [segment["label"] for segment in segments[:2]]

    if dimension == "solution_type":
        observed = [
            f"Work is concentrated in {top_labels[0]} and {top_labels[1]}." if len(top_labels) > 1 else "Work is concentrated in one dominant approach.",
            "The distribution skews toward scalable enablement and structural system improvements rather than isolated feature work."
        ]
        derivation = "Based on factual system improvement records grouped by solution_type and shown as share of total records."
        title = "Approach distribution"
    elif dimension == "problem_type":
        observed = [
            f"Most work addresses {top_labels[0]} and {top_labels[1]}." if len(top_labels) > 1 else "Most work concentrates on one recurring problem type.",
            "The system layer is primarily used to reduce friction, ambiguity, and structural gaps."
        ]
        derivation = "Based on factual system improvement records grouped by problem_type and shown as share of total records."
        title = "Problem distribution"
    else:
        observed = [
            f"Work is concentrated at the {top_labels[0]} and {top_labels[1]} layers." if len(top_labels) > 1 else "Work is concentrated in one dominant system layer.",
            "The pattern suggests value creation is occurring at the level of systems and structural design, not just point execution."
        ]
        derivation = "Based on factual system improvement records grouped by system_layer and shown as share of total records."
        title = "System layer distribution"

    return {
        "dimension": dimension,
        "title": title,
        "total_records": total,
        "segments": segments,
        "observed_title": title,
        "observed_copy": observed,
        "derivation": derivation,
    }


def _infer_project_solution(project):
    text = " ".join([
        project.get("name", "") or "",
        project.get("domain", "") or "",
        project.get("value", "") or "",
    ]).lower()

    rules = [
        ("metadata_standardization", r"metadata|governance|taxonomy|semantic|standard"),
        ("workflow_automation", r"automation"),
        ("workflow_optimization", r"workflow|process|delivery|defect|readiness|operational"),
        ("experience_enhancement", r"experience|ui|dashboard|reporting|analytics|visibility|insight"),
        ("capability_expansion", r"self-service|integration|capability|enablement|access|extension|object"),
        ("analytical_refinement", r"analysis|analytical|usage"),
        ("data_modeling", r"data model|modeling|model"),
    ]

    for solution_type, pattern in rules:
        if re.search(pattern, text):
            return solution_type
    return None


def _infer_project_impact(project):
    text = " ".join([
        project.get("name", "") or "",
        project.get("domain", "") or "",
        project.get("value", "") or "",
    ]).lower()

    rules = [
        ("self_service", r"self-service|independ|configure|enablement"),
        ("usability", r"usability|experience|ease|adoption|clear|simpl"),
        ("governance", r"governance|metadata|traceability|standard"),
        ("decision_support", r"decision|reporting|analytics|insight|business case"),
        ("reliability", r"reliability|quality|defect|readiness|stability|consisten"),
        ("scalability", r"scale|scalable|scalability"),
        ("interoperability", r"interoperability|integration"),
        ("interpretability", r"interpretability|semantic"),
    ]

    for impact_type, pattern in rules:
        if re.search(pattern, text):
            return impact_type
    return None


def _build_value_delivery_payload(conn, top_approaches):
    cursor = conn.cursor()
    payload = []
    insight_list = []

    for index, approach in enumerate(top_approaches, start=1):
        cursor.execute(
            """
            SELECT
                s.skill_name,
                COUNT(*) AS score
            FROM system_improvement si
            JOIN project_skill ps
              ON si.project_id = ps.project_id
            JOIN skill s
              ON s.skill_id = ps.skill_id
            WHERE si.solution_type = ?
            GROUP BY s.skill_id, s.skill_name
            ORDER BY score DESC, s.skill_name ASC
            LIMIT 3
            """,
            (approach["key"],),
        )
        skill_rows = rows_to_dicts(cursor.fetchall())
        max_score = max((row["score"] for row in skill_rows), default=1)

        cursor.execute(
            """
            SELECT DISTINCT project_id
            FROM system_improvement
            WHERE solution_type = ?
              AND project_id IS NOT NULL
            """,
            (approach["key"],),
        )
        project_ids = [row["project_id"] for row in cursor.fetchall()]

        cursor.execute(
            """
            SELECT DISTINCT experience_id
            FROM system_improvement
            WHERE solution_type = ?
              AND experience_id IS NOT NULL
            """,
            (approach["key"],),
        )
        experience_ids = [row["experience_id"] for row in cursor.fetchall()]

                feedback_entries = []
                if project_ids or experience_ids:
                    def ranked_feedback_query(entity_type, ids):
                        if not ids:
                            return []
        
                        placeholders = ", ".join("?" for _ in ids)
                        cursor.execute(
                            f"""
                            SELECT
                                feedback_id,
                                source_type,
                                quote,
                                theme,
                                year,
                                viz_display_flag,
                                viz_display_rank,
                                entity_type,
                                entity_id
                            FROM feedback
                            WHERE entity_type = ?
                              AND entity_id IN ({placeholders})
                            ORDER BY
                                COALESCE(viz_display_flag, 0) DESC,
                                CASE
                                    WHEN COALESCE(viz_display_flag, 0) = 1 THEN COALESCE(viz_display_rank, 999)
                                    ELSE 999
                                END ASC,
                                year DESC,
                                feedback_id DESC
                            """,
                            [entity_type, *ids],
                        )
                        return rows_to_dicts(cursor.fetchall())
        
                    project_feedback = ranked_feedback_query("project", project_ids)
                    experience_feedback = ranked_feedback_query("experience", experience_ids)
        
                    seen_feedback_ids = set()
                    seen_quotes = set()
        
                    def append_unique(entries, limit=4):
                        for entry in entries:
                            feedback_id = entry.get("feedback_id")
                            quote_key = (entry.get("quote") or "").strip().lower()
        
                            if feedback_id in seen_feedback_ids:
                                continue
                            if quote_key and quote_key in seen_quotes:
                                continue
        
                            feedback_entries.append(entry)
                            seen_feedback_ids.add(feedback_id)
                            if quote_key:
                                seen_quotes.add(quote_key)
        
                            if len(feedback_entries) >= limit:
                                break
        
                    # Prioritize narrower, project-linked evidence first.
                    append_unique(project_feedback, limit=4)
        
                    # Top up with broader experience feedback only if needed.
                    if len(feedback_entries) < 4:
                        append_unique(experience_feedback, limit=4)
        
                    feedback_entries = feedback_entries[:4]

        display_skills = [{
            "skill_name": row["skill_name"],
            "score": row["score"],
            "normalized": round((row["score"] / max_score) * 100, 1),
        } for row in skill_rows]

        top_skill_names = [row["skill_name"] for row in skill_rows[:2]]
        if len(top_skill_names) >= 2:
            insight_copy = f"{top_skill_names[0]} and {top_skill_names[1]} most often support this approach."
        elif top_skill_names:
            insight_copy = f"{top_skill_names[0]} is the strongest capability signal behind this approach."
        else:
            insight_copy = "Capability composition is not available for this approach."

        payload.append({
            "index": index,
            "key": approach["key"],
            "label": approach["label"],
            "count": approach["count"],
            "skills": display_skills,
            "feedback_examples": feedback_entries,
            "feedback_modal_title": f"{approach['label']} — Feedback Evidence",
            "feedback_link_label": "How does this show up in feedback?",
        })

        insight_list.append({
            "index": index,
            "key": approach["key"],
            "statement": insight_copy,
        })

    return {
        "approaches": payload,
        "insights": insight_list,
        "derivation": "Capability bars are based on skills linked to projects associated with each approach. Feedback evidence is curated from related project and experience feedback records.",
    }


def _build_value_realization_payload(conn, top_approaches):
    cursor = conn.cursor()
    approach_keys = [item["key"] for item in top_approaches]

    cursor.execute(
        """
        SELECT
            impact_type,
            COUNT(*) AS count
        FROM system_improvement
        GROUP BY impact_type
        ORDER BY count DESC, impact_type ASC
        """
    )
    impact_rows = rows_to_dicts(cursor.fetchall())
    impact_keys = [row["impact_type"] for row in impact_rows]

    factual_counts = defaultdict(int)
    cursor.execute(
        """
        SELECT
            solution_type,
            impact_type,
            COUNT(*) AS count
        FROM system_improvement
        GROUP BY solution_type, impact_type
        """
    )
    for row in rows_to_dicts(cursor.fetchall()):
        factual_counts[(row["solution_type"], row["impact_type"])] = row["count"]

    project_inferred = defaultdict(float)
    cursor.execute(
        """
        SELECT project_id, experience_id, name, domain, value, link
        FROM project
        ORDER BY project_id ASC
        """
    )
    all_projects = rows_to_dicts(cursor.fetchall())

    for project in all_projects:
        inferred_solution = _infer_project_solution(project)
        inferred_impact = _infer_project_impact(project)
        if inferred_solution in approach_keys and inferred_impact in impact_keys:
            project_inferred[(inferred_solution, inferred_impact)] += 0.5

    experience_primary_solution = {}
    experience_primary_impact = {}
    cursor.execute(
        """
        SELECT
            experience_id,
            solution_type,
            impact_type,
            COUNT(*) AS count
        FROM system_improvement
        GROUP BY experience_id, solution_type, impact_type
        ORDER BY experience_id ASC, count DESC, solution_type ASC
        """
    )
    for row in rows_to_dicts(cursor.fetchall()):
        experience_primary_solution.setdefault(row["experience_id"], row["solution_type"])
        experience_primary_impact.setdefault(row["experience_id"], row["impact_type"])

    project_primary_solution = {}
    project_primary_impact = {}
    cursor.execute(
        """
        SELECT
            project_id,
            solution_type,
            impact_type,
            COUNT(*) AS count
        FROM system_improvement
        GROUP BY project_id, solution_type, impact_type
        ORDER BY project_id ASC, count DESC, solution_type ASC
        """
    )
    for row in rows_to_dicts(cursor.fetchall()):
        project_primary_solution.setdefault(row["project_id"], row["solution_type"])
        project_primary_impact.setdefault(row["project_id"], row["impact_type"])

    feedback_inferred = defaultdict(float)
    cursor.execute(
        """
        SELECT entity_type, entity_id
        FROM feedback
        """
    )
    for row in rows_to_dicts(cursor.fetchall()):
        solution = None
        impact = None

        if row["entity_type"] == "project":
            solution = project_primary_solution.get(row["entity_id"])
            impact = project_primary_impact.get(row["entity_id"])
        elif row["entity_type"] == "experience":
            solution = experience_primary_solution.get(row["entity_id"])
            impact = experience_primary_impact.get(row["entity_id"])

        if solution in approach_keys and impact in impact_keys:
            feedback_inferred[(solution, impact)] += 0.25

    cells = []
    max_score = 0.0
    for approach in approach_keys:
        for impact in impact_keys:
            score = (
                factual_counts[(approach, impact)] * 1.0
                + project_inferred[(approach, impact)]
                + feedback_inferred[(approach, impact)]
            )
            max_score = max(max_score, score)
            cells.append({
                "approach_key": approach,
                "impact_key": impact,
                "factual_count": factual_counts[(approach, impact)],
                "project_inferred": round(project_inferred[(approach, impact)], 2),
                "feedback_inferred": round(feedback_inferred[(approach, impact)], 2),
                "score": round(score, 2),
            })

    matrix_rows = []
    for approach in top_approaches:
        row_cells = [cell for cell in cells if cell["approach_key"] == approach["key"]]
        strongest = sorted(row_cells, key=lambda item: item["score"], reverse=True)[:2]
        strongest_labels = [_display_label("impact_type", item["impact_key"]) for item in strongest if item["score"] > 0]
        if len(strongest_labels) >= 2:
            row_observation = f"{approach['label']} most often realizes value through {strongest_labels[0]} and {strongest_labels[1]}."
        elif strongest_labels:
            row_observation = f"{approach['label']} most often realizes value through {strongest_labels[0]}."
        else:
            row_observation = f"{approach['label']} does not yet show a strong outcome pattern."

        matrix_rows.append({
            "key": approach["key"],
            "label": approach["label"],
            "observation": row_observation,
        })

    row_strength = []
    for approach in top_approaches:
        total_score = sum(
            cell["score"]
            for cell in cells
            if cell["approach_key"] == approach["key"]
        )
        row_strength.append((approach["key"], total_score))

    strongest_key = max(row_strength, key=lambda item: item[1])[0] if row_strength else None
    strongest_row = next(
        (row for row in matrix_rows if row["key"] == strongest_key),
        {"label": "This approach", "observation": "Outcome relationships are not available."}
    )

    return {
        "approach_labels": [{"key": item["key"], "label": item["label"]} for item in top_approaches],
        "impact_labels": [{"key": key, "label": _display_label("impact_type", key)} for key in impact_keys],
        "cells": cells,
        "max_score": round(max_score or 1, 2),
        "observed_title": strongest_row["label"],
        "observed_copy": [
            strongest_row["observation"],
            "Weighted reinforcement from projects and feedback strengthens pattern confidence, but factual system-improvement records remain the dominant signal."
        ],
        "derivation": "This view is anchored in factual system improvement records. Additional project and feedback signals are normalized to the same approach and impact categories and contribute lower weight than factual records.",
    }


def get_value_insights_dashboard():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT solution_type AS key, COUNT(*) AS count
            FROM system_improvement
            GROUP BY solution_type
            ORDER BY count DESC, solution_type ASC
            """
        )
        solution_rows = rows_to_dicts(cursor.fetchall())

        cursor.execute(
            """
            SELECT problem_type AS key, COUNT(*) AS count
            FROM system_improvement
            GROUP BY problem_type
            ORDER BY count DESC, problem_type ASC
            """
        )
        problem_rows = rows_to_dicts(cursor.fetchall())

        cursor.execute(
            """
            SELECT system_layer AS key, COUNT(*) AS count
            FROM system_improvement
            GROUP BY system_layer
            ORDER BY count DESC, system_layer ASC
            """
        )
        layer_rows = rows_to_dicts(cursor.fetchall())

        top_approaches = [{
            "key": row["key"],
            "label": _display_label("solution_type", row["key"]),
            "count": row["count"],
        } for row in solution_rows[:4]]

        return {
            "distribution_views": {
                "solution_type": _build_distribution_view(solution_rows, "solution_type"),
                "problem_type": _build_distribution_view(problem_rows, "problem_type"),
                "system_layer": _build_distribution_view(layer_rows, "system_layer"),
            },
            "value_delivery": _build_value_delivery_payload(conn, top_approaches),
            "value_realization": _build_value_realization_payload(conn, top_approaches),
        }


def get_opportunity_insights_dashboard():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT experience_id, company, role, start_date, end_date, sort_order
            FROM experience
            ORDER BY sort_order ASC
            """
        )
        timeline = rows_to_dicts(cursor.fetchall())

        cursor.execute(
            """
            SELECT
                preference_id,
                dimension,
                category,
                value,
                priority,
                COALESCE(dimension_weight, 1.0) AS dimension_weight,
                COALESCE(value_weight, 1.0) AS value_weight
            FROM role_preference
            ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                    ELSE 4
                END,
                category,
                preference_id
            """
        )
        preferences = rows_to_dicts(cursor.fetchall())

    treemap_groups = {
        "Role Types": {"categories": {"role_type"}},
        "Career Level": {"categories": {"career_level"}},
        "Work Model": {"categories": {"work_mode", "people_leadership", "employment_type"}},
        "Focus Areas": {"categories": {"domain", "platform_focus", "impact_focus", "problem_space", "industry"}},
        "Environment": {"categories": {"preferred_onsite_location", "travel_tolerance", "travel_percent_max"}},
    }

    def _category_label(category: str) -> str:
        return str(category or "").replace("_", " ").title()

    treemap_segments = []
    for group_label, config in treemap_groups.items():
        for item in preferences:
            if item["category"] in config["categories"]:
                priority_weight = _priority_weight(item["priority"])
                dimension_weight = float(item.get("dimension_weight", 1.0))
                value_weight = float(item.get("value_weight", 1.0))
                combined_weight = priority_weight * dimension_weight * value_weight

                treemap_segments.append({
                    "group": group_label,
                    "label": item["value"],
                    "category": item["category"],
                    "category_label": _category_label(item["category"]),
                    "dimension": item["dimension"],
                    "priority": item["priority"],
                    "dimension_weight": round(dimension_weight, 2),
                    "value_weight": round(value_weight, 2),
                    "combined_weight": round(combined_weight, 2),
                })

    max_segment_weight = max((item["combined_weight"] for item in treemap_segments), default=1)
    min_segment_weight = min((item["combined_weight"] for item in treemap_segments), default=0)

    for item in treemap_segments:
        if max_segment_weight == min_segment_weight:
            normalized = 1.0
        else:
            normalized = (
                (item["combined_weight"] - min_segment_weight)
                / (max_segment_weight - min_segment_weight)
            )

        item["normalized_weight"] = round(normalized, 4)

        if normalized >= 0.88:
            weight_band = 4
        elif normalized >= 0.68:
            weight_band = 3
        elif normalized >= 0.46:
            weight_band = 2
        else:
            weight_band = 1

        item["weight"] = weight_band
        item["weight_band"] = weight_band

    treemap_segments.sort(key=lambda x: (-x["combined_weight"], x["group"], x["label"]))

    role_priorities = []
    for item in preferences:
        if item["category"] == "role_type":
            priority_weight = _priority_weight(item["priority"])
            weight = priority_weight * float(item.get("dimension_weight", 1.0)) * float(item.get("value_weight", 1.0))
            role_priorities.append({
                "label": item["value"],
                "priority": item["priority"],
                "weight": round(weight, 2),
            })

    max_role_weight = max((item["weight"] for item in role_priorities), default=1)
    for item in role_priorities:
        item["normalized"] = round((item["weight"] / max_role_weight) * 100, 1)

    return {
        "trajectory": {
            "timeline": timeline,
            "observed_title": "Career Trajectory",
            "observed_copy": [
                "Career progression shows a clear shift from execution-oriented work toward system-level design, enablement, and platform thinking.",
                "Later roles concentrate more heavily on architecture, product-facing analytics, and scalable operating models."
            ],
            "derivation": "Based on chronological role progression and the increasing concentration of system and platform-oriented work across later experiences.",
        },
        "fit_profile": {
            "segments": treemap_segments,
            "observed_title": "Opportunity Fit Profile",
            "observed_copy": [
                "Target opportunities prioritize architecture-oriented individual contributor roles with strong flexibility, platform focus, and low-friction operating conditions.",
                "Relative tile size reflects priority plus weighted role significance across dimensions."
            ],
            "derivation": "Based on weighted role-preference records using priority, dimension_weight, and value_weight. Higher combined weight receives larger treemap share.",
        },
        "role_priorities": {
            "roles": role_priorities,
            "observed_title": "Target Role Priorities",
            "observed_copy": [
                "The strongest stated preference is for architecture-oriented roles spanning data, platform, and analytics contexts.",
                "Role prioritization reflects both stated priority and additional weighting for fit significance."
            ],
            "derivation": "Based on role_preference records in the role_type category, normalized by priority, dimension_weight, and value_weight.",
        },
    }


def get_insights():
    return [
        {
            "id": "architect_operator",
            "title": "Architect + Operator",
            "type": "insight",
            "summary": "Combines architectural thinking with practical execution and delivery.",
            "detail": (
                "Project history and capability mix show repeated platform design, enablement, "
                "analytics, and execution-oriented outcomes rather than abstract architecture alone."
            )
        },
        {
            "id": "lead_from_behind",
            "title": "Enablement-Led Leadership",
            "type": "insight",
            "summary": "Leadership pattern emphasizes enablement, guidance, and influence without relying on formal authority.",
            "detail": (
                "Feedback and role progression suggest a collaborative leadership style centered on "
                "knowledge sharing, mentorship, and helping teams move forward through structure and clarity."
            )
        },
        {
            "id": "fast_structured_delivery",
            "title": "Fast + Structured Delivery",
            "type": "insight",
            "summary": "Execution style appears both rapid and methodical.",
            "detail": (
                "Feedback highlights speed, responsiveness, and critical thinking, while project work shows "
                "repeatable frameworks, structured enablement, and scalable solution design."
            )
        },
        {
            "id": "complexity_translator",
            "title": "Complexity Translator",
            "type": "insight",
            "summary": "Strength lies in turning complex systems, requests, and data into structured, understandable paths.",
            "detail": (
                "Architecture, systems thinking, semantic modeling, and stakeholder-oriented capabilities "
                "collectively point to an ability to translate ambiguity into action."
            )
        },
        {
            "id": "scalability_enabler",
            "title": "Scalability Enabler",
            "type": "insight",
            "summary": "A recurring impact pattern is enabling scale through self-service, governance, and reusable design.",
            "detail": (
                "Projects repeatedly point to configuration expansion, self-service enablement, integration "
                "acceleration, and metadata frameworks that reduce friction and increase platform reach."
            )
        },
        {
            "id": "data_product_thinker",
            "title": "Data Product Thinker",
            "type": "insight",
            "summary": "Work reflects explicit data product thinking rather than isolated analytics execution.",
            "detail": (
                "The Human Data Product itself demonstrates modeling, queryability, API exposure, and "
                "consumption-oriented design as a cohesive product pattern."
            )
        },
        {
            "id": "ambiguity_to_operating_clarity",
            "title": "Ambiguity to Operating Clarity",
            "type": "problem_space",
            "summary": "Transforms fragmented processes, systems, and data into scalable structures that organizations can actually operate.",
            "detail": (
                "Recurring project patterns point to solving the same underlying problem: organizations struggle when "
                "platforms, configuration models, analytics, and operational processes are complex but not yet structured for scale. "
                "The work repeatedly closes that gap through architecture, enablement, governance, and practical delivery. "
            )
        },
        {
            "id": "next_opportunity_fit",
            "title": "Next Opportunity Fit",
            "type": "future_fit",
            "summary": "Best aligned with senior architecture-oriented roles focused on data platforms, analytics enablement, and strategic IC impact.",
            "detail": (
                "Structured role preferences indicate strongest fit for Data Architect, Analytics Architect, "
                "Platform Architect, and related senior-level roles with remote or hybrid flexibility, "
                "low travel, and emphasis on enterprise data platform strategy."
            )
        }
    ]
