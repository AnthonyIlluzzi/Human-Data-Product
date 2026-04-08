# Human Data Product API Specifications

This Markdown file is now an abbreviated repository reference only.

The branded HTML API documentation is the source of truth going forward.

## Primary documentation

Use the HTML version for the current and maintained API documentation:

- Frontend branded documentation: `/frontend/documentation/hdp_api_specs.html`
- Live application documentation: open the API documentation from the Human Data Product frontend

## Documentation ownership

Going forward:
- HTML documentation is the maintained source of truth
- this Markdown file is intentionally abbreviated
- endpoint additions, response shape changes, and schema updates should be made in the HTML documentation only

## Current API scope summary

The Human Data Product backend exposes endpoints across four major areas:

### 1. System and metadata
Examples:
- `/health`
- `/summary`
- `/product-metadata`
- `/identity`

### 2. Core data retrieval
Examples:
- `/experiences`
- `/projects`
- `/projects/{project_id}`
- `/skills`
- `/skill-domains`
- `/feedback`
- `/role-preferences`

### 3. Analytical outputs
Examples:
- `/analytics/career-timeline`
- `/analytics/skill-utilization`
- `/analytics/projects-by-experience`
- `/analytics/feedback-themes`
- `/analytics/value-insights-dashboard`
- `/analytics/capability-insights-dashboard`
- `/analytics/opportunity-insights-dashboard`

### 4. Drilldown and supporting analytics
Examples:
- `/analytics/skill-projects/{skill_id}`
- `/analytics/experience-projects/{experience_id}`
- `/analytics/feedback-theme-details/{theme}`
- `/analytics/skill-cooccurrence`

## Capability Insights note

Capability Insights is now integrated directly into the Human Data Product Insights Workspace.

The backend now supports normalized capability-domain and skill-model retrieval through endpoints such as:
- `/skills`
- `/skill-domains`
- `/analytics/capability-insights-dashboard`

## Source of truth policy

If this Markdown file and the HTML documentation ever differ, treat the HTML documentation as correct.

## Maintainer note

This file exists to:
- help repository visitors understand where the live API documentation lives
- provide a lightweight summary in GitHub
- avoid maintaining duplicate full API specifications in two places
