# Human Data Product API
https://human-data-product-api.onrender.com/docs

### Production Access
--------
Live backend service hosted on Render.

## Overview
--------
This API exposes curated professional data representing Anthony Illuzzi's
Human Data Product. It allows consumers to query experience, projects,
skills, and architectural identity through structured endpoints.

### Base URL
--------
https://human-data-product-api.onrender.com

## Endpoint List

### System
| Method | Endpoint          | Description                                                                                                 |
|--------|-------------------|-------------------------------------------------------------------------------------------------------------|
| GET    | /health           | Health check for the API service                                                                            |
| GET    | /product-metadata | Returns Human Data Product metadata including status, owner, and record counts                              |
| GET    | /contact-info     | Returns contact channels for the Human Data Product owner                                                   |
| GET    | /summary          | Returns a high-level summary of the Human Data Product including counts of experience, projects, and skills |
| GET    | /identity         | Returns identity information describing the Human Data Product owner                                        |

### Core Data Retrieval
| Method | Endpoint               | Description                                         |
|--------|------------------------|-----------------------------------------------------|
| GET    | /experiences           | Returns all experience records                      |
| GET    | /projects              | Returns all project records                         |
| GET    | /projects/{project_id} | Returns detailed information for a specific project |
| GET    | /skills                | Returns all skill records                           |

### Search
| Method | Endpoint         | Description                |
|--------|------------------|----------------------------|
| GET    | /search/projects | Search projects by keyword |

### Role Intelligence
| Method | Endpoint            | Description                                                  |
|--------|---------------------|--------------------------------------------------------------|
| GET    | /role-preferences   | Returns structured role preferences for future opportunities |
| GET    | /target-opportunity | Returns synthesized target opportunity profile               |

### Analytics
| Method | Endpoint                                       | Description                                                   |
|--------|------------------------------------------------|---------------------------------------------------------------|
| GET    | /analytics/projects-by-domain                  | Returns project distribution by domain                        |
| GET    | /analytics/projects-by-experience              | Returns project distribution by experience                    |
| GET    | /analytics/career-timeline                     | Returns career timeline data for visualization                |
| GET    | /analytics/skill-utilization                   | Returns skill utilization statistics                          |
| GET    | /analytics/feedback-themes                     | Returns aggregated feedback themes                            |
| GET    | /analytics/skill-projects/{skill_id}           | Returns projects associated with a specific skill             |
| GET    | /analytics/experience-projects/{experience_id} | Returns projects associated with a specific experience        |
| GET    | /analytics/feedback-theme-details/{theme}      | Returns detailed feedback entries for a feedback theme        |

### Insights
| Method | Endpoint  | Description                                              |
|--------|-----------|----------------------------------------------------------|
| GET    | /insights | Returns curated insight cards for the Insights Workspace |

### Data Model Overview
| Entity           | Description                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| Experience       | Career roles and professional positions across the timeline               |
| Projects         | Key initiatives and deliverables tied to specific experience              |
| Skills           | Technical, architectural, and leadership capabilities                     |
| Project_Skills   | Many-to-many relationship mapping projects to skills                      |
| Feedback         | Structured qualitative signals tied to experience, projects, or education |
| Role_Preference  | Structured preferences for future role direction and fit                  |
| Principle        | Personal operating principles used to reinforce insight narrative         |
| Contact_Info     | Public contact channels for the Human Data Product owner                  |
| Product_Metadata | Product-level metadata used for status, versioning, and health            |

## GET /health

### Purpose
-------
Confirms the API service is operational.

### Response Structure
| Field   | Type   | Description                      |
| ------- | ------ | -------------------------------- |
| status  | string | Indicates API operational status |
| service | string | Name of the running API service  |

### Query Paramters
None

### Example Response
---------------------
{
  "status": "ok",
  "service": "human-data-product-api"
}

## GET /product-metadata

### Purpose
-------
Returns high-level metadata for the Human Data Product, including status,
type, version, refresh date, owner, and record counts.

