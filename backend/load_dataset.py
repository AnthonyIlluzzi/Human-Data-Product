from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable
from datetime import date


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATASET_PATH = PROJECT_ROOT / "data" / "anthony_illuzzi_dataset.json"
DB_PATH = BASE_DIR / "human_data_product.db"


TOP_LEVEL_TABLES = [
    "product_metadata",
    "contact_info",
    "principle",
    "role_preference",
    "experience",
    "education",
    "credential",
    "project",
    "skills_domain",
    "skill",
    "project_skill",
    "feedback",
    "system_improvement",
]

ALLOWED_FEEDBACK_ENTITY_TYPES = {
    "experience": "experience",
    "education": "education",
    "project": "project",
    "credential": "credential",
}


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Dataset file not found: {path}")

    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def validate_top_level_structure(data: dict[str, Any]) -> None:
    missing = [key for key in TOP_LEVEL_TABLES if key not in data]
    if missing:
        raise ValueError(f"Dataset is missing top-level sections: {missing}")

    for key in TOP_LEVEL_TABLES:
        if not isinstance(data[key], list):
            raise TypeError(f"Top-level key '{key}' must be a list.")


def require_keys(records: Iterable[dict[str, Any]], required: set[str], table_name: str) -> None:
    for idx, record in enumerate(records, start=1):
        missing = required - record.keys()
        if missing:
            raise ValueError(
                f"Table '{table_name}' record #{idx} is missing required keys: {sorted(missing)}"
            )


def build_id_set(records: list[dict[str, Any]], id_key: str) -> set[Any]:
    ids: set[Any] = set()
    for record in records:
        if id_key not in record:
            raise ValueError(f"Expected id key '{id_key}' not found in record: {record}")
        value = record[id_key]
        if value in ids:
            raise ValueError(f"Duplicate id '{value}' found for key '{id_key}'")
        ids.add(value)
    return ids


def validate_referential_integrity(data: dict[str, Any]) -> None:
    experience_ids = build_id_set(data["experience"], "experience_id")
    education_ids = build_id_set(data["education"], "education_id")
    credential_ids = build_id_set(data["credential"], "credential_id")
    project_ids = build_id_set(data["project"], "project_id")
    domain_ids = build_id_set(data["skills_domain"], "domain_id")
    skill_ids = build_id_set(data["skill"], "skill_id")

    for record in data["skill"]:
        domain_id = record["domain_id"]

        if domain_id not in domain_ids:
            raise ValueError(
                f"Skill {record['skill_id']} references missing domain_id {domain_id}"
            )

        if not 1 <= int(record["depth"]) <= 4:
            raise ValueError(
                f"Skill {record['skill_id']} has invalid depth {record['depth']} (expected 1-4)"
            )

        if not 0 <= int(record["experience"]) <= 3:
            raise ValueError(
                f"Skill {record['skill_id']} has invalid experience {record['experience']} (expected 0-3)"
            )

        if not 0 <= int(record["confidence"]) <= 100:
            raise ValueError(
                f"Skill {record['skill_id']} has invalid confidence {record['confidence']} (expected 0-100)"
            )
    
    for record in data["project"]:
        if record["experience_id"] not in experience_ids:
            raise ValueError(
                f"Project {record['project_id']} references missing experience_id "
                f"{record['experience_id']}"
            )

    seen_project_skill_pairs: set[tuple[Any, Any]] = set()
    for record in data["project_skill"]:
        project_id = record["project_id"]
        skill_id = record["skill_id"]

        if project_id not in project_ids:
            raise ValueError(f"project_skill references missing project_id {project_id}")
        if skill_id not in skill_ids:
            raise ValueError(f"project_skill references missing skill_id {skill_id}")

        pair = (project_id, skill_id)
        if pair in seen_project_skill_pairs:
            raise ValueError(f"Duplicate project_skill mapping found: {pair}")
        seen_project_skill_pairs.add(pair)

    seen_system_improvement_ids: set[Any] = set()
    for record in data["system_improvement"]:
        improvement_id = record["improvement_id"]
        experience_id = record["experience_id"]
        project_id = record["project_id"]

        if improvement_id in seen_system_improvement_ids:
            raise ValueError(f"Duplicate system_improvement id found: {improvement_id}")
        seen_system_improvement_ids.add(improvement_id)

        if experience_id not in experience_ids:
            raise ValueError(
                f"system_improvement {improvement_id} references missing experience_id {experience_id}"
            )

        if project_id is not None and project_id not in project_ids:
            raise ValueError(
                f"system_improvement {improvement_id} references missing project_id {project_id}"
            )
    
    for record in data["feedback"]:
        entity_type = record["entity_type"]
        entity_id = record["entity_id"]

        if entity_type not in ALLOWED_FEEDBACK_ENTITY_TYPES:
            raise ValueError(
                f"Feedback {record['feedback_id']} has invalid entity_type '{entity_type}'. "
                f"Allowed values: {sorted(ALLOWED_FEEDBACK_ENTITY_TYPES)}"
            )

        if entity_type == "experience" and entity_id not in experience_ids:
            raise ValueError(
                f"Feedback {record['feedback_id']} references missing experience entity_id {entity_id}"
            )
        if entity_type == "education" and entity_id not in education_ids:
            raise ValueError(
                f"Feedback {record['feedback_id']} references missing education entity_id {entity_id}"
            )
        if entity_type == "project" and entity_id not in project_ids:
            raise ValueError(
                f"Feedback {record['feedback_id']} references missing project entity_id {entity_id}"
            )
        if entity_type == "credential" and entity_id not in credential_ids:
            raise ValueError(
                f"Feedback {record['feedback_id']} references missing credential entity_id {entity_id}"
            )


