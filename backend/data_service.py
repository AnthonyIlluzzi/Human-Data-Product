from pathlib import Path
import sqlite3


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
