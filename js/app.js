import { firebaseConfig } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const configured = Boolean(firebaseConfig.apiKey) && !firebaseConfig.apiKey.includes("PASTE_");

const state = {
  mode: configured ? "firebase" : "demo",
  user: null,
  isRegister: false,
  services: [],
  currentServiceId: null,
  announcements: [],
  events: [],
  songs: [],
  licenses: [],
  equipment: [],
  rentals: [],
  profiles: [],
  settings: {},
  monthCursor: new Date(),
  modal: { type: null, id: null, existingGraphicData: null }
};

let fb = {};

const demoSeed = {
  services: [{
    id: "demo-service",
    serviceDate: new Date().toISOString().slice(0, 10),
    serviceName: "Sunday Morning Worship",
    callTime: "07:45",
    startTime: "09:00",
    sermonTitle: "Thank God for What We Know",
    scripture: "Romans 8:35–38",
    speaker: "Pastor Samuel C. Brown",
    choirName: "Mass Choir",
    orderOfService: "7:45 AM — Media arrival\n8:00 AM — Sound check\n8:20 AM — Camera check\n9:00 AM — Worship begins",
    serviceNotes: "Confirm sermon lower-third.",
    sermonReady: true,
    graphicsReady: true,
    slidesReady: true,
    audioReady: true,
    streamReady: false,
    camerasReady: true,
    choirReady: true
  }],
  announcements: [{
    id: "demo-announcement",
    title: "Media Team Call Time",
    message: "Report by 7:45 AM Sunday.",
    priority: "Urgent",
    graphicStatus: "Ready"
  }],
  events: [{
    id: "demo-event",
    title: "Monday Night Study Hour",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "18:00",
    location: "Sanctuary",
    coverage: "Slides and livestream"
  }],
  songs: [{
    id: "demo-song",
    title: "Total Praise",
    artist: "Richard Smallwood",
    serviceDate: new Date().toISOString().slice(0, 10),
    servicePosition: "Choir Selection",
    choir: "Mass Choir",
    notes: "Confirm track and soloist."
  }],
  licenses: [{
    id: "demo-license",
    provider: "CCLI",
    licenseType: "Church Copyright License",
    status: "Researching",
    notes: "Streaming coverage under review."
  }],
  equipment: [{
    id: "demo-camera",
    name: "Camera 1",
    category: "Cameras",
    status: "Ready",
    location: "Booth",
    condition: "Good"
  }, {
    id: "demo-mic",
    name: "Wireless Microphone 3",
    category: "Audio",
    status: "Needs battery",
    location: "Audio cabinet",
    condition: "Attention"
  }],
  rentals: [{
    id: "demo-rental",
    equipmentId: "demo-camera",
    equipmentName: "Camera 1",
    borrower: "Robert",
    checkoutDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    status: "Checked Out",
    notes: "Special event coverage."
  }],
  profiles: [{
    id: "demo-profile",
    name: "Shayla Kelly",
    role: "Administrator / Graphics",
    skills: "Graphics, slides, planning"
  }],
  settings: {}
};

const collectionMap = {
  service: "services",
  announcement: "announcements",
  event: "events",
  song: "songs",
  license: "licenses",
  equipment: "equipment",
  rental: "rentals",
  profile: "profiles"
};

const stateMap = {
  service: "services",
  announcement: "announcements",
  event: "events",
  song: "songs",
  license: "licenses",
  equipment: "equipment",
  rental: "rentals",
  profile: "profiles"
};

async function initFirebase() {
  if (!configured) {
    showAuth();
    return;
  }

  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");

    const app = appModule.initializeApp(firebaseConfig);

    fb = {
      ...authModule,
      ...firestoreModule,
      auth: authModule.getAuth(app),
      db: firestoreModule.getFirestore(app)
    };

    authModule.onAuthStateChanged(fb.auth, async (user) => {
      if (user) {
        state.user = user;
        startFirestoreListeners();
        await loadSettings();
        showApp();
      } else {
        showAuth();
      }
    });
  } catch (error) {
    $("authMessage").textContent = error.message;
  }
}

function showAuth() {
  $("authScreen").classList.remove("hidden");
  $("appShell").classList.add("hidden");
}

