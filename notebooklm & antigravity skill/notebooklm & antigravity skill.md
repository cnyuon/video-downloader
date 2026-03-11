---
name: Automated SEO Content Engine
description: This skill dictates how to operate as an elite intelligence analyst and engineer, automatically building a comprehensive, gap-filling Astro markdown blog post for any target keyword, leveraging the NotebookLM MCP tools.
---
# Automated SEO Content Engine

This skill dictates how to operate as an elite intelligence analyst and engineer, automatically building a comprehensive, gap-filling Astro markdown blog post for any target keyword, leveraging the NotebookLM MCP tools.

## 🎯 The Goal
Take a raw input (a target keyword, search intent, and raw notes) and transform it into a ready-to-publish, high-ranking Astro markdown file containing:
- A suite of AI-generated Markdown documents (blog draft, gap analysis, FAQ schema).
- Downloaded media artifacts (hero images, diagrams).
- A perfectly formatted Astro `.md` file with strict YAML frontmatter and Tailwind-styled Markdown, organized into the proper language folder.

## ⚡ Trigger Details
Input comes from the following source:
Google Sheets automation: Watching your "Content Pipeline" Google Sheet and triggering when a keyword row is moved to the "Drafting" status.
The input payload should contain at minimum: `target_keyword`. 

## 🔁 Step-By-Step Execution Pipeline

### Phase 0: Agent Pre-Research (Data Enrichment)
Before relying on NotebookLM, the autonomous agent must do its own groundwork to create high-quality "seed data." NotebookLM's outputs are only as good as the sources you feed it — garbage in, garbage out.

#### Step 0.1 - Sythesize Keyword Profile
Take all of that scraped data and put into keyword profile. The document should include:
* target keyword and primary search intent 
* core problems expressed by users in reddit communities
* competitors (the ones ranking on first page)

💡 This profile becomes the foundational "seed" for NotebookLM. It ensures the AI never hallucinates because it starts with verified facts and real community pain points.

#### Step 0.2 - Synthesize Topic Profile
Explicitly state the Search Intent (e.g., Informational, Transactional) and the Content Format (e.g., Listicle, Case Study, How-To) at the very top of the Topic Profile. Check the 

### Phase 1: Notebook Preparation & Initial Ingestion
This phase creates the isolated knowledge brain for this specific target keyword.

#### Step 1.1 — Create Notebook
Create a dedicated NotebookLM instance for the keyword.

mcp: notebook_create
title: “GMT Blog Post Prep - [keyword]”

#### Step 1.2 — Inject Seed Data as Text Source
Inject the synthesized Keyword Profile from Step 0.1.

mcp: source_add
notebook_id: [from step 1.1]
source_type: “text”
title: “[keyword] - GMT Keyword Profile
text: [the synthesized keyword profile from Phase 0 Step 0.1]
wait: true

#### Step 1.3 - Add Scraped URLs as Sources
For each high quality URL found during phase 0, add them individually

mcp: source_add
notebook_id: [from step 1.1]
source_type: “url”
url: “[each URL]”
wait: true

*Add 3-8 of the best URLs. Don’t add more than 10 here - deep research will find more*

### Phase 2: Autonomous Deep Research (NotebookLM Web Search)
This is where NotebookLM's killer feature kicks in — it autonomously searches the web for 40-100+ additional sources focused strictly on the target keyword and the seed data.

#### Step 2.1 — Start Deep Research

mcp: research_start
notebook_id: [from step 1.1]
query: "Comprehensive guide, user pain points, step-by-step tutorials, and competitive landscape for [target_keyword]"
source: "web"
mode: "deep"

Use `mode: "deep"` for exhaustive coverage (takes ~5 minutes, finds 40-100+ sources). Use `mode: "fast"` if speed is critical (takes ~30 seconds, finds ~10 sources).

#### Step 2.2 — Poll Until Complete

mcp: research_status
notebook_id: [from step 1.1]
max_wait: 300

Wait for status: "completed" before proceeding.

#### Step 2.3 — Batch Import Sources (CRITICAL)
If `mode="deep"` returns a large number of sources (40-110+), importing them all at once WILL cause an MCP timeout error. You MUST batch the imports. 

# Import sources 0-19
mcp: research_import
notebook_id: [from step 1.1]
task_id: [from step 2.1]
source_indices: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]

# Import sources 20-39
mcp: research_import
source_indices: [20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39]

# Continue in chunks of 20 until all sources are imported...

If using `mode="fast"`, you can safely omit `source_indices` to import all ~10 sources at once. 
⚠️ Important: Wait a few seconds between each batch to let NotebookLM process the incoming sources.

