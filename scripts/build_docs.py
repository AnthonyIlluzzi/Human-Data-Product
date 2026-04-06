from pathlib import Path
import shutil
import re
import html
import mistune

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DOCS = ROOT / "documentation"
FRONTEND_DOCS = ROOT / "frontend" / "documentation"
FRONTEND_DOCS.mkdir(parents=True, exist_ok=True)

IMAGES_SRC = SOURCE_DOCS / "images"
IMAGES_DEST = FRONTEND_DOCS / "images"
IMAGES_DEST.mkdir(parents=True, exist_ok=True)

markdown = mistune.create_markdown(plugins=["table"])

DOCS = [
    {
        "source": SOURCE_DOCS / "human_data_product_contract.md",
        "target": FRONTEND_DOCS / "human_data_product_contract.html",
        "title": "Human Data Product Contract",
        "eyebrow": "Overview Documentation",
        "description": "Contract definition for the Human Data Product.",
    },
    {
        "source": SOURCE_DOCS / "hdp_schema.md",
        "target": FRONTEND_DOCS / "hdp_schema.html",
        "title": "Human Data Product Schema",
        "eyebrow": "SQL Workspace Documentation",
        "description": "Schema, relationships, and entity-level design for the Human Data Product.",
    },
    {
        "source": SOURCE_DOCS / "hdp_api_specs.md",
        "target": FRONTEND_DOCS / "hdp_api_specs.html",
        "title": "Human Data Product API Specs",
        "eyebrow": "API Workspace Documentation",
        "description": "REST endpoint definitions and response guidance for the Human Data Product API.",
    },
]

DOC_CSS = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <link rel="stylesheet" href="./hdp-docs.css" />
</head>
<body>
  <div class="doc-shell">
    <header class="doc-topbar">
      <a class="doc-back-link" href="../index.html">← Back to Human Data Product</a>
    </header>

    <main class="doc-page">
      <section class="doc-hero">
        <div class="doc-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p class="doc-description">{description}</p>
      </section>

      <article class="doc-content">
        {content}
      </article>
    </main>
  </div>
</body>
</html>
"""

def normalize_content(html_content: str) -> str:
    html_content = html_content.replace(
        'src="images/',
        'src="./images/'
    )

    html_content = re.sub(
        r'<pre><code class="language-mermaid">',
        '<div class="doc-note"><strong>Inline ERD source</strong><p>Mermaid source retained below for reference.</p></div><pre><code class="language-mermaid">',
        html_content
    )

    html_content = re.sub(
        r"<hr ?/?>",
        '<div class="doc-section-divider"></div>',
        html_content,
        flags=re.IGNORECASE,
    )

    return html_content

def build_css() -> None:
    css = """
:root {
  --bg: #f5f7fb;
  --surface: #ffffff;
  --surface-alt: #f8fbff;
  --border: #dfe7f1;
  --text: #16202d;
  --muted: #5c6f82;
  --primary: #2c6db8;
  --primary-dark: #1c4e86;
  --code-bg: #0f1722;
  --code-text: #e9f1fb;
  --shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: linear-gradient(180deg, #f7f9fc 0%, #f2f6fb 100%);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.6;
}

a {
  color: var(--primary-dark);
}

.doc-shell {
  min-height: 100vh;
  padding: 24px 18px 40px;
}

.doc-topbar,
.doc-page {
  width: min(1080px, 100%);
  margin: 0 auto;
}

.doc-topbar {
  margin-bottom: 16px;
}

.doc-back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255,255,255,0.86);
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.doc-hero,
.doc-content {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow);
}

.doc-hero {
  padding: 24px 24px 20px;
  margin-bottom: 18px;
  background: linear-gradient(180deg, #fbfdff 0%, #f4f8fd 100%);
}

.doc-eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary-dark);
  margin-bottom: 8px;
}

.doc-hero h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  line-height: 1.1;
}

.doc-description {
  margin: 10px 0 0;
  color: var(--muted);
  max-width: 70ch;
}

.doc-content {
  padding: 26px 24px;
  overflow-x: auto;
}

.doc-content h1:first-child {
  display: none;
}

.doc-content h2,
.doc-content h3,
.doc-content h4 {
  scroll-margin-top: 24px;
}

.doc-content h2 {
  margin-top: 30px;
  margin-bottom: 10px;
  font-size: 1.45rem;
  color: var(--primary-dark);
}

.doc-content h3 {
  margin-top: 24px;
  margin-bottom: 8px;
  font-size: 1.15rem;
}

.doc-content h4 {
  margin-top: 18px;
  margin-bottom: 6px;
  font-size: 1rem;
}

.doc-content p,
.doc-content ul,
.doc-content ol {
  margin-top: 0;
  margin-bottom: 14px;
}

.doc-content ul,
.doc-content ol {
  padding-left: 22px;
}

.doc-content li + li {
  margin-top: 4px;
}

.doc-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 14px 0 20px;
  font-size: 0.95rem;
  min-width: 720px;
}

.doc-content th,
.doc-content td {
  padding: 10px 12px;
  border: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}

.doc-content th {
  background: #eef4fb;
  color: var(--primary-dark);
  font-weight: 700;
}

.doc-content tbody tr:nth-child(even) {
  background: #fbfdff;
}

.doc-content pre {
  margin: 16px 0 22px;
  padding: 16px;
  overflow-x: auto;
  border-radius: 14px;
  background: var(--code-bg);
  color: var(--code-text);
}

.doc-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.doc-content :not(pre) > code {
  background: #eef4fb;
  color: var(--primary-dark);
  padding: 2px 6px;
  border-radius: 8px;
}

.doc-content img {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 18px 0 22px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-alt);
}

.doc-note {
  margin: 14px 0 10px;
  padding: 12px 14px;
  border: 1px solid #d7e7fb;
  border-radius: 14px;
  background: #f4f8fd;
}

.doc-note strong {
  display: block;
  margin-bottom: 4px;
  color: var(--primary-dark);
}

.doc-note p {
  margin: 0;
  color: var(--muted);
}

.doc-section-divider {
  height: 1px;
  margin: 28px 0;
  background: linear-gradient(90deg, rgba(44,109,184,0) 0%, rgba(44,109,184,0.35) 50%, rgba(44,109,184,0) 100%);
}

blockquote {
  margin: 18px 0;
  padding: 12px 16px;
  border-left: 4px solid #9cc0eb;
  background: #f7fbff;
  color: var(--muted);
}

@media (max-width: 768px) {
  .doc-shell {
    padding: 16px 12px 28px;
  }

  .doc-hero,
  .doc-content {
    padding: 18px 16px;
    border-radius: 16px;
  }

  .doc-content table {
    min-width: 640px;
  }
}
"""
    (FRONTEND_DOCS / "hdp-docs.css").write_text(css.strip() + "\n", encoding="utf-8")

def build_doc(source: Path, target: Path, title: str, eyebrow: str, description: str) -> None:
    md_text = source.read_text(encoding="utf-8")
    rendered = markdown(md_text)
    rendered = normalize_content(rendered)

    page = DOC_CSS.format(
        title=html.escape(title),
        eyebrow=html.escape(eyebrow),
        description=html.escape(description),
        content=rendered,
    )

    target.write_text(page, encoding="utf-8")

def copy_assets() -> None:
    svg_name = "Human_Data_Product_ERD_v4.svg"
    source_svg = IMAGES_SRC / svg_name
    dest_svg = IMAGES_DEST / svg_name
    if source_svg.exists():
      shutil.copy2(source_svg, dest_svg)

def main() -> None:
    build_css()
    copy_assets()

    for doc in DOCS:
        build_doc(
            source=doc["source"],
            target=doc["target"],
            title=doc["title"],
            eyebrow=doc["eyebrow"],
            description=doc["description"],
        )

    print("Documentation pages generated in frontend/documentation/")

if __name__ == "__main__":
    main()