function showApp() {
  $("authScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");

  const name = state.user?.displayName || state.user?.email?.split("@")[0] || "Shayla";
  $("userName").textContent = name;
  $("userInitials").textContent = initials(name);
  $("connectionBadge").textContent = state.mode === "firebase" ? "● Firebase Live" : "● Demo Mode";
  $("greeting").textContent = `${timeGreeting()}, ${name.split(" ")[0]}.`;

  renderAll();
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function loadDemo() {
  const saved = localStorage.getItem("mvcc-v05-demo");
  const source = saved ? JSON.parse(saved) : structuredClone(demoSeed);
  Object.assign(state, source);
  if (!state.currentServiceId && state.services.length) state.currentServiceId = state.services[0].id;
}

function saveDemo() {
  localStorage.setItem("mvcc-v05-demo", JSON.stringify({
    services: state.services,
    announcements: state.announcements,
    events: state.events,
    songs: state.songs,
    licenses: state.licenses,
    equipment: state.equipment,
    rentals: state.rentals,
    profiles: state.profiles,
    settings: state.settings
  }));
}

function startFirestoreListeners() {
  const collections = [
    ["services", "services"],
    ["announcements", "announcements"],
    ["events", "events"],
    ["songs", "songs"],
    ["licenses", "licenses"],
    ["equipment", "equipment"],
    ["rentals", "rentals"],
    ["profiles", "profiles"]
  ];

  for (const [collectionName, stateKey] of collections) {
    fb.onSnapshot(fb.collection(fb.db, collectionName), (snapshot) => {
      state[stateKey] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (stateKey === "services") {
        const sorted = sortedServices();
        if (!state.currentServiceId && sorted.length) state.currentServiceId = sorted[0].id;
      }
      renderAll();
    });
  }
}

async function loadSettings() {
  const settingsSnap = await fb.getDoc(fb.doc(fb.db, "settings", "church"));
  state.settings = settingsSnap.exists() ? settingsSnap.data() : {};
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  $(`${viewName}View`).classList.add("active");
  $("pageTitle").textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
  $("sidebar").classList.remove("open");
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "Pending";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatTime(value) {
  if (!value) return "Pending";
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2200);
}

function sortedServices() {
  return [...state.services].sort((a, b) => (a.serviceDate || "9999").localeCompare(b.serviceDate || "9999"));
}

function currentService() {
  return state.services.find((service) => service.id === state.currentServiceId) || sortedServices()[0] || null;
}

function renderAll() {
  renderServices();
  renderAnnouncements();
  renderEvents();
  renderMusic();
  renderEquipment();
  renderProfiles();
  renderCalendars();
  renderSettings();
  updateReportFilterOptions();
}

function renderServices() {
  const service = currentService();
  const readinessFields = ["sermonReady", "graphicsReady", "slidesReady", "audioReady", "streamReady", "camerasReady", "choirReady"];
  const readiness = service
    ? Math.round(readinessFields.filter((field) => service[field]).length / readinessFields.length * 100)
    : 0;

  $("readinessPercent").textContent = `${readiness}%`;

  $("serviceSnapshot").innerHTML = service
    ? `<div class="service-summary">
        <div><span>Date</span><strong>${formatDate(service.serviceDate)}</strong></div>
        <div><span>Call Time</span><strong>${formatTime(service.callTime)}</strong></div>
        <div><span>Sermon</span><strong>${escapeHtml(service.sermonTitle || "Pending")}</strong></div>
        <div><span>Scripture</span><strong>${escapeHtml(service.scripture || "Pending")}</strong></div>
      </div>`
    : `<div class="empty-state">No Sunday plan yet.</div>`;

  fillServiceForm(service);

  $("servicesList").innerHTML = sortedServices().map((item) => `
    <article class="data-card">
      <div>
        <span class="eyebrow">${formatDate(item.serviceDate)}</span>
        <h3>${escapeHtml(item.serviceName || "Sunday Service")}</h3>
        <p class="muted">${escapeHtml(item.sermonTitle || "Sermon pending")}${item.scripture ? ` · ${escapeHtml(item.scripture)}` : ""}</p>
        <div class="meta">
          ${item.callTime ? `<span class="pill">Call ${formatTime(item.callTime)}</span>` : ""}
          ${item.startTime ? `<span class="pill gold">Start ${formatTime(item.startTime)}</span>` : ""}
        </div>
      </div>
      <div class="card-actions">
        <button class="btn secondary small" type="button" data-edit-service="${item.id}">Edit</button>
        <button class="btn danger small" type="button" data-delete-type="service" data-delete-id="${item.id}">Delete</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No saved services yet.</div>`;
}

function fillServiceForm(service) {
  const fields = [
    "serviceDate", "serviceName", "callTime", "startTime", "sermonTitle", "scripture",
    "speaker", "choirName", "orderOfService", "serviceNotes", "sermonReady", "graphicsReady",
    "slidesReady", "audioReady", "streamReady", "camerasReady", "choirReady"
  ];

  $("serviceRecordId").value = service?.id || "";

  fields.forEach((id) => {
    const element = $(id);
    const value = service?.[id];

    if (element.type === "checkbox") element.checked = Boolean(value);
    else element.value = value ?? "";
  });
}

function clearServiceForm() {
  state.currentServiceId = null;
  $("serviceRecordId").value = "";
  [
    "serviceDate", "serviceName", "callTime", "startTime", "sermonTitle", "scripture",
    "speaker", "choirName", "orderOfService", "serviceNotes"
  ].forEach((id) => $(id).value = "");

  [
    "sermonReady", "graphicsReady", "slidesReady", "audioReady",
    "streamReady", "camerasReady", "choirReady"
  ].forEach((id) => $(id).checked = false);

  $("serviceDate").value = new Date().toISOString().slice(0, 10);
  $("callTime").value = state.settings.defaultCallTime || "07:45";
  showToast("New service form ready.");
}

function renderAnnouncements() {
  const announcements = [...state.announcements].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  $("announcementSnapshot").innerHTML = announcements.slice(0, 4).map((item) => `
    <div class="list-item">
      <div>
        <strong>${escapeHtml(item.title || "Untitled")}</strong>
        <small>${escapeHtml(item.message || "")}</small>
      </div>
      <span class="pill ${item.priority === "Urgent" ? "alert" : "gold"}">${escapeHtml(item.priority || "Normal")}</span>
    </div>
  `).join("") || `<div class="empty-state">No announcements.</div>`;

  $("announcementsList").innerHTML = announcements.map((item) => recordCard(
    "announcement",
    item,
    item.graphicStatus || "STATUS PENDING",
    item.title || "Untitled",
    item.message || "",
    [
      item.displayStart ? `Starts ${formatDate(item.displayStart)}` : "",
      item.displayEnd ? `Ends ${formatDate(item.displayEnd)}` : ""
    ]
  )).join("") || `<div class="empty-state">No announcements yet.</div>`;

  const graphics = announcements.filter((item) => item.graphicData || item.graphicUrl);

  $("graphicsGallery").innerHTML = graphics.map((item) => `
    <article class="graphic-card">
      <div class="graphic-thumb">
        <img src="${escapeHtml(item.graphicData || item.graphicUrl)}" alt="${escapeHtml(item.title || "Announcement graphic")}">
      </div>
      <div class="graphic-info">
        <span class="eyebrow">${escapeHtml(item.graphicStatus || "GRAPHIC")}</span>
        <h3>${escapeHtml(item.title || "Untitled Graphic")}</h3>
        <div class="meta">
          ${item.displayStart ? `<span class="pill">Show ${formatDate(item.displayStart)}</span>` : ""}
          ${item.displayEnd ? `<span class="pill gold">Through ${formatDate(item.displayEnd)}</span>` : ""}
        </div>
        <div class="card-actions top-gap">
          <button class="btn secondary small" type="button" data-edit-type="announcement" data-edit-id="${item.id}">Edit</button>
        </div>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No screen graphics uploaded yet.</div>`;
}

function recordCard(type, item, eyebrow, title, description, pills = []) {
  return `
    <article class="data-card">
      <div>
        <span class="eyebrow">${escapeHtml(eyebrow)}</span>
        <h3>${escapeHtml(title)}</h3>
        ${description ? `<p class="muted">${escapeHtml(description)}</p>` : ""}
        <div class="meta">
          ${pills.filter(Boolean).map((pill, index) => `<span class="pill ${index % 2 ? "gold" : ""}">${escapeHtml(pill)}</span>`).join("")}
        </div>
      </div>
      <div class="card-actions">
        <button class="btn secondary small" type="button" data-edit-type="${type}" data-edit-id="${item.id}">Edit</button>
        <button class="btn danger small" type="button" data-delete-type="${type}" data-delete-id="${item.id}">Delete</button>
      </div>
    </article>`;
}

function renderEvents() {
  const events = [...state.events].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  $("eventsList").innerHTML = events.map((item) => recordCard(
    "event",
    item,
    formatDate(item.date),
    item.title || "Untitled Event",
    item.coverage || "",
    [
      item.time ? formatTime(item.time) : "",
      item.location || ""
    ]
  )).join("") || `<div class="empty-state">No events yet.</div>`;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);

  const upcoming = events.filter((item) => {
    if (!item.date) return false;
    const date = new Date(`${item.date}T12:00:00`);
    return date >= today && date <= limit;
  });

  $("calendarUpcoming").innerHTML = upcoming.map((item) => recordCard(
    "event",
    item,
    formatDate(item.date),
    item.title || "Untitled Event",
    item.coverage || "",
    [item.time ? formatTime(item.time) : "", item.location || ""]
  )).join("") || `<div class="empty-state">No events in the next 30 days.</div>`;

  $("upcomingEvents").innerHTML = upcoming.slice(0, 4).map((item) => `
    <div class="list-item">
      <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.coverage || "")}</small></div>
      <span class="pill">${formatDate(item.date)}</span>
    </div>
  `).join("") || `<div class="empty-state">No upcoming events.</div>`;
}

function renderMusic() {
  const songs = [...state.songs].sort((a, b) => (a.serviceDate || "9999").localeCompare(b.serviceDate || "9999"));
  const licenses = [...state.licenses].sort((a, b) => (a.provider || "").localeCompare(b.provider || ""));

  $("songCount").textContent = songs.length;
  $("licenseCount").textContent = licenses.length;
  $("sundaySongCount").textContent = songs.filter((song) => song.serviceDate === new Date().toISOString().slice(0, 10)).length;

  $("songsList").innerHTML = songs.map((song) => recordCard(
    "song",
    song,
    song.servicePosition || "SONG",
    song.title || "Untitled Song",
    `${song.artist || ""}${song.choir ? ` · ${song.choir}` : ""}`,
    [
      song.serviceDate ? formatDate(song.serviceDate) : "",
      song.key ? `Key ${song.key}` : ""
    ]
  )).join("") || `<div class="empty-state">No songs added.</div>`;

  $("licensesList").innerHTML = licenses.map((license) => recordCard(
    "license",
    license,
    license.status || "Pending",
    license.provider || "Provider",
    license.licenseType || "",
    [
      license.licenseNumber ? `License ${license.licenseNumber}` : "",
      license.renewalDate ? `Renewal ${formatDate(license.renewalDate)}` : ""
    ]
  )).join("") || `<div class="empty-state">No copyright records.</div>`;

  $("musicSnapshot").innerHTML = songs.slice(0, 3).map((song) => `
    <div class="list-item">
      <div><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.servicePosition || song.choir || "Music")}</small></div>
      <span class="pill gold">${song.serviceDate ? formatDate(song.serviceDate) : "Unscheduled"}</span>
    </div>
  `).join("") || `<div class="empty-state">No music items.</div>`;
}

function rentalStatus(rental) {
  if (rental.status === "Returned") return "Returned";
  if (rental.dueDate && new Date(`${rental.dueDate}T23:59:59`) < new Date()) return "Overdue";
  return rental.status || "Checked Out";
}

function renderEquipment() {
  $("equipmentCount").textContent = state.equipment.length;

  const activeRentals = state.rentals.filter((rental) => rental.status !== "Returned");
  const overdueRentals = activeRentals.filter((rental) => rentalStatus(rental) === "Overdue");

  $("activeRentalCount").textContent = activeRentals.length;
  $("overdueRentalCount").textContent = overdueRentals.length;

  $("equipmentList").innerHTML = state.equipment.map((item) => recordCard(
    "equipment",
    item,
    item.category || "EQUIPMENT",
    item.name || "Unnamed",
    item.location || "",
    [item.status || "Unknown", item.condition || "Unknown"]
  )).join("") || `<div class="empty-state">No equipment yet.</div>`;

  const rentals = [...state.rentals].sort((a, b) => (b.checkoutDate || "").localeCompare(a.checkoutDate || ""));

  $("rentalsList").innerHTML = rentals.map((rental) => {
    const status = rentalStatus(rental);
    const cssStatus = status.toLowerCase().replace(/\s+/g, "-");

    return `
      <article class="data-card rental-card ${cssStatus}">
        <div>
          <span class="rental-status ${cssStatus}">${escapeHtml(status)}</span>
          <h3>${escapeHtml(rental.equipmentName || "Equipment Rental")}</h3>
          <p class="muted">Borrower: ${escapeHtml(rental.borrower || "Not entered")}</p>
          <div class="meta">
            ${rental.checkoutDate ? `<span class="pill">Out ${formatDate(rental.checkoutDate)}</span>` : ""}
            ${rental.dueDate ? `<span class="pill gold">Due ${formatDate(rental.dueDate)}</span>` : ""}
            ${rental.returnedDate ? `<span class="pill">Returned ${formatDate(rental.returnedDate)}</span>` : ""}
          </div>
          ${rental.notes ? `<p>${escapeHtml(rental.notes)}</p>` : ""}
        </div>
        <div class="card-actions">
          <button class="btn secondary small" type="button" data-edit-type="rental" data-edit-id="${rental.id}">Edit</button>
          ${status !== "Returned" ? `<button class="btn primary small" type="button" data-return-rental="${rental.id}">Mark Returned</button>` : ""}
          <button class="btn danger small" type="button" data-delete-type="rental" data-delete-id="${rental.id}">Delete</button>
        </div>
      </article>`;
  }).join("") || `<div class="empty-state">No equipment rentals yet.</div>`;

  const alerts = state.equipment.filter((item) => item.status !== "Ready" || item.condition === "Attention");

  $("equipmentSnapshot").innerHTML = [
    ...overdueRentals.slice(0, 2).map((rental) => ({
      name: rental.equipmentName || "Rental",
      detail: `Overdue · ${rental.borrower || "Borrower not entered"}`,
      status: "Overdue"
    })),
    ...alerts.slice(0, 3).map((item) => ({
      name: item.name,
      detail: item.location || "",
      status: item.status || item.condition
    }))
  ].map((item) => `
    <div class="list-item">
      <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.detail)}</small></div>
      <span class="pill alert">${escapeHtml(item.status)}</span>
    </div>
  `).join("") || `<div class="empty-state">No equipment alerts.</div>`;
}

function renderProfiles() {
  $("profilesList").innerHTML = state.profiles.map((profile) => `
    <article class="profile-card">
      <div class="profile-avatar">${escapeHtml(initials(profile.name || "?"))}</div>
      <div class="profile-content">
        <h3>${escapeHtml(profile.name || "Unnamed")}</h3>
        <p class="muted">${escapeHtml(profile.role || "Media Team")}</p>
        <small>${escapeHtml(profile.skills || "")}</small>
        <div class="card-actions top-gap">
          <button class="btn secondary small" type="button" data-edit-type="profile" data-edit-id="${profile.id}">Edit</button>
          <button class="btn danger small" type="button" data-delete-type="profile" data-delete-id="${profile.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No profiles yet.</div>`;
}

function renderCalendar(targetId, titleId) {
  const year = state.monthCursor.getFullYear();
  const month = state.monthCursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  $(titleId).textContent = state.monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  let html = names.map((name) => `<div class="day-name">${name}</div>`).join("");
  for (let blank = 0; blank < first.getDay(); blank += 1) html += "<div></div>";

  for (let day = 1; day <= last.getDate(); day += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = state.events.filter((event) => event.date === iso);
    const services = state.services.filter((service) => service.serviceDate === iso);
    const items = [
      ...services.map((service) => ({ title: service.serviceName || "Service", kind: "service" })),
      ...events.map((event) => ({ title: event.title || "Event", kind: "event" }))
    ];
    const isToday = iso === new Date().toISOString().slice(0, 10);

    html += `
      <div class="day ${isToday ? "today" : ""} ${items.length ? "has-event" : ""}">
        <strong>${day}</strong>
        ${items.slice(0, 3).map((item) => `<span class="event-dot">${escapeHtml(item.title)}</span>`).join("")}
      </div>`;
  }

  $(targetId).innerHTML = html;
}

function renderCalendars() {
  renderCalendar("dashboardCalendar", "dashboardCalendarTitle");
  renderCalendar("fullCalendar", "fullCalendarTitle");
}

function renderSettings() {
  $("churchName").value = state.settings.churchName || "Mount Vernon Baptist Church";
  $("churchWebsite").value = state.settings.churchWebsite || "https://www.greatermountvernonbc.org/";
  $("defaultCallTime").value = state.settings.defaultCallTime || "07:45";
}

async function saveRecord(type, id, data) {
  if (state.mode === "firebase") {
    const ref = fb.doc(fb.db, collectionMap[type], id);
    await fb.setDoc(ref, data, { merge: true });
  } else {
    const key = stateMap[type];
    const index = state[key].findIndex((item) => item.id === id);
    if (index >= 0) state[key][index] = { ...state[key][index], ...data, id };
    else state[key].push({ ...data, id });
    saveDemo();
    renderAll();
  }
}

async function createRecord(type, data) {
  if (state.mode === "firebase") {
    const docRef = await fb.addDoc(fb.collection(fb.db, collectionMap[type]), data);
    return docRef.id;
  }

  const id = crypto.randomUUID();
  state[stateMap[type]].push({ ...data, id });
  saveDemo();
  renderAll();
  return id;
}

async function deleteRecord(type, id) {
  if (!confirm("Delete this item?")) return;

  if (state.mode === "firebase") {
    await fb.deleteDoc(fb.doc(fb.db, collectionMap[type], id));
  } else {
    state[stateMap[type]] = state[stateMap[type]].filter((item) => item.id !== id);
    saveDemo();
    renderAll();
  }

  if (type === "service" && state.currentServiceId === id) state.currentServiceId = null;
  showToast("Item deleted.");
}

async function markRentalReturned(id) {
  const returnedDate = new Date().toISOString().slice(0, 10);
  await saveRecord("rental", id, {
    status: "Returned",
    returnedDate,
    updatedAt: new Date().toISOString()
  });
  showToast("Rental marked returned.");
}

const modalDefinitions = {
  announcement: {
    title: "Announcement",
    eyebrow: "COMMUNICATION + SCREEN GRAPHICS",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "message", label: "Message", type: "textarea" },
      { name: "priority", label: "Priority", type: "select", options: ["Normal", "Urgent"] },
      { name: "graphicStatus", label: "Graphic status", type: "select", options: ["Not Needed", "Requested", "In Progress", "Ready", "Shown", "Archived"] },
      { name: "displayStart", label: "Display start date", type: "date" },
      { name: "displayEnd", label: "Display end date", type: "date" },
      { name: "graphicUrl", label: "Graphic link", type: "url" },
      { name: "graphicFile", label: "Upload replacement thumbnail", type: "file" }
    ]
  },
  event: {
    title: "Event",
    eyebrow: "PRODUCTION CALENDAR",
    fields: [
      { name: "title", label: "Event title", type: "text", required: true },
      { name: "date", label: "Date", type: "date" },
      { name: "time", label: "Time", type: "time" },
      { name: "location", label: "Location", type: "text" },
      { name: "coverage", label: "Media coverage needed", type: "textarea" }
    ]
  },
  song: {
    title: "Song",
    eyebrow: "SERVICE MUSIC",
    fields: [
      { name: "title", label: "Song title", type: "text", required: true },
      { name: "artist", label: "Artist / composer", type: "text" },
      { name: "serviceDate", label: "Service date", type: "date" },
      { name: "servicePosition", label: "Place in service", type: "select", options: ["Opening Selection", "Praise & Worship", "Choir Selection", "Offering", "Invitation", "Closing", "Other"] },
      { name: "choir", label: "Choir / singer", type: "text" },
      { name: "key", label: "Musical key", type: "text" },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  license: {
    title: "Copyright License",
    eyebrow: "COPYRIGHT RECORD",
    fields: [
      { name: "provider", label: "Provider / organization", type: "text", required: true },
      { name: "licenseType", label: "License type", type: "text" },
      { name: "licenseNumber", label: "License number", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["Researching", "Active", "Renewal Due", "Expired", "Not Purchased"] },
      { name: "renewalDate", label: "Renewal date", type: "date" },
      { name: "notes", label: "Coverage notes", type: "textarea" }
    ]
  },
  equipment: {
    title: "Equipment",
    eyebrow: "INVENTORY",
    fields: [
      { name: "name", label: "Equipment name", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: ["Cameras", "Audio", "Lighting", "Streaming", "Computers", "Accessories"] },
      { name: "status", label: "Status", type: "select", options: ["Ready", "Checked Out", "Needs battery", "Needs repair", "Missing"] },
      { name: "location", label: "Location", type: "text" },
      { name: "condition", label: "Condition", type: "select", options: ["Good", "Fair", "Attention"] },
      { name: "serialNumber", label: "Serial number", type: "text" },
      { name: "notes", label: "Notes", type: "textarea" }
    ]
  },
  rental: {
    title: "Equipment Rental",
    eyebrow: "CHECKOUT RECORD",
    fields: [
      { name: "equipmentId", label: "Equipment", type: "equipment-select", required: true },
      { name: "borrower", label: "Borrower / ministry / organization", type: "text", required: true },
      { name: "checkoutDate", label: "Checkout date", type: "date" },
      { name: "dueDate", label: "Due date", type: "date" },
      { name: "status", label: "Status", type: "select", options: ["Checked Out", "Reserved", "Returned"] },
      { name: "returnedDate", label: "Returned date", type: "date" },
      { name: "contact", label: "Contact information", type: "text" },
      { name: "notes", label: "Rental notes", type: "textarea" }
    ]
  },
  profile: {
    title: "Media Profile",
    eyebrow: "TEAM MANAGEMENT",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "role", label: "Role", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "skills", label: "Skills", type: "textarea" },
      { name: "active", label: "Status", type: "select", options: ["Active", "Inactive", "Training"] }
    ]
  }
};

function getRecord(type, id) {
  return state[stateMap[type]].find((item) => item.id === id) || null;
}

function openModal(type, id = null) {
  const definition = modalDefinitions[type];
  if (!definition) return;

  const record = id ? getRecord(type, id) : null;

  state.modal = {
    type,
    id,
    existingGraphicData: record?.graphicData || null
  };

  $("entryForm").reset();
  $("entryModal").dataset.type = type;
  $("entryModal").dataset.id = id || "";
  $("modalTitle").textContent = `${id ? "Edit" : "Add"} ${definition.title}`;
  $("modalEyebrow").textContent = definition.eyebrow;
  $("modalMessage").textContent = "";

  $("modalFields").innerHTML = definition.fields.map((field) => {
    const optional = field.required ? "" : ` <span class="optional">(optional)</span>`;
    const required = field.required ? "required" : "";
    const value = record?.[field.name] ?? "";

    if (field.type === "textarea") {
      return `<label class="modal-field">${field.label}${optional}<textarea name="${field.name}" rows="4" ${required}>${escapeHtml(value)}</textarea></label>`;
    }

    if (field.type === "select") {
      return `<label class="modal-field">${field.label}${optional}
        <select name="${field.name}" ${required}>
          <option value="">Select…</option>
          ${field.options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>`;
    }

    if (field.type === "equipment-select") {
      return `<label class="modal-field">${field.label}${optional}
        <select name="${field.name}" ${required}>
          <option value="">Select equipment…</option>
          ${state.equipment.map((item) => `<option value="${item.id}" ${item.id === value ? "selected" : ""}>${escapeHtml(item.name || "Unnamed Equipment")}</option>`).join("")}
        </select>
      </label>`;
    }

    if (field.type === "file") {
      return `<label class="modal-field file-box">${field.label}${optional}
        <input id="graphicFileInput" name="${field.name}" type="file" accept="image/*">
        <div id="graphicPreview" class="preview ${record?.graphicData || record?.graphicUrl ? "show" : ""}">
          <img src="${escapeHtml(record?.graphicData || record?.graphicUrl || "")}" alt="Graphic preview">
        </div>
      </label>`;
    }

    return `<label class="modal-field">${field.label}${optional}<input name="${field.name}" type="${field.type}" value="${escapeHtml(value)}" ${required}></label>`;
  }).join("");

  const fileInput = $("graphicFileInput");
  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      try {
        fileInput.dataset.compressed = await compressImage(file);
        const preview = $("graphicPreview");
        preview.querySelector("img").src = fileInput.dataset.compressed;
        preview.classList.add("show");
      } catch {
        $("modalMessage").textContent = "The graphic could not be previewed.";
      }
    });
  }

  $("entryModal").showModal();
}

