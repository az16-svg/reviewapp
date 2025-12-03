# Change Review App

A Next.js application for reviewing and editing vision analysis change detection results. Upload JSON analysis data with corresponding images, visualize detected changes with interactive bounding boxes, and export annotated results to PDF.

## Prerequisites

- Node.js 18+
- npm 9+

## Installation

```bash
cd odin/apps/change_review
npm install
```

## Running the App

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Usage

### 1. Upload Files

Upload a JSON file containing change detection data and the corresponding overlay image:

**JSON Format:**
```json
{
  "changes": [
    {
      "action": "Move",
      "elements": ["Wall", "Door"],
      "direction": "left",
      "value": "10cm",
      "location": {
        "xmin": 100,
        "ymin": 200,
        "xmax": 300,
        "ymax": 400
      }
    }
  ]
}
```

### 2. View Changes

- **Hover** over a change in the list to highlight its bounding box (orange)
- **Click** a change to select/pin it (blue)
- Selected changes remain highlighted while navigating

### 3. Edit Changes

- Click the **edit icon** on any change to open the editor
- Modify action, elements, direction, or value
- Click **Save** to apply changes or **Cancel** to discard

### 4. Delete Changes

- Click the **delete icon** on any change
- Confirm deletion in the dialog
- Or select multiple changes and press **Delete** key

### 5. Add New Changes

- Click **Add Change** to enter drawing mode
- Click and drag on the image to draw a bounding box
- Fill in the change details in the editor that opens
- Press **Escape** to cancel drawing mode

### 6. Zoom Controls

- Use the **-** and **+** buttons in the toolbar to zoom out/in
- Click the **percentage** to reset to 100%
- Zoom range: 25% to 400%
- Scroll the image viewer area when zoomed in

### 7. Multi-Page Support

- Upload additional JSON/image pairs using the form below the change list
- Click page tabs to switch between pages
- Each page maintains its own changes independently
- Delete pages by clicking the X button on the tab

### 8. Export to PDF

- Click **Export PDF** to generate a PDF with all pages
- Each page includes the image with all bounding boxes rendered
- Progress indicator shows export status

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Escape | Cancel drawing mode |
| Delete/Backspace | Delete selected changes |
| Ctrl/Cmd + Plus | Zoom in |
| Ctrl/Cmd + Minus | Zoom out |
| Ctrl/Cmd + 0 | Reset zoom to 100% |

## Project Structure

```
change_review/
├── app/
│   ├── layout.tsx       # Root layout with TailwindCSS
│   ├── page.tsx         # Main page component
│   └── globals.css      # Global styles
├── components/
│   ├── ChangeEditor.tsx # Modal for editing changes
│   ├── ChangeList.tsx   # Scrollable list of changes
│   ├── ExportButton.tsx # PDF export with progress
│   ├── ImageViewer.tsx  # Image display with canvas overlay
│   ├── PageTabs.tsx     # Multi-page navigation tabs
│   └── UploadForm.tsx   # JSON + image file upload
├── hooks/
│   ├── useChanges.ts    # Change state management
│   └── usePages.ts      # Multi-page state management
├── lib/
│   ├── pdfExport.ts     # PDF generation utilities
│   └── validation.ts    # JSON validation utilities
├── types/
│   └── change.ts        # TypeScript type definitions
└── __tests__/           # Test files
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TailwindCSS 4
- **PDF Export**: jsPDF
- **Testing**: Jest, React Testing Library
- **Language**: TypeScript 5

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint |
