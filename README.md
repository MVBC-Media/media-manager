# GMVBC Media Operations v0.1

Firebase-ready church media operations prototype.

## Setup

1. In Firebase, open **Project Overview** and click the Web app icon (`</>`).
2. Register an app named `GMVBC Media Operations`; do not enable Firebase Hosting.
3. Copy the `firebaseConfig` values into `js/firebase-config.js`.
4. Enable **Authentication → Sign-in method → Email/Password**.
5. In **Firestore Database → Rules**, paste the contents of `firestore.rules` and publish.
6. Upload this folder to GitHub and enable GitHub Pages.

Without Firebase configuration, use **Preview in Demo Mode**.

## Version 0.1 includes

- Email/password login and account creation
- Operations Center dashboard
- Sunday service planner
- Announcements
- Events
- Media requests
- Responsive phone/tablet/desktop layout
- Demo Mode

These starter rules allow every authenticated user to edit. Role-based permissions and account approval come next.
