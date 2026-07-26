# Mount Vernon Control Center v0.6

## Major update: Reports Center

Version 0.6 adds a dedicated Reports page with:

- Live report preview
- Optional start and end dates
- Report-specific filters
- PDF export
- Excel workbook export
- Print-friendly output
- Record counts and summary cards

## Included reports

### Production
- Weekly Production Packet
- Service History
- Annual Ministry Summary

### Calendar and Events
- Upcoming Events
- Event Production History

### Announcements and Music
- Announcement & Graphics Log
- Song History
- Copyright License Report

### Equipment
- Equipment Inventory
- Equipment Rental History
- Equipment Maintenance & Alerts

### Team
- Media Team Directory
- Volunteer Skills Matrix

## Excel workbooks

Each Excel export contains:

1. A **Report** worksheet with the selected records
2. A **Summary** worksheet with:
   - Report name
   - Export date
   - Date range
   - Applied filter
   - Record count

## PDF reports

PDF reports include:

- Church name
- Report title
- Generated date
- Record count
- Page numbers
- Automatically selected portrait or landscape orientation

## Installation

Replace the current GitHub repository files with the contents of this package:

- `index.html`
- `css/`
- `js/`
- `assets/`
- `firestore.rules`
- `README.md`

Commit the replacement, wait for GitHub Pages to deploy, and press `Ctrl + Shift + R`.

## Internet requirement

PDF and Excel exports use trusted browser libraries loaded from jsDelivr:

- SheetJS
- jsPDF
- jsPDF AutoTable

The app must have internet access when it first loads these libraries.

## Testing checklist

1. Open Reports from the sidebar.
2. Preview every report type.
3. Apply a date range.
4. Apply a filter.
5. Export one PDF.
6. Export one Excel workbook.
7. Open both files and verify the records.
8. Print a report.
9. Confirm reports update after editing or adding records.