### Response Structure
| Field                 | Type   | Description                                  |
| --------------------- | ------ | -------------------------------------------- |
| status                | string | Product status                               |
| type                  | string | Product classification                       |
| version               | string | Current product version                      |
| last_pipeline_refresh | string | Last refresh date for the data pipeline      |
| owner                 | string | Human Data Product owner                     |
| experience_count      | integer| Total number of experience records           |
| project_count         | integer| Total number of project records              |
| skill_count           | integer| Total number of skill records                |

### Query Parameters
None

### Example Response
---------------------
{
  "status": "active",
  "type": "Human Data Product",
  "version": "1.0",
  "last_pipeline_refresh": "2026-03-05",
  "owner": "Anthony Illuzzi",
  "experience_count": 6,
  "project_count": 16,
  "skill_count": 33
}

## GET /contact-info

### Purpose
-------
Returns contact channels associated with the Human Data Product owner.

### Response Structure
| Field    | Type   | Description                                |
| -------- | ------ | ------------------------------------------ |
| category | string | Contact channel type                       |
| value    | string | Contact value for the specified channel    |

### Query Parameters
None

### Example Response
---------------------
[
  {
    "category": "email",
    "value": "Anthony.Illuzzi@yahoo.com"
  },
  {
    "category": "phone",
    "value": "6304858225"
  },
  {
    "category": "linkedin",
    "value": "https://linkedin.com/in/anthonyilluzzi"
  },
  {
    "category": "location",
    "value": "Libertyville, Illinois (Chicago Area)"
  }
]

Note: Response may contain multiple records.

## GET /summary

### Purpose
-------
Returns a high-level summary of the Human Data Product including
experience count, project count, skill count, and current role.

### Response Structure
| Field                        | Type          | Description                        |
| ---------------------------- | ------------- | ---------------------------------- |
| owner                        | string        | Owner of the Human Data Product    |
| current_role                 | object        | Current professional role          |
| current_role.company         | string        | Current employer                   |
| current_role.role            | string        | Current role title                 |
| current_role.start_date      | string (date) | Start date of current role         |
| experience_count             | integer       | Total number of experience records |
| project_count                | integer       | Total number of projects           |
| skill_count                  | integer       | Total number of skills             |
| skill_categories             | array         | Breakdown of skills by category    |
| skill_categories.category    | string        | Skill category                     |
| skill_categories.skill_total | integer       | Number of skills in that category  |

### Query Paramters
None

### Example Response
---------------------
{
  "owner": "Anthony Illuzzi",
  "current_role": {
    "company": "SAP",
    "role": "Senior Analytics Architect, Product Success",
    "start_date": "2023-08-01"
  },
  "experience_count": 6,
  "project_count": 16,
  "skill_count": 33,
  "skill_categories": [
    {
      "category": "capability",
      "skill_total": 10
    },
    {
      "category": "leadership",
      "skill_total": 5
    }
  ]
}

Note: Response may contain multiple records.

## GET /identity

### Purpose
-------
Returns the architectural identity of the Human Data Product owner.

### Response Structure
| Field                 | Type   | Description                                 |
| --------------------- | ------ | ------------------------------------------- |
| specialization        | string | Primary professional specialization         |
| core_focus_areas      | array  | Key professional focus areas                |
| architectural_pattern | string | Conceptual pattern describing work approach |
| primary_strength      | string | Key professional differentiator             |

### Query Parameters
None

### Example Response
---------------------
{
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
  "architectural_pattern": "Transform fragmented operational data into structured, trusted data products that enable scalable insight, decision intelligence, and enterprise adoption.",
  "primary_strength": "Bridging technical architecture, analytics intelligence, and organizational platform adoption to maximize value from enterprise data ecosystems."
}


## GET /experiences

### Purpose
-------
Returns structured career experience entries.

### Response Structure
| Field         | Type          | Description                     |
| ------------- | ------------- | ------------------------------- |
| experience_id | integer       | Unique experience identifier    |
| company       | string        | Organization name               |
| role          | string        | Job title                       |
| start_date    | string (date) | Role start date                 |
| end_date      | string/null   | Role end date (null if current) |
| domain        | string        | Professional domain             |
| focus_area    | string        | Primary focus areas             |
| impact        | string        | Summary of professional impact  |
| sort_order    | integer       | Ordering for career chronology  |

