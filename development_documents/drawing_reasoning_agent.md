# Construction Drawing Agent with Multimodal Reasoning

## Overview

Build an LLM-powered agent using **OpenAI Agents SDK** with **Gemini 3 Pro** as the main reasoning model that can reason over construction drawing sets by referencing:
- **Visual content**: Legends, plans, elevations, details (stored as images)
- **Text content**: Notes, revision history, title blocks (stored as markdown)

The agent supports cross-sheet references, callout resolution, and both change detection and comprehension queries.

**Key Insights**:
- Symbol codes are rarely labeled directly on drawings - patterns must be visually matched to legends
- Drawing sets contain hundreds of sheets with complex cross-references
- Different content types need different storage/retrieval strategies

---

## Drawing Set Hierarchy

```
Drawing Set (Project: "New Temple Project")
│
├── Sheet G-001 (Cover Sheet)
│   ├── [text] Sheet Index (markdown table)
│   ├── [text] Abbreviations
│   ├── [text] Code References
│   └── [image] General Symbols Legend
│
├── Sheet A1-01 (Architectural - Floor Plan Level 1)
│   ├── [text] Title Block
│   │   └── Project, Client, Date, Scale, Drawn By, Checked By
│   ├── [text] Revision History
│   │   └── Rev A: 2024-01-15 - Issued for Permit
│   │   └── Rev B: 2024-03-20 - Owner Comments
│   ├── [text] General Notes
│   │   └── 1. All dimensions to face of stud U.N.O.
│   │   └── 2. Verify all dimensions in field
│   ├── [text] Key Notes
│   │   └── KN-1: Provide blocking for grab bars
│   │   └── KN-2: Coordinate with structural
│   ├── [image] Floor Plan Drawing
│   │   └── Contains callouts → "See Detail 3/A5-02"
│   │   └── Contains note refs → "See Note KN-1"
│   ├── [image] Flooring Types Legend
│   ├── [image] Finish Legend
│   └── [text] Consultants Block
│
├── Sheet A2-01 (Architectural - Elevations)
│   ├── [text] Title Block
│   ├── [image] North Elevation
│   ├── [image] South Elevation
│   └── [text] Elevation Notes
│
├── Sheet A5-02 (Architectural - Details)
│   ├── [image] Detail 1 - Wall Section
│   ├── [image] Detail 2 - Door Head
│   ├── [image] Detail 3 - Base Detail  ← referenced from A1-01
│   └── [text] Detail Notes
│
├── Sheet S1-01 (Structural - Foundation Plan)
│   └── ...
│
└── Sheet M1-01 (Mechanical - HVAC Plan)
    └── ...
```

---

## Content Storage Strategy

### Image Blocks (PNG)

Visual content requiring pattern matching or spatial understanding:

| Block Type | Example | Why Image? |
|------------|---------|------------|
| Floor Plans | Room layouts, equipment | Spatial patterns, symbols |
| Ceiling Plans | Grid layouts, fixtures | Visual patterns |
| Elevations | Building facades | Visual representation |
| Sections | Cut-through views | Visual + dimensions |
| Details | Construction assemblies | Visual + annotations |
| Legends | Flooring, finish, symbols | Pattern matching required |
| Schedules (graphic) | Door schedule with diagrams | Mixed visual content |

### Text Blocks (Markdown)

Structured text content for search and retrieval:

| Block Type | Example | Why Text? |
|------------|---------|-----------|
| General Notes | "All dimensions to face of stud" | Searchable, referenceable |
| Key Notes | "KN-1: Provide blocking" | Numbered, cross-referenced |
| Sheet Notes | Sheet-specific instructions | Searchable |
| Revision History | "Rev B: Owner comments" | Structured timeline |
| Title Block | Project name, dates, scale | Metadata extraction |
| Consultants | Architect, Engineer contacts | Contact lookup |
| Abbreviations | "U.N.O. = Unless Noted Otherwise" | Definition lookup |
| Code References | "IBC 2021 Section 1010" | Compliance tracking |

