import sqlite3
import sys
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent / "human_data_product.db"


def get_connection():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at: {DB_PATH}")
    return sqlite3.connect(DB_PATH)


def truncate(value, max_length=80):
    value = "NULL" if value is None else str(value)
    return value if len(value) <= max_length else value[:max_length - 3] + "..."

def truncate(value, max_length=80):
    value = "NULL" if value is None else str(value)
    return value if len(value) <= max_length else value[:max_length - 3] + "..."


def print_rows(cursor, rows, truncate_long_values=True, max_length=80):
    if not rows:
        print("No results found.")
        return

    columns = [desc[0] for desc in cursor.description]

    str_rows = []
    for row in rows:
        formatted_row = []
        for value in row:
            if truncate_long_values:
                formatted_row.append(truncate(value, max_length=max_length))
            else:
                formatted_row.append("NULL" if value is None else str(value))
        str_rows.append(formatted_row)

    col_widths = []
    for i, col_name in enumerate(columns):
        max_data_width = max(len(row[i]) for row in str_rows) if str_rows else 0
        col_widths.append(max(len(col_name), max_data_width))

    header = " | ".join(col_name.ljust(col_widths[i]) for i, col_name in enumerate(columns))
    separator = "-+-".join("-" * col_widths[i] for i in range(len(columns)))

    print(header)
    print(separator)

    for row in str_rows:
        print(" | ".join(row[i].ljust(col_widths[i]) for i in range(len(row))))


def list_tables():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        rows = cursor.fetchall()

    print("\nTables")
    print("------")
    print_rows(cursor, rows)


def show_experience():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT experience_id, company, role, start_date, end_date, domain
            FROM experience
            ORDER BY sort_order ASC;
        """)
        rows = cursor.fetchall()

    print("\nExperience")
    print("----------")
    print_rows(cursor, rows)


def show_projects():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT project_id, name, domain, experience_id
            FROM project
            ORDER BY project_id ASC;
        """)
        rows = cursor.fetchall()

    print("\nProjects")
    print("--------")
    print_rows(cursor, rows)


def show_skills():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT skill_id, category, skill_name, level
            FROM skill
            ORDER BY category, skill_name;
        """)
        rows = cursor.fetchall()

    print("\nSkills")
    print("------")
    print_rows(cursor, rows)


def show_project_skills(project_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.project_id, p.name, s.skill_name, s.level
            FROM project p
            JOIN project_skill ps
                ON p.project_id = ps.project_id
            JOIN skill s
                ON ps.skill_id = s.skill_id
            WHERE p.project_id = ?
            ORDER BY s.skill_name;
        """, (project_id,))
        rows = cursor.fetchall()

    print(f"\nProject Skills for project_id={project_id}")
    print("-----------------------------------")
    print_rows(cursor, rows)


def search_projects(keyword):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT project_id, name, domain, value
            FROM project
            WHERE name LIKE ? OR domain LIKE ? OR value LIKE ?
            ORDER BY project_id ASC;
        """, (f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"))
        rows = cursor.fetchall()

    print(f"\nProject Search: {keyword}")
    print("-------------------------")
    print_rows(cursor, rows)

def show_summary():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT meta_value
            FROM product_metadata
            WHERE meta_key = 'owner'
        """)
        owner = cursor.fetchone()
        owner = owner[0] if owner else "Unknown"

        cursor.execute("""
            SELECT company, role, start_date
            FROM experience
            WHERE end_date IS NULL
            ORDER BY start_date DESC
            LIMIT 1
        """)
        current_role = cursor.fetchone()

        cursor.execute("SELECT COUNT(*) FROM experience")
        experience_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM project")
        project_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM skill")
        skill_count = cursor.fetchone()[0]

        cursor.execute("""
            SELECT category, COUNT(*) as skill_total
            FROM skill
            GROUP BY category
            ORDER BY skill_total DESC, category
        """)
        skill_categories = cursor.fetchall()

        cursor.execute("""
            SELECT skill_name, level
            FROM skill
            WHERE category IN ('architecture', 'data', 'strategy', 'analytics')
            ORDER BY
                CASE level
                    WHEN 'advanced' THEN 1
                    WHEN 'intermediate' THEN 2
                    ELSE 3
                END,
                skill_name
            LIMIT 8
        """)
        top_skills = cursor.fetchall()

    print("\nHuman Data Product Summary")
    print("--------------------------")
    print(f"Owner: {owner}")

    if current_role:
        print(f"Current Role: {current_role[1]} @ {current_role[0]} (since {current_role[2]})")
    else:
        print("Current Role: Not found")

    print(f"Experience Entries: {experience_count}")
    print(f"Projects: {project_count}")
    print(f"Skills: {skill_count}")

    print("\nSkill Categories")
    print("----------------")
    for category, total in skill_categories:
        print(f"{category}: {total}")

    print("\nSelected Core Skills")
    print("--------------------")
    for skill_name, level in top_skills:
        print(f"{skill_name} ({level})")
        