### Query Parameters
None

### Example Response
---------------------
[
  {
    "experience_id": 999,
    "company": "Personal",
    "role": "Independent / Side Projects",
    "start_date": "2025-01-01",
    "end_date": null,
    "domain": "Data Products / Portfolio Engineering",
    "focus_area": "Building public-facing demonstrations of data platform + product thinking (API, SQL, governance, insights)",
    "impact": "Created portfolio-grade artifacts that demonstrate end-to-end data product architecture and consumption patterns.",
    "sort_order": 0
  },
  {
    "experience_id": 1,
    "company": "SAP",
    "role": "Senior Analytics Architect, Product Success",
    "start_date": "2023-08-01",
    "end_date": null,
    "domain": "Enterprise Data Platforms",
    "focus_area": "Analytics architecture, platform enablement, governance, product intelligence",
    "impact": "Improved scalability and adoption through accelerators, self-service analytics, metadata governance, and data-driven roadmap execution.",
    "sort_order": 1
  }
]

Note: Response may contain multiple records.

## GET /projects

### Purpose
-------
Returns all projects associated with the Human Data Product.

### Response Structure
| Field         | Type        | Description                     |
| ------------- | ----------- | ------------------------------- |
| project_id    | integer     | Unique project identifier       |
| experience_id | integer     | Associated experience record    |
| name          | string      | Project title                   |
| domain        | string      | Project domain or category      |
| value         | string      | Business or technical impact    |
| link          | string/null | Optional project reference link |

### Query Parameters
None

### Example Response
---------------------
[
  {
    "project_id": 1001,
    "experience_id": 1,
    "name": "Deployment Services SKU Separation & Monetization Model",
    "domain": "Platform Strategy / Monetization",
    "value": "Enabled separation of embedded deployment services from product SKUs to unlock scalable partner-led delivery and a new internal monetization model (~$10M annual revenue potential, internal projection).",
    "link": null
  },
  {
    "project_id": 1002,
    "experience_id": 1,
    "name": "Fieldglass Integration Accelerators & Integration Objects",
    "domain": "Integration Enablement",
    "value": "Engineered 7 leading-practice accelerators and introduced 20 integration objects, reducing implementation effort ~10%, saving 50+ hours per deployment, accelerating production migration ~75%, and achieving an 85% usability score.",
    "link": null
  }
]

Note: Response may contain multiple records.

## GET /projects/{project_id}

## Purpose
-------
Returns detailed information about a specific project
including associated skills.

### Example
-------
GET /projects/1001

### Path Parameters
| Parameter  | Type    | Description                                |
| ---------- | ------- | ------------------------------------------ |
| project_id | integer | Unique identifier of the requested project |

### Response Structure
| Field                            | Type        | Description                        |
| ---------------------------------| ----------- | ---------------------------------- |
| project                          | object      | Project details                    |
| project.project_id               | integer     | Project identifier                 |
| project.experience_id            | integer     | Related experience record          |
| project.name                     | string      | Project title                      |
| project.domain                   | string      | Project domain                     |
| project.value                    | string      | Project description and impact     |
| project.link                     | string/null | Optional reference link            |
| associated_skills                | array       | Skills associated with the project |
| associated_skills.skill_id       | integer     | Skill identifier                   |
| associated_skills.skill_name     | string      | Skill name                         |
| associated_skills.category       | string      | Skill category                     |
| associated_skills.level          | string      | Skill proficiency level            |

### Query Parameters
None

### Example Response
--------------------
[
  {
    "project_id": 1001,
    "experience_id": 1,
    "name": "Deployment Services SKU Separation & Monetization Model",
    "domain": "Platform Strategy / Monetization",
    "value": "Enabled separation of embedded deployment services from product SKUs to unlock scalable partner-led delivery and a new internal monetization model (~$10M annual revenue potential, internal projection).",
    "link": null
  }
]

Note: Response may contain multiple records.

## GET /skills

