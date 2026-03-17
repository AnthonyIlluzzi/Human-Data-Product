from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data_service import (
    get_health,
    get_product_metadata,
    get_contact_info,
    get_summary,
    get_identity,
    get_experiences,
    get_projects,
    get_project_detail,
    get_skills,
    search_projects,
    get_role_preferences,
    get_target_opportunity,
    get_career_timeline,
    get_skill_utilization,
    get_feedback_themes,
    get_feedback_theme_details,
    get_projects_by_domain,
    get_projects_by_experience,
    get_experience_projects,
    get_skill_projects,
    get_insights,
    execute_readonly_query,
)

app = FastAPI(
    title="Human Data Product API",
    description="API layer for Anthony Illuzzi's Human Data Product",
    version="1.0.0"
)

class SqlQueryRequest(BaseModel):
    sql: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return get_health()


@app.get("/product-metadata")
def product_metadata():
    return get_product_metadata()


@app.get("/contact-info")
def contact_info():
    return get_contact_info()


@app.get("/summary")
def summary():
    return get_summary()


@app.get("/identity")
def identity():
    return get_identity()


@app.get("/experiences")
def experiences():
    return get_experiences()


@app.get("/projects")
def projects():
    return get_projects()


@app.get("/projects/{project_id}")
def project_detail(project_id: int):
    result = get_project_detail(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@app.get("/skills")
def skills(category: str | None = None):
    return get_skills(category=category)
    
@app.post("/query/execute")
def query_execute(payload: SqlQueryRequest):
    try:
        return execute_readonly_query(payload.sql)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.get("/search/projects")
def search_projects_endpoint(q: str = Query(..., min_length=2)):
    return search_projects(q)


@app.get("/role-preferences")
def role_preferences(
    dimension: str | None = None,
    category: str | None = None,
    priority: str | None = None
):
    return get_role_preferences(
        dimension=dimension,
        category=category,
        priority=priority
    )


@app.get("/target-opportunity")
def target_opportunity():
    return get_target_opportunity()


@app.get("/analytics/career-timeline")
def career_timeline():
    return get_career_timeline()


@app.get("/analytics/skill-utilization")
def skill_utilization():
    return get_skill_utilization()


@app.get("/analytics/skill-projects/{skill_id}")
def skill_projects(skill_id: int):
    return get_skill_projects(skill_id)


@app.get("/analytics/feedback-themes")
def feedback_themes(
    source_type: str | None = None,
    entity_type: str | None = None
):
    return get_feedback_themes(source_type=source_type, entity_type=entity_type)


@app.get("/analytics/feedback-theme-details/{theme}")
def feedback_theme_details(theme: str):
    return get_feedback_theme_details(theme)


@app.get("/analytics/projects-by-domain")
def projects_by_domain():
    return get_projects_by_domain()


@app.get("/analytics/projects-by-experience")
def projects_by_experience():
    return get_projects_by_experience()


@app.get("/analytics/experience-projects/{experience_id}")
def experience_projects(experience_id: int):
    return get_experience_projects(experience_id)


@app.get("/insights")
def insights():
    return get_insights()