function closeModal() {
  $("entryForm").reset();
  $("modalMessage").textContent = "";
  state.modal = { type: null, id: null, existingGraphicData: null };
  if ($("entryModal").open) $("entryModal").close();
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();

      image.onerror = reject;
      image.onload = () => {
        const maxWidth = 900;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) switchView(viewButton.dataset.view);

  const modalButton = event.target.closest("[data-open-modal]");
  if (modalButton) openModal(modalButton.dataset.openModal);

  const editButton = event.target.closest("[data-edit-type]");
  if (editButton) openModal(editButton.dataset.editType, editButton.dataset.editId);

  const serviceEditButton = event.target.closest("[data-edit-service]");
  if (serviceEditButton) {
    state.currentServiceId = serviceEditButton.dataset.editService;
    fillServiceForm(currentService());
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Service loaded for editing.");
  }

  const deleteButton = event.target.closest("[data-delete-type]");
  if (deleteButton) {
    await deleteRecord(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
  }

  const returnButton = event.target.closest("[data-return-rental]");
  if (returnButton) await markRentalReturned(returnButton.dataset.returnRental);

  const subviewButton = event.target.closest("[data-subview]");
  if (subviewButton) {
    document.querySelectorAll(".subnav-button").forEach((button) => button.classList.toggle("active", button === subviewButton));
    document.querySelectorAll(".subview").forEach((panel) => panel.classList.toggle("active", panel.id === subviewButton.dataset.subview));
  }
});