### Markdown Format Examples

**Key Notes:**
```markdown
## Key Notes - Sheet A1-01

1. **KN-1**: Provide blocking for grab bars per ADA requirements
2. **KN-2**: Coordinate ceiling heights with structural
3. **KN-3**: All doors to have 10" bottom rail minimum
4. **KN-4**: See specification section 09 65 00 for flooring
```

**Revision History:**
```markdown
## Revision History - Sheet A1-01

| Rev | Date | Description | By |
|-----|------|-------------|-----|
| A | 2024-01-15 | Issued for Permit | JD |
| B | 2024-03-20 | Owner Comments Incorporated | JD |
| C | 2024-05-10 | Addendum 1 | KL |
```

**Title Block:**
```markdown
## Title Block - Sheet A1-01

- **Project**: New Temple Project
- **Client**: The Church of Jesus Christ of Latter-Day Saints
- **Sheet Title**: Floor Finish Plan - Level 01
- **Sheet Number**: A22-02
- **Scale**: 1/8" = 1'-0"
- **Date**: 2024-05-10
- **Drawn By**: JD
- **Checked By**: KL
- **Architect**: NORR Architects
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PDF Ingestion Pipeline                       │
├─────────────────────────────────────────────────────────────────┤
│  PDF → Sheets → Block Segmentation → Content Extraction         │
│                    (Gemini)         (Image PNG or Text MD)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Content Storage (PostgreSQL + GCS)              │
├─────────────────────────────────────────────────────────────────┤
│  drawing_sets: project-level container                          │
│  sheets: individual pages, linked by sheet_number               │
│  blocks: content units (image or text)                          │
│       - Image blocks → GCS PNG files                            │
│       - Text blocks → Markdown in PostgreSQL                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            OpenAI Agents SDK + Gemini 3 Pro (Main Agent)         │
├─────────────────────────────────────────────────────────────────┤
│  Capabilities:                                                   │
│  - Multi-sheet reasoning across drawing set                     │
│  - Visual analysis of plans, elevations, details                │
│  - Text retrieval for notes, revisions, specs                   │
│  - Cross-reference resolution (callouts → target sheets)        │
│                                                                  │
│  Tools:                                                          │
│  - identify_patterns(regions) → Visual pattern matching         │
│  - get_sheet_content(sheet_no, block_types) → Fetch blocks      │
│  - get_notes(sheet_no, note_type) → Retrieve text notes         │
│  - resolve_callout(callout_text) → Find referenced detail       │
│  - search_text(query) → Full-text search across all notes       │
│  - get_detected_changes(comparison_id) → Change data            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Tool: identify_patterns (Gemini Flash)              │
├─────────────────────────────────────────────────────────────────┤
│  Visual pattern matching for legends (unchanged from before)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pattern Matching Flow

### The Problem
Symbol codes (like "CPT-1") are **rarely labeled** directly on the drawing plan. The drawing shows visual patterns (hatching, dots, crosshatch) that must be matched to the legend.

### The Solution: Visual Pattern Lookup via Tool

```
User: "What flooring is in the main lobby?"
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│                  Main Agent (Gemini 3 Pro)                   │
│  • Receives: full drawing image + user question              │
│  • Analyzes drawing visually                                 │
│  • Identifies lobby area, sees pattern but can't identify it │
│  • Specifies bbox coordinates for the region (superior loc.) │
└──────────────────────────────────────────────────────────────┘
                    │
                    │  identify_patterns(
                    │    regions: [{bbox: [100,200,300,400], label: "lobby"}]
                    │  )
                    ▼
