# Human Data Product

This project models my professional career as a **real data product**.

Instead of presenting experience as a static resume, it structures career data into a system that can be **queried, consumed, and explored** — just like modern data platforms used in enterprise environments.

---

## Concept

A traditional resume is static, fragmented, and difficult to interrogate.

This project explores a different idea:

> What if professional experience was treated as structured data — designed for access, interpretation, and reuse?

The Human Data Product transforms career history into a **curated, governed dataset** with defined access patterns and analytical capabilities.

---

## Capabilities

The dataset is exposed through multiple consumption layers:

- **SQL Interface** — query structured experience, projects, and skills  
- **REST API** — access raw and derived data programmatically  
- **Insights Layer** — explore aggregated signals and narrative interpretations  

These interfaces simulate how modern data products are consumed across analytical and operational use cases.

---

## Architecture

Sources → Transformation → Structured Data Model → Consumption Interfaces

- **Source of Truth**: Structured JSON dataset  
- **Data Model**: SQLite relational schema  
- **Backend**: FastAPI service layer  
- **Query Layer**: Read-only SQL execution engine  
- **Frontend**: Interactive UI and workspaces for exploration  

This mirrors real-world data product design patterns, where data is intentionally modeled, exposed, and consumed.

---

## Why This Exists

This project was built to demonstrate how:

- Data product thinking can be applied beyond traditional business datasets  
- Structured data enables deeper understanding than static documents  
- Systems design, not just data, determines usability and value  

It reflects a belief that:

> Information becomes more valuable when it is structured, accessible, and designed for interaction.

---

## Explore the Product

The Human Data Product can be explored through:

- **Overview Workspace** — product metadata and architecture  
- **SQL Workspace** — guided query exploration  
- **API Workspace** — direct endpoint interaction  
- **Insights Workspace** — analytical views and interpretation  

---

## Data Product Contract

The system follows a defined contract for inputs, transformations, and outputs:

- Structured dataset ingestion  
- Deterministic transformation logic  
- Stable access interfaces (API + SQL)  
- Derived analytical outputs

See full contract: /documentation/human_data_product_contract.md

---

## Notes

- The database is **generated dynamically** from the source dataset  
- All transformations are deterministic and reproducible  
- The system is designed to behave as a **real, deployable data product**  

---

## Author

Anthony Illuzzi  
Data & Analytics Architect  

Focused on designing systems that turn complex information into structured, consumable products.