$("menuButton").addEventListener("click", () => $("sidebar").classList.toggle("open"));
$("modalCloseButton").addEventListener("click", closeModal);
$("modalCancelButton").addEventListener("click", closeModal);
$("newServiceButton").addEventListener("click", clearServiceForm);

$("entryModal").addEventListener("click", (event) => {
  if (event.target === $("entryModal")) closeModal();
});

$("entryModal").addEventListener("cancel", (event) => {
  event.preventDefault();
  closeModal();
});

$("toggleAuth").addEventListener("click", () => {
  state.isRegister = !state.isRegister;
  $("authTitle").textContent = state.isRegister ? "Create team account" : "Welcome back";
  $("authSubmit").textContent = state.isRegister ? "Create account" : "Sign in";
  $("toggleAuth").textContent = state.isRegister ? "Already registered? Sign in" : "Need an account? Create one";
  $("nameField").classList.toggle("hidden", !state.isRegister);
});

$("demoButton").addEventListener("click", () => {
  state.mode = "demo";
  state.user = { displayName: "Shayla Kelly", email: "demo@mvcc.local" };
  loadDemo();
  showApp();
});

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("authMessage").textContent = "";

  try {
    const email = $("email").value;
    const password = $("password").value;

    if (state.isRegister) {
      const credential = await fb.createUserWithEmailAndPassword(fb.auth, email, password);
      const name = $("displayName").value.trim() || email.split("@")[0];

      await fb.updateProfile(credential.user, { displayName: name });
      await fb.setDoc(fb.doc(fb.db, "users", credential.user.uid), {
        name,
        email,
        role: "member",
        active: true,
        createdAt: new Date().toISOString()
      });
    } else {
      await fb.signInWithEmailAndPassword(fb.auth, email, password);
    }
  } catch (error) {
    $("authMessage").textContent = error.message.replace("Firebase: ", "");
  }
});