┌──────────────────────────────────────────────────────────────┐
│              Tool: identify_patterns (Gemini Flash)          │
│                                                              │
│  1. Fetch legends with precedence (for caching):            │
│     a. Project-level legends (cover/index sheets)           │
│     b. Current sheet legends (higher priority - overrides)  │
│  2. Crop region at bbox [100,200,300,400]                   │
│  3. Call Gemini Flash (order matters for caching):          │
│     ┌─────────────────────────────────────────────────────┐ │
│     │ Image 1: [Project Symbol Legend]     ← cached       │ │
│     │ Image 2: [Sheet Flooring Legend]     ← cached       │ │
│     │ Image 3: [Sheet Finish Legend]       ← cached       │ │
│     │ Image 4: [Cropped region - lobby]    ← LAST (var)   │ │
│     │                                                     │ │
│     │ Prompt: "Match the pattern in the LAST image to    │ │
│     │          the best matching entry in the legends.    │ │
│     │          Current sheet legends override project."   │ │
│     └─────────────────────────────────────────────────────┘ │
│  4. Return: {                                               │
│       label: "lobby",                                       │
│       match: "CPT-1",                                       │
│       description: "General Broadloom Carpet",             │
│       legend_type: "flooring",                             │
│       confidence: "high"                                   │
│     }                                                       │
│                                                              │
│  Note: Legends placed first for prompt caching - only the   │
│  trailing crop changes between calls.                       │
└──────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│                  Main Agent (Gemini 3 Pro)                   │
│  • Receives tool result                                      │
│  • Formulates final answer:                                  │
│    "The main lobby has CPT-1 (General Broadloom Carpet)"    │
└──────────────────────────────────────────────────────────────┘
```

---

## Batch Pattern Lookup

For queries involving multiple regions:

```
User: "What flooring is in rooms 201, 202, and 203?"

Agent calls:
  identify_patterns(
    regions: [
      {bbox: [100,200,200,300], label: "room_201"},
      {bbox: [300,200,400,300], label: "room_202"},
      {bbox: [500,200,600,300], label: "room_203"}
    ]
  )

Tool internally:
  1. Fetch legends (cached prefix):
     • Project-level legends first
     • Current sheet legends second (higher priority)
  2. Crop all 3 regions
  3. Single Gemini Flash call (order for caching):
     [project legends] → [sheet legends] → [crop_201, crop_202, crop_203 LAST]
  4. Returns batch results

→ Legends prefix cached and reused across calls
→ Only the trailing crops change per request

Returns: [
  {label: "room_201", match: "CPT-1", description: "Broadloom Carpet", legend: "flooring"},
  {label: "room_202", match: "STN-2", description: "Stone Tile",       legend: "flooring"},
  {label: "room_203", match: "CPT-1", description: "Broadloom Carpet", legend: "flooring"}
]
```

**Benefits:**
- Single Gemini call for multiple patterns (cost efficient)
- Searches ALL legend types automatically (agent doesn't need to guess)
- Batch results in one response

---

## Data Model

### Hierarchical Structure

```
drawing_sets (Project)
    └── sheets (Individual pages by sheet_number)
            └── blocks (Content units - image or text)
```

Note: Cross-references (callouts) are resolved on-the-fly by the agent, not pre-extracted.

### Database Schema

```sql
-- Project/Drawing Set container
CREATE TABLE drawing_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,      -- "New Temple Project"
  client          VARCHAR(255),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Individual sheets (pages) identified by sheet_number
CREATE TABLE sheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_set_id  UUID REFERENCES drawing_sets(id),

  sheet_number    VARCHAR(20) NOT NULL,       -- "A22-02", "S1-01", "M2-03"
  sheet_title     VARCHAR(255),               -- "Floor Finish Plan - Level 01"
  discipline      VARCHAR(10),                -- "A", "S", "M", "E", "P" (Arch, Struct, Mech, Elec, Plumb)

  image_uri       TEXT NOT NULL,              -- Full sheet PNG in GCS

  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),

  UNIQUE(drawing_set_id, sheet_number)
);

