from pathlib import Path
import sqlite3
from fastapi import FastAPI, HTTPException, Query

app = FastAPI(
    title="Human Data Product API",
    description="API layer for Anthony Illuzzi's Human Data Product",
    version="1.0.0"
)

DB_PATH = Path(__file__).resolve().parent / "human_data_product.db"


def get_connection():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows_to_dicts(rows):
    return [dict(row) for row in rows]


@app.get("/health")
def health():
    return {"status": "ok", "service": "human-data-product-api"}


@app.get("/summary")
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
            "skill_categories": skill_categories
        }


@app.get("/identity")
def get_identity():
    return {
        "specialization": "Enterprise Data Platforms & Analytics Enablement",
        "core_focus_areas": [
            "Data platform architecture",
            "Analytics enablement & product intelligence",
            "Self-service analytics and configuration scalability",
            "Metadata modeling and governance frameworks",
            "Platform adoption and value realization"
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


@app.get("/experience")
def get_experience():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT experience_id, company, role, start_date, end_date, domain, focus_area, impact, sort_order
            FROM experience
            ORDER BY sort_order ASC
        """)
        return rows_to_dicts(cursor.fetchall())


@app.get("/projects")
def get_projects():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT project_id, experience_id, name, domain, value, link
            FROM project
            ORDER BY project_id ASC
        """)
        return rows_to_dicts(cursor.fetchall())


@app.get("/projects/{project_id}")
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
            raise HTTPException(status_code=404, detail="Project not found")

        cursor.execute("""
            SELECT s.skill_id, s.skill_name, s.category, s.level
            FROM skill s
            JOIN project_skill ps
              ON s.skill_id = ps.skill_id
            WHERE ps.project_id = ?
            ORDER BY s.skill_name
        """, (project_id,))
        skills = rows_to_dicts(cursor.fetchall())

        return {
            "project": dict(project),
            "associated_skills": skills
        }


@app.get("/skills")
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


@app.get("/search/projects")
def search_projects(q: str = Query(..., min_length=2)):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT project_id, experience_id, name, domain, value, link
            FROM project
            WHERE name LIKE ? OR domain LIKE ? OR value LIKE ?
            ORDER BY project_id
        """, (f"%{q}%", f"%{q}%", f"%{q}%"))

        return {
            "query": q,
            "results": rows_to_dicts(cursor.fetchall())
        }