def show_top_projects():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT project_id, name, domain, value
            FROM project
            WHERE project_id IN (1001, 1002, 1003, 1004, 1006, 9001)
            ORDER BY
                CASE project_id
                    WHEN 9001 THEN 1
                    WHEN 1001 THEN 2
                    WHEN 1002 THEN 3
                    WHEN 1003 THEN 4
                    WHEN 1004 THEN 5
                    WHEN 1006 THEN 6
                    ELSE 99
                END
        """)
        rows = cursor.fetchall()

    print("\nTop Projects")
    print("------------")

    if not rows:
        print("No results found.")
        return

    for project_id, name, domain, value in rows:
        print(f"Project ID : {project_id}")
        print(f"Name       : {name}")
        print(f"Domain     : {domain}")
        print(f"Value      : {value}")
        print("-" * 100)

def show_experience_projects(experience_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT e.experience_id, e.company, e.role, p.project_id, p.name, p.domain
            FROM experience e
            JOIN project p
                ON e.experience_id = p.experience_id
            WHERE e.experience_id = ?
            ORDER BY p.project_id
        """, (experience_id,))
        rows = cursor.fetchall()

    print(f"\nProjects for experience_id={experience_id}")
    print("--------------------------------------")
    print_rows(cursor, rows)
    
def show_skills_by_category():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT category, skill_name, level
            FROM skill
            ORDER BY category,
                CASE level
                    WHEN 'advanced' THEN 1
                    WHEN 'intermediate' THEN 2
                    ELSE 3
                END,
                skill_name
        """)
        rows = cursor.fetchall()

    print("\nSkills by Category")
    print("------------------")
    print_rows(cursor, rows)
    
def show_feedback_themes():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT theme, COUNT(*) AS theme_count
            FROM feedback
            GROUP BY theme
            ORDER BY theme_count DESC, theme
        """)
        rows = cursor.fetchall()

    print("\nFeedback Themes")
    print("---------------")
    print_rows(cursor, rows)
    
def show_career_story():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT company, role, start_date, end_date, domain
            FROM experience
            ORDER BY sort_order ASC
        """)
        experiences = cursor.fetchall()

        cursor.execute("""
            SELECT name, domain
            FROM project
            WHERE project_id IN (9001, 1001, 1002, 1003, 1006)
            ORDER BY project_id
        """)
        highlighted_projects = cursor.fetchall()

    print("\nCareer Story")
    print("------------")
    print("Progression:")
    for company, role, start_date, end_date, domain in experiences:
        print(f"- {start_date} to {end_date if end_date else 'Present'} | {role} @ {company} | {domain}")

    print("\nHighlighted Proof Points:")
    for name, domain in highlighted_projects:
        print(f"- {name} [{domain}]")
        
def show_identity():
    print("\nArchitectural Identity")
    print("----------------------")

    print("Specialization:")
    print("Enterprise Data Platforms & Analytics Enablement\n")

    print("Core Focus Areas:")
    focus_areas = [
        "Data Platform Architecture",
        "Analytics Enablement",
        "Self-Service Analytics",
        "Data Product Thinking",
        "Metadata Modeling",
        "Data Governance",
        "Platform Adoption",
        "Value Realization",
    ]

    for area in focus_areas:
        print(f"- {area}")

    print("\nArchitectural Pattern:")
    print(
        "Transform fragmented operational data into structured, trusted data products "
        "that enable scalable insight, decision intelligence, and enterprise adoption."
    )

    print("\nPrimary Strength:")
    print(
        "Bridging technical architecture, analytics intelligence, and organizational "
        "platform adoption to maximize value from enterprise data ecosystems."
    )
    
def show_impact_summary():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT name, value
            FROM project
            WHERE value IS NOT NULL
            ORDER BY project_id
        """)

        rows = cursor.fetchall()

    print("\nImpact Summary")
    print("--------------")

    for name, value in rows:
        print(f"\n{name}")
        print("-" * len(name))
        print(value)
        