CREATE INDEX idx_sheets_number ON sheets(sheet_number);
CREATE INDEX idx_sheets_discipline ON sheets(discipline);

-- Content blocks - either image or text
CREATE TABLE blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id        UUID REFERENCES sheets(id),

  -- Block classification
  block_type      VARCHAR(50) NOT NULL,       -- See block_type enum below
  storage_type    VARCHAR(10) NOT NULL,       -- 'image' or 'text'

  -- For image blocks
  image_uri       TEXT,                       -- GCS path to PNG

  -- For text blocks
  text_content    TEXT,                       -- Markdown content

  -- Bounding box on source sheet (normalized 0-1000)
  bbox_xmin.      INT NOT NULL,
  bbox_ymin          INT NOT NULL,
  bbox_xmax      INT NOT NULL,
  bbox_ymax     INT NOT NULL,

  -- Optional: extracted/parsed metadata as JSON
  metadata        JSONB,

  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blocks_sheet ON blocks(sheet_id);
CREATE INDEX idx_blocks_type ON blocks(block_type);
CREATE INDEX idx_blocks_storage ON blocks(storage_type);

-- Full-text search on text blocks
CREATE INDEX idx_blocks_text_search ON blocks
  USING gin(to_tsvector('english', text_content))
  WHERE storage_type = 'text';

-- Note: No callout_references table - callouts are resolved on-the-fly
-- Agent reads callout text visually, resolve_callout() parses and queries blocks table
```

### Block Type Enum

```sql
-- Image block types (storage_type = 'image')
'floor_plan'        -- Floor plans, ceiling plans, roof plans
'elevation'         -- Building elevations
'section'           -- Building sections
'detail'            -- Construction details
'legend_flooring'   -- Flooring types legend
'legend_finish'     -- Finish legend
'legend_symbol'     -- General symbols legend
'legend_ceiling'    -- Ceiling types legend
'schedule'          -- Schedules with graphics (door, window, etc.)
'diagram'           -- Riser diagrams, single-line, etc.

-- Text block types (storage_type = 'text')
'general_notes'     -- General notes block
'key_notes'         -- Numbered key notes (KN-1, KN-2)
'sheet_notes'       -- Sheet-specific notes
'revision_history'  -- Revision table
'title_block'       -- Title block metadata
'consultants'       -- Consultant/contact info
'abbreviations'     -- Abbreviations list
'code_references'   -- Code compliance notes
'specifications'    -- Spec section references
```

### Storage Paths

**Image blocks:**
```
gs://{bucket}/drawing_sets/{set_id}/sheets/{sheet_number}/blocks/{block_type}.png
gs://{bucket}/drawing_sets/{set_id}/sheets/A22-02/blocks/floor_plan.png
gs://{bucket}/drawing_sets/{set_id}/sheets/A22-02/blocks/legend_flooring.png
```

**Full sheet images:**
```
gs://{bucket}/drawing_sets/{set_id}/sheets/{sheet_number}/full_sheet.png
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Main Agent** | OpenAI Agents SDK + **Gemini 3 Pro** | Main reasoning, multi-sheet analysis, user interaction |
| **Pattern Matching** | Gemini Flash | Visual pattern → legend matching (cost efficient) |
| **Block Segmentation** | Gemini (existing) | Identify and classify blocks on sheets |
| **Text Extraction** | Gemini Flash | OCR and structure extraction for text blocks |
| **Storage** | PostgreSQL + GCS | Metadata/text in DB, images in GCS |
| **Full-text Search** | PostgreSQL tsvector | Search across all text blocks |
| **Drawing Processing** | Existing pipeline | PDF → PNG, alignment, overlays |

---

## Tool Definitions (Conceptual)

### identify_patterns