$("signOutButton").addEventListener("click", async () => {
  if (state.mode === "firebase") await fb.signOut(fb.auth);
  else location.reload();
});

$("saveServiceButton").addEventListener("click", async () => {
  const fieldIds = [
    "serviceDate", "serviceName", "callTime", "startTime", "sermonTitle", "scripture",
    "speaker", "choirName", "orderOfService", "serviceNotes", "sermonReady", "graphicsReady",
    "slidesReady", "audioReady", "streamReady", "camerasReady", "choirReady"
  ];

  const data = {};

  fieldIds.forEach((id) => {
    const element = $(id);
    data[id] = element.type === "checkbox" ? element.checked : element.value;
  });

  data.updatedAt = new Date().toISOString();

  const existingId = $("serviceRecordId").value;
  if (existingId) {
    await saveRecord("service", existingId, data);
    state.currentServiceId = existingId;
    showToast("Service updated.");
  } else {
    data.createdAt = new Date().toISOString();
    const newId = await createRecord("service", data);
    state.currentServiceId = newId;
    $("serviceRecordId").value = newId;
    showToast("Service saved.");
  }
});

$("saveSettingsButton").addEventListener("click", async () => {
  const data = {
    churchName: $("churchName").value,
    churchWebsite: $("churchWebsite").value,
    defaultCallTime: $("defaultCallTime").value,
    version: "0.5"
  };

  state.settings = data;

  if (state.mode === "firebase") {
    await fb.setDoc(fb.doc(fb.db, "settings", "church"), data, { merge: true });
  } else {
    saveDemo();
  }

  showToast("Settings saved.");
});

