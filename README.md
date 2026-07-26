# Mount Vernon Control Center v0.4

This is a fresh rebuild from scratch. It does not reuse the v0.3 JavaScript.

## Main fixes

- Sidebar navigation works.
- Quick-action buttons work.
- Calendar month buttons work.
- Add-item buttons work.
- Cancel, X, Escape, and click-outside all close the modal.
- Closing a modal never triggers required-field validation.
- Only the title/name field is required in add-item forms.
- Demo Mode works independently of Firebase.
- Firebase Authentication and Firestore remain connected.
- Announcements include a Screen Graphics gallery.
- Graphic thumbnails can be uploaded and compressed for Firestore.
- Choir includes songs and copyright-license records.

## Update the live GitHub Pages site

1. Download and unzip this package.
2. In the existing GitHub repository, replace the old files with:
   - `index.html`
   - `css/`
   - `js/`
   - `assets/`
   - `firestore.rules`
   - `README.md`
3. Commit the changes.
4. Wait for GitHub Pages to finish deploying.
5. Open the live site and press `Ctrl + Shift + R`.

## First test order

1. Sign in.
2. Open every sidebar page.
3. Open each Add form and cancel it with:
   - X
   - Cancel
   - Escape
   - Clicking outside the dialog
4. Save one:
   - Announcement
   - Event
   - Song
   - Copyright license
   - Equipment item
   - Media profile
5. Save the Sunday service plan.
6. Confirm the records appear after refreshing.

## Graphic-storage note

Firestore documents have a size limit. This version compresses uploaded graphics to a thumbnail for visual reference. Keep full-resolution originals in Canva, Google Drive, or the church's normal archive.