```
Tool: identify_patterns
Description: Match visual patterns from drawing regions to legend entries

Input:
  sheet_number: The sheet to analyze (e.g., "A22-02")
  regions: List of regions to analyze
    - bbox: [x, y, width, height] in normalized coordinates (0-1000)
    - label: Optional identifier for the region (e.g., "lobby", "room_201")

Output:
  List of matches:
    - label: The region label
    - match: Symbol code (e.g., "CPT-1")
    - description: Symbol description (e.g., "General Broadloom Carpet")
    - legend_type: Which legend it came from (e.g., "flooring")
    - confidence: high/medium/low

Internal Process:
  1. Fetch legends with precedence:
     a. Project-level legends (cover/index sheets) - cached
     b. Current sheet legends (higher priority - overrides project)
  2. Crop regions from sheet image at specified bboxes
  3. Send to Gemini Flash (order for caching):
     [project legends] → [sheet legends] → [crops LAST]
  4. Parse and return matches (sheet legends override if conflict)
```

### get_notes

```
Tool: get_notes
Description: Retrieve text notes from a sheet

Input:
  sheet_number: The sheet to query (e.g., "A22-02")
  note_type: Type of notes to retrieve
    - "general_notes" | "key_notes" | "sheet_notes" | "revision_history" | "all"

Output:
  markdown_content: The notes as markdown text
  metadata: Optional parsed structure (e.g., revision table as JSON)

Example Response:
  {
    "note_type": "key_notes",
    "markdown_content": "## Key Notes\n\n1. **KN-1**: Provide blocking...",
    "metadata": {
      "notes": [
        {"id": "KN-1", "text": "Provide blocking for grab bars"},
        {"id": "KN-2", "text": "Coordinate with structural"}
      ]
    }
  }
```

### get_sheet_content

```
Tool: get_sheet_content
Description: Fetch blocks from a specific sheet

Input:
  sheet_number: The sheet to query (e.g., "A22-02")
  block_types: List of block types to retrieve
    - e.g., ["floor_plan", "legend_flooring", "general_notes"]
    - or "all" for everything

Output:
  sheet_info:
    - sheet_number
    - sheet_title
    - discipline
  blocks: List of blocks
    - block_type
    - storage_type: "image" or "text"
    - image_url: (if image) URL to fetch image
    - text_content: (if text) Markdown content
```

### resolve_callout

```
Tool: resolve_callout
Description: Resolve a drawing callout reference to its target content.
             Parses callout text on-the-fly and queries blocks table.

Input:
  callout_text: The callout as it appears (e.g., "Detail 3/A5-02", "See KN-1")

Internal Process:
  1. Parse callout text → sheet_number, block_type, block_id
     e.g., "Detail 3/A5-02" → sheet: "A5-02", type: "detail", id: "3"
  2. Query blocks table for matching block
  3. Return block content (image_uri or text_content)

Output:
  reference_type: "detail" | "sheet" | "note" | "specification"
  target:
    - sheet_number: Target sheet
    - detail_id: Detail number (if applicable)
    - note_id: Note ID (if applicable)
  content:
    - If detail: Image URL of the detail
    - If note: Text content of the note
```

### search_text

```
Tool: search_text
Description: Full-text search across all text blocks in the drawing set

Input:
  query: Search query (e.g., "grab bars", "ADA", "coordinate with structural")
  scope: Optional filter
    - sheet_number: Limit to specific sheet
    - discipline: Limit to discipline ("A", "S", "M", etc.)
    - note_type: Limit to specific note types

Output:
  results: List of matches
    - sheet_number
    - block_type
    - snippet: Relevant text excerpt with highlights
    - relevance_score
```

### get_title_block

```
Tool: get_title_block
Description: Get metadata from a sheet's title block

Input:
  sheet_number: The sheet to query

Output:
  project_name
  client
  sheet_title
  sheet_number
  scale
  date
  revision
  drawn_by
  checked_by
  architect
  consultants: List of consultant info
```

### get_revision_history