### Purpose
-------
Returns all skills associated with the Human Data Product.

### Example
GET /skills?category=architecture

### Response Structure
| Field      | Type    | Description                   |
| ---------- | ------- | ----------------------------- |
| skill_id   | integer | Unique skill identifier       |
| category   | string  | Skill classification category |
| skill_name | string  | Skill name                    |
| level      | string  | Skill proficiency level       |

### Query Parameters
| Parameter | Type   | Description                                                 |
| --------- | ------ | ----------------------------------------------------------- |
| category  | string | Optional filter returning skills within a specific category |

### Example Response
---------------
[
  {
    "skill_id": 5,
    "category": "architecture",
    "skill_name": "Metadata Architecture",
    "level": "advanced"
  },
  {
    "skill_id": 17,
    "category": "architecture",
    "skill_name": "Semantic Modeling",
    "level": "advanced"
  }
]

Note: Response may contain multiple records.

## GET /search/projects?q={keyword}

## Purpose
-------
Searches projects by keyword.

Example
-------
GET /search/projects?q=analytics

### Response Structure
| Field         | Type        | Description                |
| ------------- | ----------- | -------------------------- |
| project_id    | integer     | Unique project identifier  |
| experience_id | integer     | Related experience entry   |
| name          | string      | Project title              |
| domain        | string      | Project domain             |
| value         | string      | Project impact description |
| link          | string/null | Optional reference link    |

### Query Parameters
| Parameter | Type   | Required | Description                                           |
| --------- | ------ | -------- | ----------------------------------------------------- |
| q         | string | Yes      | Keyword used to search project name, domain, or value |

### Example Response
----------------
[
  {
    "project_id": 1001,
    "experience_id": 1,
    "name": "Deployment Services SKU Separation & Monetization Model",
    "domain": "Platform Strategy / Monetization",
    "value": "Enabled separation of embedded deployment services from product SKUs to unlock scalable partner-led delivery and a new internal monetization model (~$10M annual revenue potential, internal projection).",
    "link": null
  },
  {
    "project_id": 1002,
    "experience_id": 1,
    "name": "Fieldglass Integration Accelerators & Integration Objects",
    "domain": "Integration Enablement",
    "value": "Engineered 7 leading-practice accelerators and introduced 20 integration objects, reducing implementation effort ~10%, saving 50+ hours per deployment, accelerating production migration ~75%, and achieving an 85% usability score.",
    "link": null
  },
  {
    "project_id": 1003,
    "experience_id": 1,
    "name": "Adoption Analytics Reporting Redesign",
    "domain": "Product Analytics",
    "value": "Redesigned Adoption Analytics reporting and expanded configuration coverage by 42% to enable scalable self-service insights and reduce reliance on manual analysis.",
    "link": null
  }
]

Note: Response may contain multiple records.

## GET /role-preferences

### Purpose
-------
Returns structured role preferences for future opportunities, including
dimension, category, value, and priority.

### Response Structure
| Field         | Type   | Description                              |
| ------------- | ------ | ---------------------------------------- |
| preference_id | integer| Unique role preference identifier        |
| dimension     | string | Preference dimension                     |
| category      | string | Preference grouping within the dimension |
| value         | string | Preferred value                          |
| priority      | string | Preference priority level                |

### Query Parameters
| Parameter | Type   | Description                                           |
| --------- | ------ | ----------------------------------------------------- |
| dimension | string | Optional filter for a specific preference dimension   |
| category  | string | Optional filter for a specific preference category    |
| priority  | string | Optional filter for a specific priority level         |

### Example Response
---------------------
[
  {
    "preference_id": 1,
    "dimension": "work_mode",
    "category": "flexibility",
    "value": "Remote",
    "priority": "high"
  },
  {
    "preference_id": 2,
    "dimension": "compensation",
    "category": "target_range",
    "value": "$200K+",
    "priority": "high"
  }
]

Note: Response may contain multiple records.

## GET /target-opportunity

### Purpose
-------
Returns the synthesized target opportunity profile for the next best-fit role.

