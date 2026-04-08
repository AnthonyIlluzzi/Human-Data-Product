# Human Data Product

Human Data Product is a portfolio asset that models a professional profile as a structured data product rather than a traditional resume.

It is designed to demonstrate how professional experience, skills, projects, feedback, and preferences can be represented as queryable, API-accessible, and insight-ready data.

**Live application**  
https://human-data-product-web.onrender.com/

## Overview

This project presents a professional identity as a working data product with multiple output ports:

- Overview page for product framing and metadata
- SQL Workspace for read-only exploration of the dataset
- API Workspace for endpoint-based access to the product data
- Insights Workspace for derived visual insights

The Human Data Product is intended to show how professional information can be structured with the same principles used in modern data platforms and data products:

- normalized source data
- governed schema
- documented interfaces
- analytical outputs
- reusable downstream consumption patterns

## Current product structure

The current application includes these main areas.

### 1. Overview

Introduces the Human Data Product concept, product framing, summary metadata, documentation access, and supporting context.

### 2. SQL Workspace

Provides a read-only SQL interface over the underlying dataset for direct structured exploration.

### 3. API Workspace

Provides documented endpoint access to the Human Data Product backend.

### 4. Insights Workspace

Provides derived visual outputs across three tabs:

- Value Insights
- Capability Insights
- Opportunity Insights

## Capability Insights

Capability Insights is now integrated directly into the Human Data Product as the second tab in the Insights Workspace.

This tab embeds the capability and skill model directly into HDP rather than linking out to a standalone experience.

Capability Insights includes:

- Capability Profile by Domain
- Domain Distribution
- domain drilldown into Skill Matrix
- Focus View filtering within the matrix
- Skill Inventory Table modal
- capability-oriented helper tooltips and hover interactions

The capability model is driven by normalized domain and skill records in the HDP source dataset.

## Core design principle

This project is built around a simple idea:

A professional profile can be treated like a data product.

Instead of presenting information only as static narrative, the Human Data Product organizes professional data into structured entities that can be:

- queried
- joined
- documented
- visualized
- analyzed through multiple interfaces

## Repository structure

```
Human-Data-Product/
|-- backend/
|-- data/
|-- documentation/
|-- frontend/
\-- README.md
```

## Key directories

### `backend/`

Backend service and data access logic for the Human Data Product.

Typical responsibilities include:

- API routing
- query execution
- derived analytics payloads
- dataset loading and validation

---

### `data/`

Source dataset used to populate the Human Data Product.

This includes normalized records such as:

- experience
- project
- skill
- skills_domain
- project_skill
- feedback
- role_preference
- metadata and supporting entities

---

### `frontend/`

Static frontend application for the Human Data Product.

Typical files include:

- `index.html`
- `styles.css`
- `app.js`
- branded documentation pages under `frontend/documentation/`

---

### `documentation/`

Repository-level supporting documentation.

Going forward, this folder should be treated as abbreviated repository documentation. The branded HTML documentation under `frontend/documentation/` is the user-facing documentation surface and source of truth.

---

## Data model highlights

The Human Data Product uses normalized source data rather than a flat resume-style structure.

Examples of core entities include:

- `experience`
- `project`
- `skill`
- `skills_domain`
- `project_skill`
- `feedback`
- `role_preference`

---

## Capability model entities

The integrated capability model is centered on two key entities.

### `skills_domain`

Represents the domain grouping used by Capability Insights.

Example fields:

- `domain_id`
- `domain`
- `sort_order`
- `summary`

### `skill`

Represents normalized skill records aligned to the capability model.

Example fields:

- `skill_id`
- `skill_name`
- `skill_ref`
- `domain_id`
- `display_order`
- `depth`
- `experience`
- `confidence`
- `notes`
- `source_origin`

These records support both analytical API outputs and the embedded Capability Insights experience.

---

## API overview

The backend exposes endpoints for both core entity retrieval and analytical views.

Examples include:

- `/summary`
- `/identity`
- `/product-metadata`
- `/experiences`
- `/projects`
- `/skills`
- `/skill-domains`
- `/analytics/value-insights-dashboard`
- `/analytics/capability-insights-dashboard`
- `/analytics/opportunity-insights-dashboard`

The API is intended to support both direct exploration and frontend rendering.

---

## Documentation strategy

The project includes both abbreviated Markdown documentation and branded HTML documentation.

Going forward, documentation will be maintained using the following model:

- `frontend/documentation/*.html` is the source of truth
- `README.md` is the repository entry point
- `documentation/*.md` is intentionally abbreviated and exists only as lightweight repository reference

This avoids maintaining the same full documentation in multiple places.

---

## User-facing documentation

The primary user-facing documentation lives in the branded HTML files under:

- `frontend/documentation/hdp_api_specs.html`
- `frontend/documentation/hdp_schema.html`

These HTML files should be updated whenever the product documentation changes.

---

## Product intent

This is not intended to be a generic portfolio site.

It is a productized demonstration of:

- data modeling
- information design
- analytical framing
- structured professional storytelling
- API and query accessibility
- data product oriented thinking

---

## Author

Anthony Illuzzi  
Data & Analytics Architect  

Focused on designing systems that turn complex information into structured, consumable products.