```
Tool: get_revision_history
Description: Get revision history for a sheet or entire drawing set

Input:
  sheet_number: Optional - specific sheet, or omit for all sheets

Output:
  revisions: List of revisions
    - sheet_number
    - revision_id: "A", "B", "C"
    - date
    - description
    - by
```

### get_detected_changes

```
Tool: get_detected_changes
Description: Get all detected changes for a page comparison

Input:
  page_comparison_id: UUID of the comparison

Output:
  List of changes:
    - action: add/remove/move/modify
    - element_type: wall/door/flooring/etc.
    - description: Text description of change
    - location: Normalized bbox of change area
    - overlay_color: red (removed) / green (added)
```

---

## Query Examples

### Single Drawing Comprehension

**Query**: "What flooring materials are used on this floor?"

**Agent Flow**:
1. Scans drawing visually, identifies distinct pattern areas
2. Calls `identify_patterns` with multiple bboxes
3. Aggregates results, responds with summary

**Response**: "This floor uses three flooring types:
- CPT-1 (General Broadloom Carpet) in offices and conference rooms
- STN-2 (Stone Tile) in the main lobby and corridors
- PT-1 (Porcelain Tile) in restrooms"

---

### Notes and Specifications Query

**Query**: "What are the key notes for sheet A22-02?"

**Agent Flow**:
1. Calls `get_notes(sheet_number="A22-02", note_type="key_notes")`
2. Returns markdown content

**Response**: "Sheet A22-02 has the following key notes:

1. **KN-1**: Provide blocking for grab bars per ADA requirements
2. **KN-2**: Coordinate ceiling heights with structural drawings
3. **KN-3**: All doors to have 10" bottom rail minimum
4. **KN-4**: See specification section 09 65 00 for flooring requirements"

---

### Cross-Reference Resolution

**Query**: "What does the detail callout at the lobby entrance show?"

**Agent Flow**:
1. Visually identifies callout at lobby entrance: "Detail 3/A5-02"
2. Calls `resolve_callout(callout_text="Detail 3/A5-02")`
3. Receives detail image from sheet A5-02
4. Analyzes detail image

**Response**: "The callout references Detail 3 on sheet A5-02, which shows a floor transition detail between the stone tile in the lobby and the carpet in the corridor. It specifies a brass transition strip with 1/4" reveal."

---

### Full-Text Search

**Query**: "Which sheets mention ADA requirements?"

**Agent Flow**:
1. Calls `search_text(query="ADA")`
2. Returns matches across all sheets

**Response**: "ADA requirements are mentioned on:
- **A22-02** (Key Notes): 'KN-1: Provide blocking for grab bars per ADA requirements'
- **A31-01** (General Notes): 'All restrooms to comply with ADA accessibility guidelines'
- **A40-05** (Door Schedule): 'Door hardware to meet ADA maneuvering clearances'"

---

### Revision History Query

**Query**: "What changes were made in Revision B?"

**Agent Flow**:
1. Calls `get_revision_history()`
2. Filters for Revision B entries

**Response**: "Revision B (2024-03-20) included the following changes:
- **A22-02**: Owner comments - changed flooring in lobby from carpet to stone
- **A31-01**: Added additional restroom per owner request
- **S1-01**: Updated foundation dimensions per geotechnical report"

---

### Multi-Sheet Analysis

**Query**: "Show me all the details referenced from the Level 1 floor plan"

**Agent Flow**:
1. Scans A1-01 floor plan for all detail callouts
2. For each callout, calls `resolve_callout`
3. Aggregates results with detail images

**Response**: "The Level 1 floor plan (A1-01) references 5 details:
- Detail 1/A5-01: Wall section at exterior
- Detail 2/A5-01: Window head condition
- Detail 3/A5-02: Floor transition at lobby
- Detail 4/A5-02: Base detail at stone wall
- Detail 7/A5-03: Millwork section at reception

[Shows thumbnail images of each detail]"

---

### Change Detection