### Response Structure
| Field                  | Type   | Description                                     |
| ---------------------- | ------ | ----------------------------------------------- |
| summary                | string | Narrative summary of target opportunity         |
| target_role_types      | array  | Preferred role types                            |
| target_career_levels   | array  | Preferred career levels                         |
| preferred_work_modes   | array  | Preferred work arrangements                     |
| focus_areas            | array  | Preferred functional or domain focus areas      |
| preferred_locations    | array  | Preferred geographies                           |
| leadership_preference  | array  | Leadership preference statements                |
| travel_max             | string | Maximum desired travel expectation              |

### Query Parameters
None

### Example Response
---------------------
{
  "summary": "Targeting senior platform, analytics, or data architecture roles with strong flexibility, high compensation, and manageable workload.",
  "target_role_types": [
    "Data Platform Architect",
    "Analytics Architect",
    "Solution Data Architect"
  ],
  "target_career_levels": [
    "Senior",
    "Principal",
    "Staff"
  ],
  "preferred_work_modes": [
    "Remote",
    "Hybrid"
  ],
  "focus_areas": [
    "Platform",
    "Analytics",
    "Data"
  ],
  "preferred_locations": [
    "Remote",
    "Chicago"
  ],
  "leadership_preference": [
    "Strategic individual contributor",
    "Small team leadership"
  ],
  "travel_max": "Low to moderate"
}

## GET /analytics/career-timeline

## Purpose
-------
Returns structured experience records formatted for timeline-style visualization of career progression.

### Response Structure
| Field         | Type          | Description                    |
| ------------- | ------------- | ------------------------------ |
| experience_id | integer       | Unique experience identifier   |
| company       | string        | Organization name              |
| role          | string        | Role title                     |
| start_date    | string (date) | Role start date                |
| end_date      | string/null   | Role end date, null if current |
| sort_order    | integer       | Ordered career sequence        |

### Query Parameters
None

### Example Response
---------------------
[
  {
    "experience_id": 999,
    "company": "Personal",
    "role": "Independent / Side Projects",
    "start_date": "2025-01-01",
    "end_date": null,
    "sort_order": 0
  },
  {
    "experience_id": 1,
    "company": "SAP",
    "role": "Senior Analytics Architect, Product Success",
    "start_date": "2023-08-01",
    "end_date": null,
    "sort_order": 1
  }
]

### Notes
- Intended for timeline or career progression visualizations.
- Ordered by sort_order ascending.

## GET /analytics/skill-utilization

## Purpose
-------
Returns skill usage metrics showing how frequently each skill is associated with projects.

### Response Structure

| Field         | Type    | Description                               |
| ------------- | ------- | ----------------------------------------- |
| skill_id      | integer | Unique skill identifier                   |
| skill_name    | string  | Skill name                                |
| category      | string  | Skill category                            |
| level         | string  | Skill proficiency level                   |
| project_count | integer | Number of linked projects using the skill |

### Query Parameters
None

### Example Response
---------------------
[
  {
    "skill_id": 1,
    "skill_name": "SQL",
    "category": "data",
    "level": "advanced",
    "project_count": 6
  },
  {
    "skill_id": 21,
    "skill_name": "Systems Thinking",
    "category": "capability",
    "level": "advanced",
    "project_count": 4
  }
]

### Notes
- Useful for bar charts, ranking tables, or “most applied skills” cards.
- project_count is derived from project_skill relationships.

## GET /analytics/skill-projects/{skill_id}

### Purpose
-------
Returns projects associated with a specific skill to support drilldown
from skill utilization views.

### Example
-------
GET /analytics/skill-projects/5

### Path Parameters
| Parameter | Type    | Description                              |
| --------- | ------- | ---------------------------------------- |
| skill_id  | integer | Unique identifier of the requested skill |

### Response Structure
| Field                 | Type    | Description                               |
| --------------------- | ------- | ----------------------------------------- |
| skill_id              | integer | Skill identifier                          |
| skill_name            | string  | Skill name                                |
| project_count         | integer | Total number of related projects          |
| projects              | array   | Projects associated with the skill        |
| projects.project_id   | integer | Unique project identifier                 |
| projects.name         | string  | Project title                             |
| projects.domain       | string  | Project domain                            |
| projects.value        | string  | Project impact description                |
| projects.experience_id| integer | Related experience record                 |