def show_skill_strengths():
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT category,
                   SUM(CASE WHEN level='advanced' THEN 1 ELSE 0 END) AS advanced_count,
                   COUNT(*) AS total_skills
            FROM skill
            GROUP BY category
            ORDER BY advanced_count DESC, total_skills DESC
        """)

        rows = cursor.fetchall()

    print("\nSkill Strength Clusters")
    print("-----------------------")

    for category, advanced_count, total in rows:
        print(f"{category}: {advanced_count} advanced skills ({total} total)")
        
def show_project_detail(project_id):
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT project_id, name, domain, value
            FROM project
            WHERE project_id = ?
        """, (project_id,))

        project = cursor.fetchone()

        if not project:
            print("Project not found.")
            return

        cursor.execute("""
            SELECT s.skill_name, s.level
            FROM skill s
            JOIN project_skill ps
                ON s.skill_id = ps.skill_id
            WHERE ps.project_id = ?
            ORDER BY s.skill_name
        """, (project_id,))

        skills = cursor.fetchall()

    project_id, name, domain, value = project

    print("\nProject Detail")
    print("--------------")

    print(f"Project ID : {project_id}")
    print(f"Name       : {name}")
    print(f"Domain     : {domain}")
    print(f"\nImpact:")
    print(value)

    if skills:
        print("\nAssociated Skills")
        print("-----------------")
        for skill, level in skills:
            print(f"- {skill} ({level})")
            
        
def search_all(keyword):
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 'project' AS entity_type, project_id AS entity_id, name AS title, domain AS context
            FROM project
            WHERE name LIKE ? OR domain LIKE ? OR value LIKE ?

            UNION ALL

            SELECT 'skill' AS entity_type, skill_id AS entity_id, skill_name AS title, category AS context
            FROM skill
            WHERE skill_name LIKE ? OR category LIKE ? OR level LIKE ?

            UNION ALL

            SELECT 'experience' AS entity_type, experience_id AS entity_id, role AS title, company AS context
            FROM experience
            WHERE role LIKE ? OR company LIKE ? OR domain LIKE ?

            ORDER BY entity_type, entity_id
        """, (
            f"%{keyword}%", f"%{keyword}%", f"%{keyword}%",
            f"%{keyword}%", f"%{keyword}%", f"%{keyword}%",
            f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"
        ))
        rows = cursor.fetchall()

    print(f"\nSearch All: {keyword}")
    print("--------------------")
    print_rows(cursor, rows)

def show_help():
    print("""
Usage:
  py query_engine.py tables
  py query_engine.py summary
  py query_engine.py identity
  py query_engine.py experience
  py query_engine.py projects
  py query_engine.py top_projects
  py query_engine.py experience_projects <experience_id>
  py query_engine.py project_detail <project_id>
  py query_engine.py skills
  py query_engine.py skills_by_category
  py query_engine.py skill_strengths
  py query_engine.py project_skills <project_id>
  py query_engine.py feedback_themes
  py query_engine.py career_story
  py query_engine.py impact_summary
  py query_engine.py search_projects <keyword>
  py query_engine.py search_all <keyword>

Examples:
  py query_engine.py summary
  py query_engine.py top_projects
  py query_engine.py experience_projects 1
  py query_engine.py skills_by_category
  py query_engine.py feedback_themes
  py query_engine.py career_story
  py query_engine.py search_all architecture
""")


def main():
    if len(sys.argv) < 2:
        show_help()
        return

    command = sys.argv[1].lower()

    try:
        if command == "tables":
            list_tables()

        elif command == "summary":
            show_summary()

        elif command == "identity":
            show_identity()

        elif command == "experience":
            show_experience()

        elif command == "projects":
            show_projects()

        elif command == "top_projects":
            show_top_projects()

        elif command == "experience_projects":
            if len(sys.argv) < 3:
                print("Error: experience_projects requires an experience_id")
                return
            show_experience_projects(sys.argv[2])

        elif command == "project_detail":
            if len(sys.argv) < 3:
                print("Error: project_detail requires a project_id")
                return
            show_project_detail(sys.argv[2])

        elif command == "skills":
            show_skills()

        elif command == "skills_by_category":
            show_skills_by_category()

        elif command == "skill_strengths":
            show_skill_strengths()

        elif command == "project_skills":
            if len(sys.argv) < 3:
                print("Error: project_skills requires a project_id")
                return
            show_project_skills(sys.argv[2])

        elif command == "feedback_themes":
            show_feedback_themes()

        elif command == "career_story":
            show_career_story()

        elif command == "impact_summary":
            show_impact_summary()

        elif command == "search_projects":
            if len(sys.argv) < 3:
                print("Error: search_projects requires a keyword")
                return
            search_projects(" ".join(sys.argv[2:]))

        elif command == "search_all":
            if len(sys.argv) < 3:
                print("Error: search_all requires a keyword")
                return
            search_all(" ".join(sys.argv[2:]))

        else:
            print(f"Unknown command: {command}")
            print()
            show_help()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()