def validate_dataset(data: dict[str, Any]) -> None:
    validate_top_level_structure(data)

    require_keys(
        data["product_metadata"],
        {"meta_key", "meta_value"},
        "product_metadata",
    )
    require_keys(
        data["contact_info"],
        {"contact_id", "category", "value", "is_public"},
        "contact_info",
    )
    require_keys(
        data["principle"],
        {"principle_id", "principle_desc", "sort_order"},
        "principle",
    )
    require_keys(
        data["role_preference"],
        {"preference_id", "dimension", "category", "value", "priority"},
        "role_preference",
    )

    for record in data["role_preference"]:
        record.setdefault("dimension_weight", 1.0)
        record.setdefault("value_weight", 1.0)
        
    require_keys(
        data["experience"],
        {
            "experience_id",
            "company",
            "role",
            "start_date",
            "end_date",
            "domain",
            "focus_area",
            "impact",
            "sort_order",
        },
        "experience",
    )
    require_keys(
        data["education"],
        {
            "education_id",
            "institution",
            "location",
            "degree",
            "field_of_study",
            "honors_flag",
            "completion_date",
            "sort_order",
        },
        "education",
    )
    require_keys(
        data["credential"],
        {
            "credential_id",
            "type",
            "title",
            "issuer",
            "issue_date",
            "end_date",
            "status",
            "description",
            "link",
            "sort_order",
        },
        "credential",
    )
    require_keys(
        data["project"],
        {"project_id", "experience_id", "name", "domain", "value", "link"},
        "project",
    )
    require_keys(
        data["skills_domain"],
        {"domain_id", "domain", "sort_order", "summary"},
        "skills_domain",
    )
    require_keys(
        data["skill"],
        {
            "skill_id",
            "skill_name",
            "skill_ref",
            "domain_id",
            "display_order",
            "depth",
            "experience",
            "confidence",
            "notes",
            "source_origin",
        },
        "skill",
    )
    require_keys(
        data["project_skill"],
        {"project_id", "skill_id"},
        "project_skill",
    )
    require_keys(
        data["feedback"],
        {
            "feedback_id",
            "entity_type",
            "entity_id",
            "source_type",
            "quote",
            "theme",
            "year",
            "viz_display_flag",
            "viz_display_rank",
        },
        "feedback",
    )
    require_keys(
        data["system_improvement"],
        {
            "improvement_id",
            "experience_id",
            "project_id",
            "system_layer",
            "description",
            "problem_type",
            "solution_type",
            "impact_type",
            "delivered_date",
            "sort_order",
        },
        "system_improvement",
    )

    validate_referential_integrity(data)