### Query Parameters
None

### Example Response
---------------------
{
  "skill_id": 5,
  "skill_name": "Metadata Architecture",
  "project_count": 2,
  "projects": [
    {
      "project_id": 1003,
      "name": "Metadata Governance Framework",
      "domain": "Governance / Architecture",
      "value": "Defined metadata structures and governance patterns to improve analytics scalability and consistency.",
      "experience_id": 1
    },
    {
      "project_id": 1011,
      "name": "Semantic Model Enablement",
      "domain": "Analytics Architecture",
      "value": "Improved downstream reporting and trust through structured semantic modeling patterns.",
      "experience_id": 2
    }
  ]
}

## GET /analytics/feedback-themes

## Purpose
-------
Returns grouped feedback theme counts for qualitative pattern analysis.

### Example
-------
GET /analytics/feedback-themes
GET /analytics/feedback-themes?source_type=manager
GET /analytics/feedback-themes?entity_type=experience
GET /analytics/feedback-themes?source_type=peer&entity_type=experience

### Response Structure

| Field          | Type    | Description                              |
| -------------- | ------- | ---------------------------------------- |
| theme          | string  | Feedback theme                           |
| feedback_count | integer | Number of feedback entries in that theme |

### Query Parameters
| Parameter   | Type   | Required | Description                                                                   |
| ----------- | ------ | -------- | ----------------------------------------------------------------------------- |
| source_type | string | No       | Optional filter for feedback source, such as `peer`, `manager`, or `linkedin` |
| entity_type | string | No       | Optional filter for related entity type, such as `experience` or `education`  |

### Example Response
---------------------
[
  {
    "theme": "collaboration",
    "feedback_count": 3
  },
  {
    "theme": "leadership",
    "feedback_count": 3
  },
  {
    "theme": "execution",
    "feedback_count": 2
  }
]

### Notes
- Useful for bar charts, donut charts, or filterable feedback analysis.
- Supports optional filtering by source_type and entity_type.

## GET /analytics/feedback-theme-details/{theme}

### Purpose
-------
Returns detailed feedback entries for a specific feedback theme.

### Example
-------
GET /analytics/feedback-theme-details/communication

### Path Parameters
| Parameter | Type   | Description                           |
| --------- | ------ | ------------------------------------- |
| theme     | string | Feedback theme to retrieve in detail  |

### Response Structure
| Field               | Type   | Description                                  |
| ------------------- | ------ | -------------------------------------------- |
| theme               | string | Requested feedback theme                     |
| entries             | array  | Matching feedback entries                    |
| entries.source_type | string | Source classification for the feedback entry |
| entries.entity_type | string | Entity type associated with the feedback     |
| entries.entity_id   | integer| Identifier of the associated entity          |
| entries.quote       | string | Detailed feedback quote or statement         |

### Query Parameters
None

### Example Response
---------------------
{
  "theme": "communication",
  "entries": [
    {
      "source_type": "peer_feedback",
      "entity_type": "experience",
      "entity_id": 1,
      "quote": "Consistently translates complex concepts into actionable guidance."
    },
    {
      "source_type": "manager_feedback",
      "entity_type": "project",
      "entity_id": 1005,
      "quote": "Strong communicator across technical and business stakeholders."
    }
  ]
}

## GET /analytics/projects-by-domain

## Purpose
-------
Returns project counts grouped by domain for domain concentration analysis.

### Response Structure

| Field         | Type    | Description                       |
| ------------- | ------- | --------------------------------- |
| domain        | string  | Project domain or category        |
| project_count | integer | Number of projects in that domain |

### Query Parameters
None

### Example Response
---------------------
[
  {
    "domain": "Platform Strategy / Monetization",
    "project_count": 1
  },
  {
    "domain": "Integration Enablement",
    "project_count": 1
  },
  {
    "domain": "Product Analytics",
    "project_count": 1
  }
]

