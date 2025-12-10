/Users/kevin/Documents/change_review/drawing_reasoning_agent.md

  this is eventually where i'm going with this app
  for now, I want to just start building the app with the concepts of
  sheets and blocks

  the current change review experience is the review for a specific block
  (floor_plan type)
  the setup for a page is
  old page, new page, overlay page, changes.json
  new page wil have the image and a sheet.json
  old page will have the image, and a sheet.json that looks like this

  {
  "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/dataset/A201_new_page_0.png",
  "sheet_number": "A201",
  "blocks": [
    {
      "block_type": "ceiling_plan",
      "storage_type": "image",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/ceiling_plan_0.png",
      "text_content": null,
      "bbox_xmin": 45,
      "bbox_ymin": 252,
      "bbox_xmax": 670,
      "bbox_ymax": 796,
      "description": "Main reflected ceiling plan for Level 1 showing layout of rooms, lighting, and ceiling grid.",
      "title_block_info": null
    },
    {
      "block_type": "legend_symbol",
      "storage_type": "image",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/legend_symbol_1.png",
      "text_content": null,
      "bbox_xmin": 709,
      "bbox_ymin": 38,
      "bbox_xmax": 873,
      "bbox_ymax": 339,
      "description": "Legend explaining ceiling symbols, lighting fixtures, and other ceiling elements.",
      "title_block_info": null
    },
    {
      "block_type": "specifications",
      "storage_type": "text",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/specifications_2.png",
      "text_content": "# CEILING TYPES\n\n**GYP.** PAINTED GYPSUM BOARD\nSEE PLAN FOR FINISHES",
      "bbox_xmin": 709,
      "bbox_ymin": 372,
      "bbox_xmax": 873,
      "bbox_ymax": 401,
      "description": "List of Ceiling Types (GYP, etc).",
      "title_block_info": null
    },
    {
      "block_type": "notes",
      "storage_type": "text",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/notes_3.png",
      "text_content": "## GENERAL NOTE\n1. ALL CUT CEILING EDGES SHALL BE PAINTED WITH PRODUCT APPROVED BY THE MANUFACTURER.\n2. CEILING BRACING ASSEMBLY PER DETAIL 1/A820 AND 2/A820 IS REQUIRED AT 8' X 12' GRID MAX.",
      "bbox_xmin": 709,
      "bbox_ymin": 446,
      "bbox_xmax": 873,
      "bbox_ymax": 476,
      "description": "General note regarding painted gypsum board ceilings.",
      "title_block_info": null
    },
    {
      "block_type": "general_notes",
      "storage_type": "text",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/general_notes_4.png",
      "text_content": "# GENERAL NOTES\n\n1.  COORDINATE ALL TRADES WHOSE EQUIPMENT PENETRATES CEILING. ELECTRICAL, MECHANICAL, FIRE SPRINKLER, AND PLUMBING CONTRACTORS TO VERIFY ALL CLEARANCES AND COORDINATE INSTALLATION OF THEIR EQUIPMENT. VERIFY THAT REQUIRED CLEARANCES EXIST PRIOR TO THE START OF A JOB. NOTIFY THE ARCHITECT IMMEDIATELY IN THE EVENT OF A CONFLICT.\n2.  LOCATE LIGHT FIXTURES AS SHOWN ON ARCHITECTURAL PLANS. ARCHITECTURAL DRAWINGS SHALL TAKE PRECEDENT FOR LOCATING ALL FEATURES IN THE CEILING INCLUDING LIGHTS, DIFFUSERS, ALARMS, SPEAKERS, AND SPRINKLER HEADS. ALL LAYING LAYOUTS ARE SCHEMATIC LIGHTING LEVELS FOR NEW WORK TO COMPLY WITH TITLE 24 REQUIREMENTS. SUBMIT FINAL DESIGN DRAWINGS TO ARCHITECT FOR APPROVAL.\n3.  PROVIDE SEISMIC BRACING AND COMPRESSION STRUT FOR SUSPENDED ACOUSTICAL TILE CEILING AS SHOWN ON SHEET A820 AND AS REQUIRED BY CODE AND LOCAL BUILDING DEPARTMENT. ALL FURRED GYP. BOARD AND METAL STUD SOFFITS SHALL BE BRACED TO STRUCTURE ABOVE AT 4'-0\" O.C. MAX.\n4.  ALL FLUORESCENT LIGHT FIXTURES SHALL BE CLIPPED AT THE CORNERS TO MEET CODE REQUIREMENTS.\n    1.  SECURE DIAGONALLY OPPOSITE CORNERS WITH MOUNTING CLIPS.\n    2.  ATTACH REMAINING TWO CORNERS TO CEILING GRID.\n5.  ALL SPRINKLERS, SMOKE DETECTORS, LIGHT FIXTURES, AND OTHER SIMILAR ITEMS SHOULD BE LOCATED WITHIN A 4\" DIAMETER CIRCLE OF THE DRAWINGS. CENTER ITEMS IN CEILING TILE WHERE AN ITEM APPEARS TO BE GRAPHICALLY CENTERED IN THE ARCHITECTURAL DRAWINGS.\n6.  SPRINKLER HEADS TO BE RELOCATED AS REQUIRED ACCORDING TO NFPA STANDARDS. SPRINKLER HEADS TO BE QUICK RESPONSE TYPE. FIRE SAFETY SUBCONTRACTOR SHALL PREPARE SPRINKLER DRAWINGS AND CALCULATIONS. OBTAIN NECESSARY PERMITS AND SUBMIT HEAD LAYOUT TO THE ARCHITECT FOR APPROVAL PRIOR TO INSTALLATION.\n7.  SEE MECHANICAL, ELECTRICAL, AND PLUMBING DRAWINGS FOR CONNECTIONS AND ROUTING ABOVE THE CEILING.\n8.  MECHANICAL CONTRACTOR SHALL BE RESPONSIBLE FOR HVAC BALANCING AND CERTIFICATION ON COMPLETION OF THE PROJECT.\n9.  WHEN NOT SPECIFICALLY NOTED, WHERE THE CEILING GRID IS NOT CONTINUOUS ABOVE THE WALL SPACE, CENTER THE CEILING TILES EQUALLY ABOUT THE ROOM WHEREIN THE SMALLEST TILE AT THE ROOM'S EDGES IS NOT LESS THAN THE WIDTH OF HALF A TILE.\n10. ALL NEW EQUIPMENT, INCLUDING LIGHT FIXTURES, LOUVERS, LENSES, ETC., SHALL BE FREE FROM DEFECTS, ALL DAMAGED, DENTED, OR DEFECTIVE EQUIPMENT SHALL BE REJECTED WHETHER IT IS A STANDARD OR SPECIAL ORDER ITEM.\n11. INSTALL THE SUSPENDED CEILING GRID TO BE LEVEL WITHIN A TOLERANCE OF 1/8\" IN 12'-0\". ANCHOR CEILING SYSTEM, SOFFITS, AND LIGHT FIXTURES AS REQUIRED BY CODE.\n12. ALL LIGHT FIXTURES USED SHALL BE UL LISTED.\n13. DO NOT LOCATE LIGHT SWITCHES BEHIND DOORS IN OPEN POSITION. COORDINATE LOCATION OF ALL SWITCHING WITH ARCHITECT PRIOR TO INSTALLATION.\n14. SEE SHEET G002 FOR GENERAL NOTES.\n15. SEE SHEET A820 FOR TYPICAL CEILING DETAILS.\n16. SEE MECHANICAL, ELECTRICAL, AND PLUMBING DRAWINGS FOR ADDITIONAL WORK.\n17. ALLOCATE ALLOWANCE FOR CABLE ORGANIZATION FOR ALL OPEN CEILINGS.\n18. ALL SPRINKLERS HEAD, SENSORS, ALARM, EXIT SIGN TO BE CENTERED IN CEILING PANELS AND EQUALLY SPACED BETWEEN CEILING PANELS.\n19. ALL CUT CEILING EDGES SHALL BE PAINTED WITH PRODUCT APPROVED BY THE MANUFACTURER.\n20. CEILING BRACING ASSEMBLY PER DETAIL 1/A820 AND 2/A820 IS REQUIRED AT 8' X 12' GRID MAX.\n21. ALL LIGHT FIXTURES IN OFFICE AND LOUNGE AREAS PROVIDE 3500K. ALL LIGHT FIXTURES IN LABORATORY AND UTILITY AREAS PROVIDE 4000K. CONDITIONS WHERE LIGHT FIXTURES OF DIFFERING COLOR TEMPERATURES ARE DIRECTLY ADJACENT TO ONE ANOTHER MUST BE REVIEWED AND APPROVED BY THE ARCHITECT.",
      "bbox_xmin": 709,
      "bbox_ymin": 521,
      "bbox_xmax": 873,
      "bbox_ymax": 957,
      "description": "Detailed General Notes section covering coordination, lighting, seismic bracing, and installation requirements.",
      "title_block_info": null
    },
    {
      "block_type": "consultants",
      "storage_type": "text",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/consultants_5.png",
      "text_content": "CAC\nARCHITECTS\n2443 FILLMORE ST, SUITE 154\nSAN FRANCISCO, CA 94115\nT: 415.402.0000\nF: 415.817.1739\nwww.cacarch.com",
      "bbox_xmin": 881,
      "bbox_ymin": 38,
      "bbox_xmax": 993,
      "bbox_ymax": 126,
      "description": "Architect's logo and contact information (CAC Architects).",
      "title_block_info": null
    },
    {
      "block_type": "consultants",
      "storage_type": "text",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/consultants_6.png",
      "text_content": "# PROJECT TEAM",
      "bbox_xmin": 881,
      "bbox_ymin": 197,
      "bbox_xmax": 993,
      "bbox_ymax": 208,
      "description": "Project Team heading (empty below).",
      "title_block_info": null
    },
    {
      "block_type": "title_block",
      "storage_type": "text",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/title_block_7.png",
      "text_content": "# PROJECT\n\nCULTURE BIOSCIENCE T.I.\n233 E GRAND AVENUE\nSOUTH SAN FRANCISCO, 94080\n\n**CAC PROJECT NO.** 11463",
      "bbox_xmin": 881,
      "bbox_ymin": 508,
      "bbox_xmax": 993,
      "bbox_ymax": 622,
      "description": "Project information section: Culture Biosciences T.I. project name and address.",
      "title_block_info": {
        "sheet_number": null,
        "sheet_title": null,
        "project_name": "CULTURE BIOSCIENCE T.I.",
        "date": null,
        "revision": null,
        "scale": null,
        "drawn_by": null,
        "checked_by": null
      }
    },
    {
      "block_type": "revision_history",
      "storage_type": "text",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/revision_history_8.png",
      "text_content": "# REVISIONS\n\n| No. | Description | Date |\n| :-- | :---------- | :--- |",
      "bbox_xmin": 881,
      "bbox_ymin": 632,
      "bbox_xmax": 993,
      "bbox_ymax": 725,
      "description": "Revisions table with columns for No., Description, and Date.",
      "title_block_info": null
    },
    {
      "block_type": "key_plan",
      "storage_type": "image",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/key_plan_9.png",
      "text_content": null,
      "bbox_xmin": 962,
      "bbox_ymin": 741,
      "bbox_xmax": 982,
      "bbox_ymax": 766,
      "description": "North arrow graphic.",
      "title_block_info": null
    },
    {
      "block_type": "title_block",
      "storage_type": "text",
      "image_uri": "/Users/kevin/Documents/deprecated/odin/apps/vision/worker/scripts/structure/outputs/new/blocks/title_block_10.png",
      "text_content": "**DATE**: 11.21.2025\n**SCALE**: As indicated\n\n# LEVEL 1 - REFLECTED OVERALL CEILING PLAN\n\n**SHEET NO.**: A201",
      "bbox_xmin": 881,
      "bbox_ymin": 836,
      "bbox_xmax": 993,
      "bbox_ymax": 962,
      "description": "Sheet title block containing date, scale, drawing title (Level 1 Reflected Ceiling Plan), and sheet number (A201).",
      "title_block_info": {
        "sheet_number": "A201",
        "sheet_title": "LEVEL 1 - REFLECTED OVERALL CEILING PLAN",
        "project_name": null,
        "date": "11.21.2025",
        "revision": null,
        "scale": "As indicated",
        "drawn_by": null,
        "checked_by": null
      }
    }
  ]
}