def apply_runtime_metadata(data: dict[str, Any]) -> None:
    today = date.today().isoformat()

    for record in data["product_metadata"]:
        if record["meta_key"] == "last_pipeline_refresh":
            record["meta_value"] = today
            break
    else:
        data["product_metadata"].append(
            {
                "meta_key": "last_pipeline_refresh",
                "meta_value": today,
            }
        )

def get_connection(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def create_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS product_metadata (
            meta_key TEXT PRIMARY KEY,
            meta_value TEXT
        );

        CREATE TABLE IF NOT EXISTS contact_info (
            contact_id INTEGER PRIMARY KEY,
            category TEXT,
            value TEXT,
            is_public BOOLEAN
        );

        CREATE TABLE IF NOT EXISTS principle (
            principle_id INTEGER PRIMARY KEY,
            principle_desc TEXT,
            sort_order INTEGER
        );

        CREATE TABLE IF NOT EXISTS role_preference (
            preference_id INTEGER PRIMARY KEY,
            dimension TEXT,
            category TEXT,
            value TEXT,
            priority TEXT,
            dimension_weight REAL,
            value_weight REAL
        );

        CREATE TABLE IF NOT EXISTS experience (
            experience_id INTEGER PRIMARY KEY,
            company TEXT,
            role TEXT,
            start_date DATE,
            end_date DATE,
            domain TEXT,
            focus_area TEXT,
            impact TEXT,
            sort_order INTEGER
        );

        CREATE TABLE IF NOT EXISTS education (
            education_id INTEGER PRIMARY KEY,
            institution TEXT,
            location TEXT,
            degree TEXT,
            field_of_study TEXT,
            honors_flag BOOLEAN,
            completion_date DATE,
            sort_order INTEGER
        );

        CREATE TABLE IF NOT EXISTS credential (
            credential_id INTEGER PRIMARY KEY,
            type TEXT,
            title TEXT,
            issuer TEXT,
            issue_date DATE,
            end_date DATE,
            status TEXT,
            description TEXT,
            link TEXT,
            sort_order INTEGER
        );

        CREATE TABLE IF NOT EXISTS project (
            project_id INTEGER PRIMARY KEY,
            experience_id INTEGER NOT NULL,
            name TEXT,
            domain TEXT,
            value TEXT,
            link TEXT,
            FOREIGN KEY (experience_id) REFERENCES experience(experience_id)
        );

        CREATE TABLE IF NOT EXISTS skills_domain (
            domain_id INTEGER PRIMARY KEY,
            domain TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            summary TEXT
        );
        
        CREATE TABLE IF NOT EXISTS skill (
            skill_id INTEGER PRIMARY KEY,
            skill_name TEXT NOT NULL,
            skill_ref TEXT NOT NULL UNIQUE,
            domain_id INTEGER NOT NULL,
            display_order INTEGER NOT NULL,
            depth INTEGER NOT NULL,
            experience INTEGER NOT NULL,
            confidence INTEGER NOT NULL,
            notes TEXT,
            source_origin TEXT,
            FOREIGN KEY (domain_id) REFERENCES skills_domain(domain_id)
        );

        CREATE TABLE IF NOT EXISTS project_skill (
            project_id INTEGER NOT NULL,
            skill_id INTEGER NOT NULL,
            PRIMARY KEY (project_id, skill_id),
            FOREIGN KEY (project_id) REFERENCES project(project_id),
            FOREIGN KEY (skill_id) REFERENCES skill(skill_id)
        );

        CREATE TABLE IF NOT EXISTS feedback (
            feedback_id INTEGER PRIMARY KEY,
            entity_type TEXT,
            entity_id INTEGER,
            source_type TEXT,
            quote TEXT,
            theme TEXT,
            year INTEGER,
            viz_display_flag BOOLEAN,
            viz_display_rank INTEGER
        );

        CREATE TABLE IF NOT EXISTS system_improvement (
            improvement_id INTEGER PRIMARY KEY,
            experience_id INTEGER NOT NULL,
            project_id INTEGER,
            system_layer TEXT,
            description TEXT,
            problem_type TEXT,
            solution_type TEXT,
            impact_type TEXT,
            delivered_date DATE,
            sort_order INTEGER,
            FOREIGN KEY (experience_id) REFERENCES experience(experience_id),
            FOREIGN KEY (project_id) REFERENCES project(project_id)
        );
        """
    )
    conn.commit()


def clear_tables(conn: sqlite3.Connection) -> None:
    # Order matters because of FK constraints.
    delete_order = [
        "project_skill",
        "system_improvement",
        "feedback",
        "project",
        "skill",
        "skills_domain",
        "credential",
        "education",
        "experience",
        "role_preference",
        "principle",
        "contact_info",
        "product_metadata",
    ]
    for table in delete_order:
        conn.execute(f"DELETE FROM {table};")
    conn.commit()


def insert_many(
    conn: sqlite3.Connection,
    table_name: str,
    columns: list[str],
    records: list[dict[str, Any]],
) -> None:
    if not records:
        return

    placeholders = ", ".join(["?"] * len(columns))
    column_list = ", ".join(columns)
    sql = f"INSERT INTO {table_name} ({column_list}) VALUES ({placeholders})"

    values = [tuple(record.get(col) for col in columns) for record in records]
    conn.executemany(sql, values)


def load_data(conn: sqlite3.Connection, data: dict[str, Any]) -> None:
    insert_many(
        conn,
        "product_metadata",
        ["meta_key", "meta_value"],
        data["product_metadata"],
    )
    insert_many(
        conn,
        "contact_info",
        ["contact_id", "category", "value", "is_public"],
        data["contact_info"],
    )
    insert_many(
        conn,
        "principle",
        ["principle_id", "principle_desc", "sort_order"],
        data["principle"],
    )
    insert_many(
        conn,
        "role_preference",
        ["preference_id", "dimension", "category", "value", "priority", "dimension_weight", "value_weight"],
        data["role_preference"],
    )
    insert_many(
        conn,
        "experience",
        [
            "experience_id",
            "company",
            "role",
            "start_date",
            "end_date",
            "domain",
            "focus_area",
            "impact",
            "sort_order",
        ],
        data["experience"],
    )
    insert_many(
        conn,
        "education",
        [
            "education_id",
            "institution",
            "location",
            "degree",
            "field_of_study",
            "honors_flag",
            "completion_date",
            "sort_order",
        ],
        data["education"],
    )
    insert_many(
        conn,
        "credential",
        [
            "credential_id",
            "type",
            "title",
            "issuer",
            "issue_date",
            "end_date",
            "status",
            "description",
            "link",
            "sort_order",
        ],
        data["credential"],
    )
    insert_many(
        conn,
        "project",
        ["project_id", "experience_id", "name", "domain", "value", "link"],
        data["project"],
    )
    insert_many(
        conn,
        "skills_domain",
        ["domain_id", "domain", "sort_order", "summary"],
        data["skills_domain"],
    )
    insert_many(
        conn,
        "skill",
        [
            "skill_id",
            "skill_name",
            "skill_ref",
            "domain_id",
            "display_order",
            "depth",
            "experience",
            "confidence",
            "notes",
            "source_origin",
        ],
        data["skill"],
    )
    insert_many(
        conn,
        "project_skill",
        ["project_id", "skill_id"],
        data["project_skill"],
    )
    insert_many(
        conn,
        "feedback",
        [
            "feedback_id",
            "entity_type",
            "entity_id",
            "source_type",
            "quote",
            "theme",
            "year",
            "viz_display_flag",
            "viz_display_rank",
        ],
        data["feedback"],
    )
    insert_many(
        conn,
        "system_improvement",
        [
            "improvement_id",
            "experience_id",
            "project_id",
            "system_layer",
            "description",
            "problem_type",
            "solution_type",
            "impact_type",
            "delivered_date",
            "sort_order",
        ],
        data["system_improvement"],
    )

    conn.commit()


def main() -> None:
    print(f"Loading dataset from: {DATASET_PATH}")
    data = load_json(DATASET_PATH)

    print("Validating dataset...")
    validate_dataset(data)

    print("Applying runtime metadata...")
    apply_runtime_metadata(data)

    print(f"Opening database: {DB_PATH}")
    conn = get_connection(DB_PATH)

    try:
        print("Creating tables if needed...")
        create_tables(conn)

        print("Clearing existing data...")
        clear_tables(conn)

        print("Loading fresh data...")
        load_data(conn, data)

        print("Done. Dataset successfully loaded into SQLite.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