$("entryForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const type = state.modal.type;
  const id = state.modal.id;
  const data = Object.fromEntries(new FormData(event.currentTarget));

  if (type === "rental") {
    const equipment = state.equipment.find((item) => item.id === data.equipmentId);
    data.equipmentName = equipment?.name || "Equipment";
  }

  delete data.graphicFile;

  const graphicFileInput = $("graphicFileInput");
  if (graphicFileInput?.dataset.compressed) {
    data.graphicData = graphicFileInput.dataset.compressed;
  } else if (state.modal.existingGraphicData) {
    data.graphicData = state.modal.existingGraphicData;
  }

  Object.keys(data).forEach((key) => {
    if (data[key] === "") delete data[key];
  });

  data.updatedAt = new Date().toISOString();

  try {
    if (id) {
      await saveRecord(type, id, data);
      showToast("Entry updated.");
    } else {
      data.createdAt = new Date().toISOString();
      await createRecord(type, data);
      showToast("Entry saved.");
    }

    closeModal();
  } catch (error) {
    $("modalMessage").textContent = error.message;
  }
});

function changeMonth(amount) {
  state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth() + amount, 1);
  renderCalendars();
}

$("dashboardPrevMonth").addEventListener("click", () => changeMonth(-1));
$("dashboardNextMonth").addEventListener("click", () => changeMonth(1));
$("fullPrevMonth").addEventListener("click", () => changeMonth(-1));
$("fullNextMonth").addEventListener("click", () => changeMonth(1));

$("todayLabel").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric"
});