**Query**: "What flooring changed in the latest revision?"

**Agent Flow**:
1. Calls `get_detected_changes` to get overlay data
2. Filters for flooring-related changes
3. For each changed area, calls `identify_patterns` on old and new versions
4. Compares and reports differences

**Response**: "The following flooring changes were made:
- Room 203: Changed from CPT-1 (Broadloom Carpet) to STN-2 (Stone Tile)
- East corridor: Added PT-1 (Porcelain Tile) where previously unspecified"

---

## Ingestion Pipeline

### Full Processing Flow

```
PDF Drawing Set Upload
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. PDF to PNG Conversion                                    │
│    - Split PDF into individual sheet PNGs (300 DPI)        │
│    - Extract sheet number from filename or title block     │
│    - Create drawing_set and sheet records                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Block Segmentation (Gemini)                              │
│    For each sheet:                                          │
│    - Identify all distinct blocks                          │
│    - Classify: plan, elevation, detail, legend, notes, etc.│
│    - Determine storage_type: image or text                 │
│    - Return bounding boxes                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Content Extraction                                       │
│                                                             │
│    Image blocks:                                            │
│    - Crop at bbox                                          │
│    - Save as PNG to GCS                                    │
│    - Store image_uri in blocks table                       │
│                                                             │
│    Text blocks:                                             │
│    - Send to Gemini Flash for OCR + structuring            │
│    - Convert to Markdown format                            │
│    - Store text_content in blocks table                    │
│    - Parse metadata (note IDs, revision table, etc.)       │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Existing Pipeline (for comparisons)                      │
│    - Page matching between revisions                       │
│    - Image alignment                                        │
│    - Overlay generation                                     │
│    - Change detection                                       │
└─────────────────────────────────────────────────────────────┘
```

### Block Segmentation Prompt (Gemini)

```
Analyze this construction drawing sheet and identify all distinct blocks.

For each block, provide:
1. block_type: One of:
   - Image types: floor_plan, ceiling_plan, elevation, section, detail,
     legend_flooring, legend_finish, legend_symbol, schedule, diagram
   - Text types: general_notes, key_notes, sheet_notes, revision_history,
     title_block, consultants, abbreviations, code_references

2. storage_type: "image" or "text"
   - Use "image" for drawings, legends, schedules with graphics
   - Use "text" for pure text content like notes, revision tables

3. bbox: Bounding box [x, y, width, height] normalized to 0-1000

4. label: Descriptive label (e.g., "Floor Plan - Level 1", "Flooring Legend")

Return as JSON array.
```

### Text Extraction Prompt (Gemini Flash)