### Notes
- Useful for domain distribution charts.
- Helps identify concentration of work across project areas.

## GET /analytics/projects-by-experience

## Purpose
-------
Returns project counts grouped by experience record to show how project activity maps across career roles.

### Response Structure

| Field         | Type    | Description                                       |
| ------------- | ------- | ------------------------------------------------- |
| experience_id | integer | Unique experience identifier                      |
| company       | string  | Organization name                                 |
| role          | string  | Role title                                        |
| project_count | integer | Number of projects tied to that experience record |

### Query Parameters
None

### Example Response
---------------------
[
  {
    "experience_id": 999,
    "company": "Personal",
    "role": "Independent / Side Projects",
    "project_count": 2
  },
  {
    "experience_id": 1,
    "company": "SAP",
    "role": "Senior Analytics Architect, Product Success",
    "project_count": 8
  }
]

### Notes
- Useful for comparing project density across roles.
- Supports “projects by role” or “experience contribution” visualizations.

## GET /analytics/experience-projects/{experience_id}

### Purpose
-------
Returns projects associated with a specific experience record to support
drilldown from projects-by-experience views.

### Example
-------
GET /analytics/experience-projects/1

### Path Parameters
| Parameter     | Type    | Description                                   |
| ------------- | ------- | --------------------------------------------- |
| experience_id | integer | Unique identifier of the requested experience |

### Response Structure
| Field                  | Type    | Description                              |
| ---------------------- | ------- | ---------------------------------------- |
| experience_id          | integer | Experience identifier                    |
| company                | string  | Organization name                        |
| role                   | string  | Role title                               |
| project_count          | integer | Total number of related projects         |
| projects               | array   | Projects associated with the experience  |
| projects.project_id    | integer | Unique project identifier                |
| projects.name          | string  | Project title                            |
| projects.domain        | string  | Project domain                           |
| projects.value         | string  | Project impact description               |
| projects.link          | string/null | Optional reference link             |

### Query Parameters
None

### Example Response
---------------------
{
  "experience_id": 1,
  "company": "SAP",
  "role": "Senior Analytics Architect, Product Success",
  "project_count": 3,
  "projects": [
    {
      "project_id": 1001,
      "name": "Deployment Services SKU Separation & Monetization Model",
      "domain": "Platform Strategy / Monetization",
      "value": "Enabled separation of embedded deployment services from product SKUs to unlock scalable partner-led delivery and a new internal monetization model.",
      "link": null
    },
    {
      "project_id": 1002,
      "name": "Fieldglass Integration Accelerators & Integration Objects",
      "domain": "Integration Enablement",
      "value": "Engineered accelerators and integration objects to reduce implementation effort and speed deployment migration.",
      "link": null
    }
  ]
}

## GET /insights

## Purpose
-------
Returns curated analytics and narrative insight cards derived from the Human Data Product.

### Response Structure

| Field   | Type   | Description                         |
| ------- | ------ | ----------------------------------- |
| id      | string | Unique insight identifier           |
| title   | string | Insight card title                  |
| type    | string | Insight classification              |
| summary | string | Short high-level insight statement  |
| detail  | string | Expanded explanation of the insight |

### Query Parameters
None

### Example Response
[
  {
    "id": "architect_operator",
    "title": "Architect + Operator",
    "type": "insight",
    "summary": "Combines architectural thinking with practical execution and delivery.",
    "detail": "Project history and capability mix show repeated platform design, enablement, analytics, and execution-oriented outcomes rather than abstract architecture alone."
  },
  {
    "id": "complexity_translator",
    "title": "Complexity Translator",
    "type": "insight",
    "summary": "Strength lies in turning complex systems, requests, and data into structured, understandable paths.",
    "detail": "Architecture, systems thinking, semantic modeling, and stakeholder-oriented capabilities collectively point to an ability to translate ambiguity into action."
  }
]

### Notes
- Intended for insight cards in the frontend.
- Cards are currently curated/derived in the transformation layer and exposed through the API.
- This endpoint is designed for human-friendly consumption rather than raw entity retrieval.
