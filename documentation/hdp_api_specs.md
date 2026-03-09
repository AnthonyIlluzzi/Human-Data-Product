# Human Data Product API
http://127.0.0.1:8000/docs

## Overview
--------
This API exposes curated professional data representing Anthony Illuzzi's
Human Data Product. It allows consumers to query experience, projects,
skills, and architectural identity through structured endpoints.

### Base URL
--------
http://localhost:8000

### Endpoint List
--------
- GET /health
- GET /summary
- GET /identity
- GET /experience
- GET /projects
- GET /projects/{project_id}
- GET /skills
- GET /search/projects

### Data Model Overview
| Entity         | Description                                           |
| -------------- | ----------------------------------------------------- |
| Experience     | Career roles and professional positions               |
| Projects       | Key initiatives and deliverables tied to experience   |
| Skills         | Technical, architectural, and leadership capabilities |
| Project_Skills | Many-to-many relationship between projects and skills |

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
----------------
{
  "status": "ok",
  "service": "human-data-product-api"
}

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
----------------
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
----------------
{
  "specialization": "Enterprise Data Platforms & Analytics Enablement",
  "core_focus_areas": [
    "Data platform architecture",
    "Analytics enablement & product intelligence",
    "Self-service analytics and configuration scalability",
    "Metadata modeling and governance frameworks",
    "Platform adoption and value realization"
  ],
  "architectural_pattern": "Transform fragmented operational data into structured, trusted data products that enable scalable insight, decision intelligence, and enterprise adoption.",
  "primary_strength": "Bridging technical architecture, analytics intelligence, and organizational platform adoption to maximize value from enterprise data ecosystems."
}


## GET /experience

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
----------------
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
| Field                 | Type        | Description                        |
| --------------------- | ----------- | ---------------------------------- |
| project               | object      | Project details                    |
| project.project_id    | integer     | Project identifier                 |
| project.experience_id | integer     | Related experience record          |
| project.name          | string      | Project title                      |
| project.domain        | string      | Project domain                     |
| project.value         | string      | Project description and impact     |
| project.link          | string/null | Optional reference link            |
| skills                | array       | Skills associated with the project |
| skills.skill_id       | integer     | Skill identifier                   |
| skills.skill_name     | string      | Skill name                         |
| skills.category       | string      | Skill category                     |
| skills.level          | string      | Skill proficiency level            |

### Query Parameters
None

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
