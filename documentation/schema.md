Tables

experience
•	experience_id (PK)
•	company
•	role
•	start_date
•	end_date
•	domain
•	focus_area
•	impact
•	sort_order

project
•	project_id (PK)
•	experience_id
•	name
•	domain
•	value
•	link

skill
•	skill_id (PK)
•	category
•	skill
•	level

project_skill
•	project_id (FK → projects.project_id)
•	skill_id (FK → skills.skill_id)
•	PRIMARY KEY (project_id, skill_id)

principle
•	principle_id (PK)
•	principle_desc
•	sort_order

contact_info
•	contact_id (PK)
•	category
•	value
•	sort_order
•	is_public (boolean)

product_metadata
•	key (PK)
•	value
