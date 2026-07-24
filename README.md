# Mount Vernon Control Center v0.2

This build adds the royal-blue/gold HRAC-inspired layout and these production modules:

- Dashboard with Sunday readiness score
- Services and Sunday run list
- Robust calendar and upcoming 30-day events
- Announcements with graphic status
- Choir coordination
- Special events
- Equipment inventory and alerts
- Admin media-team profiles
- Settings

## Update GitHub

Upload and replace the current repository files with the contents of this folder. Keep the folder structure intact. After committing, wait for GitHub Pages to redeploy and press **Ctrl + Shift + R**.

## Logo

The transparent church logo is included at `assets/church-logo.png`. The current interface uses an MV badge while we decide whether the full horizontal logo or a compact logo mark works best in the narrow sidebar.

## Testing note

The current Firestore rules allow any signed-in user to edit. This is suitable for the testing phase only. Role-based permissions should be added before the whole team is invited.
