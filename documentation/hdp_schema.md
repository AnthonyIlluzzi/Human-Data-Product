# Human Data Product Schema

This Markdown file is now an abbreviated repository reference only.

The branded HTML schema documentation is the source of truth going forward.

## Primary documentation

Use the HTML version for the current and maintained schema documentation:

- Frontend branded documentation: `/frontend/documentation/hdp_schema.html`
- Live application documentation: open the schema documentation from the Human Data Product frontend

## Documentation ownership

Going forward:
- HTML documentation is the maintained source of truth
- this Markdown file is intentionally abbreviated
- table definitions, relationships, and schema updates should be made in the HTML documentation only

## Current schema summary

The Human Data Product is built on a normalized data model rather than a flat resume structure.

The schema includes core entity groups such as:
- product metadata
- identity and contact information
- experience
- education and credentials
- projects
- skills
- project-skill relationships
- feedback
- role preferences
- derived analytics support structures

## Capability model integration

The embedded Capability Insights experience is now supported directly inside the Human Data Product data model.

Two important schema areas now support this capability model:

### `skills_domain`
Represents normalized capability-domain groupings.

Typical fields include:
- `domain_id`
- `domain`
- `sort_order`
- `summary`

### `skill`
Represents normalized skill records aligned to the integrated capability model.

Typical fields include:
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

### `project_skill`
Represents the relationship between projects and skills.

Typical fields include:
- `project_id`
- `skill_id`

## Source of truth policy

If this Markdown file and the HTML documentation ever differ, treat the HTML documentation as correct.

## Maintainer note

This file exists to:
- provide a lightweight schema reference in GitHub
- direct readers to the branded schema documentation
- avoid maintaining duplicate full schema definitions in two places