### Phase 3: Artifact Generation & Extraction
Now the notebook has a rich, comprehensive knowledge base. Use NotebookLM's querying and studio features to generate the output artifacts.

#### Step 3.1 — Adaptive SEO Blog Draft (`01_blog_draft.md`)

Use `notebook_query` with the following dynamic master prompt: 

"You are an elite, human-sounding Technical SEO Content Writer. Read the 'Topic Profile' to identify the `Target Keyword`, `Search Intent`, and `Content Format`. You must write a highly optimized SEO blog post that strictly adapts its structure and tone to match the requested `Content Format`.

**Universal Rules (Apply to ALL formats):**
1. **The Hook:** Start immediately with a punchy sentence hook ideally 2-3 sentances (give or take a few depending on topic) addressing the core user problem. ZERO fluffy introductions (e.g., do not say 'In today's fast-paced digital world...').
2. **Reddit Insights:** Naturally weave in the exact pain points and complaints scraped from the Reddit/community research (Only add if relevant or provided. Optional) 
3. **Product Led Growth:** Naturally position 'GetMediaTools' utilities as the frictionless solution where applicable, without sounding like a spammy ad. 
4. **Sourcing & Citations:** You MUST hyperlink factual claims, data points, and competitor references directly in the text using Markdown links `[anchor text](URL)` pointing to the actual URLs provided in your source documents. 

**Format-Specific Rules (Apply the ONE that matches the requested format):**

* **IF FORMAT IS 'LISTICLE' (or 'Best Tools/Comparison'):**
  - Structure using numbered `##` headers for each item.
  - You MUST include a Markdown Comparison Table near the top summarizing the options (e.g Columns: Tool Name, Best For, Price, Watermark Free?).
  - Keep descriptions punchy and scannable.
  - This is not limited to all listicles, use best judgment on the best way to write the article.

* **IF FORMAT IS 'CASE STUDY' (or 'Data/Research'):**
  - Write from a first-person, analytical perspective (e.g., 'I analyzed over X data points...').
  - You MUST include hard numbers, percentages, and metrics.
  - Insert Markdown tables to visualize the data.
  - Where a visual chart would be highly impactful, insert a specific image placeholder with alt text: `![Chart showing X metric over time](chart_placeholder.png)` so my system knows to generate a static SVG/PNG or interactive chart/graph for it later.

* **IF FORMAT IS 'HOW-TO / TUTORIAL':**
  - Structure using clear, sequential `##` Step 1, Step 2 headers.
  - Keep paragraphs readable and not too long.
  - Focus heavily on the exact, verified technical workflow required to solve the problem.

* **IF FORMAT IS 'NEWS / DEFINITION':**
  - Use an inverted pyramid structure (most important facts first).
  - Include a 'TL;DR' bulleted list immediately after the hook.

Output the final result in clean Markdown, ready for an Astro `.md` file."

Save the output as `01_blog_draft.md`.

#### Step 3.2 — Content Gap Analysis (02_content_gap_analysis.md)
"Analyze the top 3 competitor articles provided in the source documents. Generate a concise summary of the specific content gaps, missing steps, or unanswered questions that the competitors missed, but that we successfully addressed in our blog draft."
Save the output as `02_content_gap_analysis.md`.


#### Step 3.3 — FAQ Schema (03_faq_schema.md)
Use notebook_query with the following prompt:
"Based on the community/Reddit research and the core topic, generate 5-8 flashcard-style Q&A pairs answering the most pressing user questions. Format each pair clearly with a 'Q:' and 'A:' structure."
Save the output as `03_faq_schema.md`.

#### Step 3.4 — Hero Image Generation
Execute the `generate_image` tool to create a high-quality, abstract, digital tech aesthetic Hero image for the blog post based on the target keyword. Do NOT include text in the generated image. 
Once generated (the tool outputs the file to the `/artifacts` or brain directory), you MUST use a bash command (`run_command`) to copy or move it into the project repository at `frontend/src/assets/blog-images/[slug].png`. 
This guarantees the file exists for the YAML frontmatter path: `heroImage: "../../../assets/blog-images/[slug].png"`.

### Phase 4: Index File Generation
Create a `00_INDEX.md` file that acts as a local table of contents and deployment checklist for the specific keyword folder, ensuring all generated `.md` files and images are present before Astro compilation.

# SEO Content Package: [Target Keyword]
**Generated:** [timestamp]
**Search Intent:** [Search Intent]
**Content Format:** [Content Format]

## Generated Artifacts
| # | File | Description |
|---|------|-------------|
| 1 | `01_blog_draft.md` | Adaptive SEO blog draft |
| 2 | `02_content_gap_analysis.md` | Competitor gap analysis |
| 3 | `03_faq_schema.md` | Q&A pairs for accordion |
| 4 | `[slug].md` | Final compiled Astro markdown file |

## Cloud Resources
- **NotebookLM Notebook:** [link to notebook]
- **Research Sources:** [number] web sources analyzed

## Astro Deployment Checklist
- [ ] Verify `[slug].md` has been successfully generated in the target directory (e.g., `src/content/blog/en/`).
- [ ] Check YAML frontmatter for missing metadata (`heroImage`, `description`, etc.).
- [ ] Ensure FAQ Schema renders correctly inside HTML `<details>` and `<summary>` tags at the bottom of the post.
- [ ] Generate or place any static SVG/PNG charts replacing the `![Chart placeholder]` tags.
- [ ] Run `npm run build` locally to verify Markdown compiles successfully.

### Phase 6: Multi-language Translation
Once the English blog post has been successfully generated and compiled in `src/content/blog/en/`, use the Python translation script to automatically generate localized versions for the 9 supported languages (`ar`, `de`, `es`, `fr`, `hi`, `ja`, `ko`, `pt`, `tr`).

#### Step 6.1 — Read Google Translate API Key
Securely read the Google Translate API key using a bash command:
```bash
export GOOGLE_TRANSLATE_API_KEY=$(grep GOOGLE_TRANSLATE_API_KEY frontend/.env | cut -d '=' -f2)
```

#### Step 6.2 — Execute the Translation Script Loop
Run a bash terminal command (`run_command`) to iterate over the 9 target languages and execute the Python script. Ensure you use the exact target language codes:
```bash
for lang in ar de es fr hi ja ko pt tr; do
  python3 frontend/scripts/translate_blogs.py $lang "$GOOGLE_TRANSLATE_API_KEY"
done
```

### Phase 7: Local Review & Final Push
Before pushing to production, pause to let the human verify the work.

#### Step 7.1 — Ask User for Confirmation
Use the `notify_user` tool (or standard chat) to explicitly tell the user: 
*"The English post and all 9 translated versions have been generated. Please navigate to localhost (via `npm run dev`) and visually confirm that the blog post looks right."*

#### Step 7.2 — Commit and Push
Once the human provides an affirmative response, run the git commands to commit all of the newly generated markdown files and translated counterparts, and push them to the repository (which triggers the Cloudflare Pages deployment).

### Phase 8: Constructing the Astro Markdown File
Package all artifacts into the final deployable Astro structure instead of an HTML dashboard.

#### Step 5.1 — Create the Output File & Directory Placement
The final output must be generated as a specific `slug-name.md` file (where the slug is the URL-friendly version of the target keyword). Ensure the file is placed directly into the correct flat language sub-directory within your project (e.g., `src/content/blog/en/`).

#### Step 5.2 — Constructing the YAML Frontmatter
The top of the `.md` file must contain strict Astro YAML frontmatter. It must exactly include the following metadata fields:
- `title`
- `description`
- `pubDate`
- `heroImage`
- `heroAlt`
- `keywords`
- `monetization` metadata

#### Step 5.3 — Body Formatting & Interactive Components
The main body of the blog post must utilize Tailwind-styled Markdown formatting to ensure it compiles correctly.
Do NOT render an HTML dashboard. Instead, naturally append the FAQ Schema (`03_faq_schema.md`) at the absolute bottom of the document. To make this an interactive component within standard Markdown, wrap each Q&A pair in native HTML `<details>` and `<summary>` tags to create a clickable accordion format.

## 📐 Guiding Principles & Constraints

### 🔴 Batch Imports (Non-Negotiable)
Never attempt to bulk-import 100+ sources from deep research at once. Always iterate in chunks of 20 using the `source_indices` parameter. Wait 2-3 seconds between batches.

### 🟡 Fail Gracefully
- If FAQ schema generation fails or returns fewer than 5 pairs, automatically regenerate via `notebook_query` with an explicit prompt for 8 Q&A pairs.
- If hero image generation fails, use a placeholder image path and note it in the INDEX file. The Astro blog post should still compile locally without breaking.
- If artifact generation times out, skip the non-essential components and rely on the core markdown draft to ensure something can be published.

### 🔐 Data Isolation
Each target keyword gets its own NotebookLM notebook. Never reuse notebooks across keywords. This prevents data contamination and hallucination.

### 🛡️ Security
- Never leak API keys, MCP tokens, or authentication credentials into the Astro repository or markdown frontmatter.
- All build scripts and servers are run locally (localhost).
- Generated content stays on your local machine safely until committed and deployed to Cloudflare Pages.