const reportDefinitions = {
  weeklyProduction: {
    title: "Weekly Production Packet",
    dateField: "Date",
    filterLabel: "Service",
    getRows() {
      return sortedServices().map((service) => ({
        "Date": service.serviceDate || "",
        "Service": service.serviceName || "Sunday Service",
        "Call Time": service.callTime ? formatTime(service.callTime) : "",
        "Start Time": service.startTime ? formatTime(service.startTime) : "",
        "Sermon": service.sermonTitle || "",
        "Scripture": service.scripture || "",
        "Speaker": service.speaker || "",
        "Choir": service.choirName || "",
        "Graphics": service.graphicsReady ? "Ready" : "Pending",
        "Slides": service.slidesReady ? "Ready" : "Pending",
        "Audio": service.audioReady ? "Ready" : "Pending",
        "Livestream": service.streamReady ? "Ready" : "Pending",
        "Cameras": service.camerasReady ? "Ready" : "Pending",
        "Notes": service.serviceNotes || ""
      }));
    }
  },
  serviceHistory: {
    title: "Service History",
    dateField: "Date",
    filterLabel: "Speaker",
    getRows() {
      return sortedServices().map((service) => ({
        "Date": service.serviceDate || "",
        "Service": service.serviceName || "",
        "Speaker": service.speaker || "",
        "Sermon": service.sermonTitle || "",
        "Scripture": service.scripture || "",
        "Call Time": service.callTime ? formatTime(service.callTime) : "",
        "Start Time": service.startTime ? formatTime(service.startTime) : "",
        "Choir": service.choirName || "",
        "Production Notes": service.serviceNotes || ""
      }));
    }
  },
  upcomingEvents: {
    title: "Upcoming Events",
    dateField: "Date",
    filterLabel: "Location",
    getRows() {
      const today = new Date();
      return [...state.events]
        .filter((event) => !event.date || new Date(`${event.date}T23:59:59`) >= today)
        .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"))
        .map((event) => ({
          "Date": event.date || "",
          "Time": event.time ? formatTime(event.time) : "",
          "Event": event.title || "",
          "Location": event.location || "",
          "Media Coverage": event.coverage || ""
        }));
    }
  },
  eventHistory: {
    title: "Event Production History",
    dateField: "Date",
    filterLabel: "Location",
    getRows() {
      return [...state.events]
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        .map((event) => ({
          "Date": event.date || "",
          "Time": event.time ? formatTime(event.time) : "",
          "Event": event.title || "",
          "Location": event.location || "",
          "Media Coverage": event.coverage || ""
        }));
    }
  },
  announcementLog: {
    title: "Announcement & Graphics Log",
    dateField: "Display Start",
    filterLabel: "Graphic Status",
    getRows() {
      return [...state.announcements].map((item) => ({
        "Announcement": item.title || "",
        "Message": item.message || "",
        "Priority": item.priority || "",
        "Graphic Status": item.graphicStatus || "",
        "Display Start": item.displayStart || "",
        "Display End": item.displayEnd || "",
        "Graphic Stored": item.graphicData || item.graphicUrl ? "Yes" : "No",
        "Graphic Link": item.graphicUrl || ""
      }));
    }
  },
  songHistory: {
    title: "Song History",
    dateField: "Service Date",
    filterLabel: "Choir / Singer",
    getRows() {
      return [...state.songs]
        .sort((a, b) => (a.serviceDate || "").localeCompare(b.serviceDate || ""))
        .map((song) => ({
          "Service Date": song.serviceDate || "",
          "Song": song.title || "",
          "Artist / Composer": song.artist || "",
          "Place in Service": song.servicePosition || "",
          "Choir / Singer": song.choir || "",
          "Key": song.key || "",
          "Notes": song.notes || ""
        }));
    }
  },
  copyrightReport: {
    title: "Copyright License Report",
    dateField: "Renewal Date",
    filterLabel: "Status",
    getRows() {
      return [...state.licenses].map((license) => ({
        "Provider": license.provider || "",
        "License Type": license.licenseType || "",
        "License Number": license.licenseNumber || "",
        "Status": license.status || "",
        "Renewal Date": license.renewalDate || "",
        "Coverage Notes": license.notes || ""
      }));
    }
  },
  equipmentInventory: {
    title: "Equipment Inventory",
    dateField: null,
    filterLabel: "Category",
    getRows() {
      return [...state.equipment].map((item) => ({
        "Equipment": item.name || "",
        "Category": item.category || "",
        "Status": item.status || "",
        "Condition": item.condition || "",
        "Location": item.location || "",
        "Serial Number": item.serialNumber || "",
        "Notes": item.notes || ""
      }));
    }
  },
  rentalHistory: {
    title: "Equipment Rental History",
    dateField: "Checkout Date",
    filterLabel: "Status",
    getRows() {
      return [...state.rentals]
        .sort((a, b) => (b.checkoutDate || "").localeCompare(a.checkoutDate || ""))
        .map((rental) => ({
          "Equipment": rental.equipmentName || "",
          "Borrower": rental.borrower || "",
          "Contact": rental.contact || "",
          "Checkout Date": rental.checkoutDate || "",
          "Due Date": rental.dueDate || "",
          "Returned Date": rental.returnedDate || "",
          "Status": rentalStatus(rental),
          "Notes": rental.notes || ""
        }));
    }
  },
  equipmentAlerts: {
    title: "Equipment Maintenance & Alerts",
    dateField: null,
    filterLabel: "Status",
    getRows() {
      return [...state.equipment]
        .filter((item) => item.status !== "Ready" || item.condition === "Attention")
        .map((item) => ({
          "Equipment": item.name || "",
          "Category": item.category || "",
          "Status": item.status || "",
          "Condition": item.condition || "",
          "Location": item.location || "",
          "Serial Number": item.serialNumber || "",
          "Maintenance Notes": item.notes || ""
        }));
    }
  },
  teamDirectory: {
    title: "Media Team Directory",
    dateField: null,
    filterLabel: "Status",
    getRows() {
      return [...state.profiles].map((profile) => ({
        "Name": profile.name || "",
        "Role": profile.role || "",
        "Email": profile.email || "",
        "Phone": profile.phone || "",
        "Status": profile.active || "Active",
        "Skills": profile.skills || ""
      }));
    }
  },
  skillsMatrix: {
    title: "Volunteer Skills Matrix",
    dateField: null,
    filterLabel: "Role",
    getRows() {
      const standardSkills = ["Audio", "Camera", "Graphics", "Lighting", "Streaming", "Slides", "Photography"];
      return [...state.profiles].map((profile) => {
        const skillText = (profile.skills || "").toLowerCase();
        const row = {
          "Name": profile.name || "",
          "Role": profile.role || "",
          "Status": profile.active || "Active"
        };
        standardSkills.forEach((skill) => {
          row[skill] = skillText.includes(skill.toLowerCase()) ? "Yes" : "";
        });
        row["Other Skills"] = profile.skills || "";
        return row;
      });
    }
  },
  annualSummary: {
    title: "Annual Ministry Summary",
    dateField: "Date",
    filterLabel: "Category",
    getRows() {
      const year = $("reportStartDate").value
        ? new Date(`${$("reportStartDate").value}T12:00:00`).getFullYear()
        : new Date().getFullYear();

      const inYear = (value) => value && new Date(`${value}T12:00:00`).getFullYear() === year;

      return [
        { "Date": `${year}-01-01`, "Category": "Services", "Total": state.services.filter((item) => inYear(item.serviceDate)).length, "Notes": "Saved worship-service listings" },
        { "Date": `${year}-01-01`, "Category": "Events", "Total": state.events.filter((item) => inYear(item.date)).length, "Notes": "Special events and productions" },
        { "Date": `${year}-01-01`, "Category": "Announcements", "Total": state.announcements.filter((item) => inYear(item.displayStart) || inYear((item.createdAt || "").slice(0, 10))).length, "Notes": "Announcement records" },
        { "Date": `${year}-01-01`, "Category": "Graphics", "Total": state.announcements.filter((item) => (item.graphicData || item.graphicUrl) && (inYear(item.displayStart) || inYear((item.createdAt || "").slice(0, 10)))).length, "Notes": "Announcements with stored graphics" },
        { "Date": `${year}-01-01`, "Category": "Songs", "Total": state.songs.filter((item) => inYear(item.serviceDate)).length, "Notes": "Song-use records" },
        { "Date": `${year}-01-01`, "Category": "Equipment Rentals", "Total": state.rentals.filter((item) => inYear(item.checkoutDate)).length, "Notes": "Checkout and rental records" },
        { "Date": `${year}-01-01`, "Category": "Equipment Inventory", "Total": state.equipment.length, "Notes": "Current inventory records" },
        { "Date": `${year}-01-01`, "Category": "Media Team Profiles", "Total": state.profiles.length, "Notes": "Current team profiles" }
      ];
    }
  }
};

