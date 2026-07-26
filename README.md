# Mount Vernon Control Center v0.5

## Major update

Version 0.5 adds editing throughout the application.

Editable records:

- Service listings
- Calendar/event entries
- Announcements and screen graphics
- Choir songs
- Copyright-license records
- Equipment
- Equipment rentals
- Admin/media-team profiles

## Equipment rentals

The Equipment section now includes:

- Equipment selection
- Borrower or organization
- Checkout date
- Due date
- Contact information
- Rental notes
- Checked Out, Reserved, and Returned statuses
- A one-click **Mark Returned** button
- Active-rental and overdue counts
- Overdue rental alerts on the dashboard

## Service listings

Services now save as individual Firestore records rather than one permanent `current` document.

You can:

- Start a new service
- Save it
- Reopen it for editing
- Update it
- Delete it
- See services and events together on the calendar

## Installation

Replace the current GitHub repository files with the contents of this package:

- `index.html`
- `css/`
- `js/`
- `assets/`
- `firestore.rules`
- `README.md`

Commit the replacement, wait for GitHub Pages to deploy, and press `Ctrl + Shift + R`.

## Testing checklist

1. Edit and save one record in every section.
2. Refresh the page and confirm the edits remain.
3. Create a new equipment rental.
4. Edit the rental.
5. Mark it returned.
6. Create and edit two different service listings.
7. Confirm both appear on the calendar.
8. Test Cancel, X, Escape, and clicking outside each modal.

## Existing v0.4 service data

Version 0.4 used a single document at `services/current`. Version 0.5 uses individual documents in the `services` collection. The old `current` record may appear as one service listing if it contains service fields. It can be edited or deleted from the Services page.
