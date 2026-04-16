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
    get_system_improvements,
    get_system_improvement_detail,
    get_project_detail,
    get_skills,
    get_skill_domains,
    get_capability_insights_dashboard,
    search_projects,
    get_role_preferences,
    get_target_opportunity,
    get_career_timeline,
    get_skill_utilization,
    get_skill_cooccurrence,
    get_system_improvements_by_layer,
    get_system_improvements_by_problem,
    get_system_improvements_by_solution,
    get_system_improvements_by_impact,
    get_system_improvements_timeline,
    get_feedback_themes,
    get_feedback_theme_details,
    get_projects_by_domain,
    get_projects_by_experience,
    get_experience_projects,
    get_project_system_improvements,
    get_experience_system_improvements,
    get_skill_projects,
    get_insights,
    get_value_insights_dashboard,
    get_opportunity_insights_dashboard,
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


@app.api_route("/health", methods=["GET", "HEAD"])
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


@app.get("/system-improvements")
def system_improvements(
    system_layer: str | None = None,
    problem_type: str | None = None,
    solution_type: str | None = None,
    impact_type: str | None = None,
    experience_id: int | None = None,
    project_id: int | None = None,
):
    return get_system_improvements(
        system_layer=system_layer,
        problem_type=problem_type,
        solution_type=solution_type,
        impact_type=impact_type,
        experience_id=experience_id,
        project_id=project_id,
    )

@app.get("/system-improvements/{improvement_id}")
def system_improvement_detail(improvement_id: int):
    result = get_system_improvement_detail(improvement_id)
    if not result:
        raise HTTPException(status_code=404, detail="System improvement not found")
    return result

@app.get("/projects/{project_id}")
def project_detail(project_id: int):
    result = get_project_detail(project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return result

@app.get("/skills")
def skills(domain_id: int | None = None):
    return get_skills(domain_id=domain_id)

@app.get("/skill-domains")
def skill_domains():
    return get_skill_domains()
    
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


@app.get("/analytics/skill-cooccurrence")
def skill_cooccurrence(limit: int = Query(6, ge=4, le=8)):
    return get_skill_cooccurrence(limit=limit)


@app.get("/analytics/system-improvements-by-layer")
def system_improvements_by_layer():
    return get_system_improvements_by_layer()


@app.get("/analytics/system-improvements-by-problem")
def system_improvements_by_problem():
    return get_system_improvements_by_problem()


@app.get("/analytics/system-improvements-by-solution")
def system_improvements_by_solution():
    return get_system_improvements_by_solution()


@app.get("/analytics/system-improvements-by-impact")
def system_improvements_by_impact():
    return get_system_improvements_by_impact()


@app.get("/analytics/system-improvements-timeline")
def system_improvements_timeline():
    return get_system_improvements_timeline()


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


@app.get("/analytics/project-system-improvements/{project_id}")
def project_system_improvements(project_id: int):
    return get_project_system_improvements(project_id)


@app.get("/analytics/experience-system-improvements/{experience_id}")
def experience_system_improvements(experience_id: int):
    return get_experience_system_improvements(experience_id)


@app.get("/analytics/value-insights-dashboard")
def value_insights_dashboard():
    return get_value_insights_dashboard()

@app.get("/analytics/capability-insights-dashboard")
def capability_insights_dashboard():
    return get_capability_insights_dashboard()

@app.get("/analytics/opportunity-insights-dashboard")
def opportunity_insights_dashboard():
    return get_opportunity_insights_dashboard()


@app.get("/insights")
def insights():
    return get_insights()