let currentReport = { title: "", rows: [], columns: [] };

function updateReportFilterOptions() {
  const definition = reportDefinitions[$("reportType")?.value || "weeklyProduction"];
  const filter = $("reportFilter");
  if (!definition || !filter) return;

  const rows = definition.getRows();
  const field = definition.filterLabel;
  const values = [...new Set(rows.map((row) => row[field]).filter(Boolean))].sort();

  const existing = filter.value;
  filter.innerHTML = `<option value="">All records</option>` +
    values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");

  if (values.includes(existing)) filter.value = existing;
}

function dateInsideRange(value, start, end) {
  if (!value) return true;
  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
}

function buildSelectedReport() {
  const key = $("reportType").value;
  const definition = reportDefinitions[key];
  let rows = definition.getRows();

  const start = $("reportStartDate").value;
  const end = $("reportEndDate").value;
  const filter = $("reportFilter").value;

  if (definition.dateField && (start || end)) {
    rows = rows.filter((row) => dateInsideRange(row[definition.dateField], start, end));
  }

  if (filter && definition.filterLabel) {
    rows = rows.filter((row) => String(row[definition.filterLabel] || "") === filter);
  }

  const columns = rows.length
    ? Object.keys(rows[0])
    : Object.keys(definition.getRows()[0] || { "No Records": "" });

  currentReport = { key, title: definition.title, rows, columns };
  return currentReport;
}

function reportSummary(report) {
  const total = report.rows.length;
  const dated = report.rows.filter((row) => Object.values(row).some((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value)))).length;
  const ready = report.rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase() === "ready")).length;
  const overdue = report.rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase() === "overdue")).length;

  return [
    ["Records", total],
    ["Dated Records", dated],
    ["Ready", ready],
    ["Overdue", overdue]
  ];
}

function previewReport() {
  const report = buildSelectedReport();

  $("reportPreviewTitle").textContent = report.title;
  $("reportRowCount").textContent = `${report.rows.length} ${report.rows.length === 1 ? "record" : "records"}`;
  $("reportSummaryCards").innerHTML = reportSummary(report).map(([label, value]) => `
    <div class="report-summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join("");

  if (!report.rows.length) {
    $("reportPreview").innerHTML = `<div class="empty-state">No records match the selected report and filters.</div>`;
    return;
  }

  $("reportPreview").innerHTML = `
    <table class="report-table">
      <thead><tr>${report.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
      <tbody>
        ${report.rows.map((row) => `<tr>${report.columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>`;
}

function safeFileName(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function exportReportExcel() {
  const report = buildSelectedReport();

  if (!report.rows.length) {
    showToast("There are no records to export.");
    return;
  }

  if (!window.XLSX) {
    showToast("Excel export library did not load.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(report.rows, { header: report.columns });
  worksheet["!cols"] = report.columns.map((column) => ({
    wch: Math.min(45, Math.max(column.length + 2, ...report.rows.map((row) => String(row[column] ?? "").length + 2)))
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  const summaryRows = [
    ["Report", report.title],
    ["Generated", new Date().toLocaleString()],
    ["Start Date", $("reportStartDate").value || "All"],
    ["End Date", $("reportEndDate").value || "All"],
    ["Filter", $("reportFilter").value || "All"],
    ["Record Count", report.rows.length]
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 18 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  XLSX.writeFile(workbook, `${safeFileName(report.title)}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast("Excel report exported.");
}

function exportReportPdf() {
  const report = buildSelectedReport();

  if (!report.rows.length) {
    showToast("There are no records to export.");
    return;
  }

  if (!window.jspdf?.jsPDF) {
    showToast("PDF export library did not load.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const landscape = report.columns.length > 6;
  const doc = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "pt",
    format: "letter"
  });

  doc.setFillColor(18, 63, 130);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 72, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(state.settings.churchName || "Mount Vernon Baptist Church", 40, 30);
  doc.setFontSize(12);
  doc.text(report.title, 40, 52);

  doc.setTextColor(55, 65, 81);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()} · ${report.rows.length} records`, 40, 90);

  const body = report.rows.map((row) => report.columns.map((column) => String(row[column] ?? "")));

  doc.autoTable({
    startY: 105,
    head: [report.columns],
    body,
    theme: "grid",
    styles: {
      fontSize: landscape ? 6.5 : 7.5,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "top"
    },
    headStyles: {
      fillColor: [18, 63, 130],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    margin: { left: 32, right: 32 },
    didDrawPage(data) {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Page ${pageCount}`,
        doc.internal.pageSize.getWidth() - 65,
        doc.internal.pageSize.getHeight() - 18
      );
    }
  });

  doc.save(`${safeFileName(report.title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
  showToast("PDF report exported.");
}

function printCurrentReport() {
  previewReport();
  setTimeout(() => window.print(), 100);
}

$("reportType").addEventListener("change", () => {
  updateReportFilterOptions();
  previewReport();
});

$("reportStartDate").addEventListener("change", previewReport);
$("reportEndDate").addEventListener("change", previewReport);
$("reportFilter").addEventListener("change", previewReport);
$("previewReportButton").addEventListener("click", previewReport);
$("exportPdfButton").addEventListener("click", exportReportPdf);
$("exportExcelButton").addEventListener("click", exportReportExcel);
$("printReportButton").addEventListener("click", printCurrentReport);


initFirebase();