```
Extract the text content from this {block_type} block and format as Markdown.

Requirements:
- Preserve numbering and hierarchy
- Use **bold** for note IDs (e.g., **KN-1**, **GN-3**)
- Format tables using Markdown table syntax
- Extract any referenced specification sections

Also return structured metadata:
- For key_notes: List of {id, text} objects
- For revision_history: List of {rev, date, description, by} objects
- For title_block: Structured fields (project, client, scale, etc.)
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add DrawingSet, Sheet, Block models |
| `models.py` | Modify | Add SQLModel equivalents |
| `scripts/ingest/process_drawing_set.py` | Create | Main ingestion orchestrator |
| `scripts/ingest/segment_blocks.py` | Create | Block segmentation using Gemini |
| `scripts/ingest/extract_text_blocks.py` | Create | Text extraction and markdown conversion |
| `agents/drawing_agent.py` | Create | OpenAI Agents SDK + Gemini 3 Pro agent |
| `agents/tools/pattern_matcher.py` | Create | identify_patterns tool (Gemini Flash) |
| `agents/tools/content_retriever.py` | Create | get_notes, get_sheet_content, etc. |
| `agents/tools/search.py` | Create | search_text, resolve_callout |
| `agents/query_handler.py` | Create | Query interface / API |

---

## Key Design Decisions

1. **Sheet-centric organization**: Everything linked by sheet_number, enabling multi-sheet reasoning and cross-references

2. **Dual storage strategy**:
   - Images (PNG): Visual content requiring pattern matching or spatial understanding
   - Text (Markdown): Searchable, structured text content with full-text indexing

3. **Whole legend blocks, not individual symbols**: Simpler storage, preserves visual context for pattern matching

4. **Visual pattern matching via Gemini Flash**: Leverages multimodal capabilities without needing CLIP/embeddings infrastructure

5. **Agent specifies bboxes**: Main agent (Gemini 3 Pro) analyzes drawings visually - chosen for superior bbox localization

6. **Legend precedence**: Current sheet legends override project-level; both queried automatically

7. **Prompt ordering for caching**: Legends/context placed first (cacheable), target crop LAST (variable)

8. **Batch operations**: Single tool calls can process multiple regions/queries efficiently

9. **Two-model architecture**:
   - Gemini 3 Pro: Main reasoning, bbox localization, multi-sheet analysis
   - Gemini Flash: Pattern matching, text extraction (cost optimization)

10. **On-the-fly callout resolution**: Agent reads callout text visually, tool parses and fetches (no pre-extraction needed)

11. **Structured metadata extraction**: Text blocks parsed into both markdown (human-readable) and JSON (machine-queryable)

---

## Open Questions / Future Work

### Data Model

1. **Legend inheritance**: Cover sheet legends apply to all sheets. Current implementation: query both project-level and sheet-level legends, with sheet-level taking precedence.

2. **Multi-discipline coordination**: How to link architectural sheets to structural/MEP sheets for coordination queries?

3. **Specification linking**: Connect note references (e.g., "See Spec 09 65 00") to actual specification documents?

### Agent Capabilities

4. **Confidence handling**: What to do when pattern match confidence is low? Ask user? Show alternatives?

5. **Caching strategy**: Cache pattern matches to avoid repeated Gemini calls for same patterns?

6. **Context window management**: With hundreds of sheets, how to efficiently provide relevant context to agent?

7. **Symbol spatial context**: Some symbols only make sense in context (e.g., door swings, north arrows) - special handling?

### Revision Tracking

8. **Cross-revision queries**: "What changed in the flooring between Rev A and Rev C?"

9. **Legend change detection**: Track when legend entries are added/removed/modified between revisions

10. **Revision cloud integration**: Link revision clouds to specific changes in the revision history

### Scale & Performance

11. **Large drawing sets**: Handling 500+ sheet sets efficiently

12. **Incremental updates**: Adding new sheets to existing set without full reprocessing

13. **Parallel processing**: Optimal parallelization strategy for block extraction

---

## Appendix: Example Gemini Flash Prompt

Note: Image order matters for caching - legends first (cached), crops LAST (variable).

```
You are analyzing construction drawing patterns. Match each cropped region to the best matching legend entry.
Current sheet legends take precedence over project-level legends if there's a conflict.

Project Symbol Legend: [Image 1]          ← cached across all calls
Sheet Flooring Types Legend: [Image 2]    ← cached for this sheet
Sheet Finish Legend: [Image 3]            ← cached for this sheet

Region 1 (lobby): [Image 4]               ← variable (LAST)
Region 2 (room_201): [Image 5]            ← variable (LAST)
Region 3 (corridor): [Image 6]            ← variable (LAST)

For each region, identify:
1. The best matching symbol from any legend
2. The symbol code (e.g., "CPT-1", "STN-2")
3. The full description
4. Which legend it came from
5. Your confidence (high/medium/low)

Respond in JSON format:
{
  "matches": [
    {
      "region": "lobby",
      "symbol_code": "STN-2",
      "description": "Stone Tile - Verde Guatemala",
      "legend_type": "flooring",
      "confidence": "high"
    },
    ...
  ]
}
```
