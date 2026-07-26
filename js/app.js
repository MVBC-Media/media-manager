import { firebaseConfig } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const configured = Boolean(firebaseConfig.apiKey) && !firebaseConfig.apiKey.includes("PASTE_");

const state = {
  mode: configured ? "firebase" : "demo",
  user: null,
  isRegister: false,
  service: null,
  announcements: [],
  events: [],
  songs: [],
  licenses: [],
  equipment: [],
  profiles: [],
  settings: {},
  monthCursor: new Date()
};

let fb = {};

const demoSeed = {
  service: {
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
  },
  announcements: [
    { id: "demo-announcement", title: "Media Team Call Time", message: "Report by 7:45 AM Sunday.", priority: "Urgent", graphicStatus: "Ready" }
  ],
  events: [
    { id: "demo-event", title: "Monday Night Study Hour", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: "18:00", location: "Sanctuary", coverage: "Slides and livestream" }
  ],
  songs: [
    { id: "demo-song", title: "Total Praise", artist: "Richard Smallwood", serviceDate: new Date().toISOString().slice(0, 10), servicePosition: "Choir Selection", choir: "Mass Choir", notes: "Confirm track and soloist." }
  ],
  licenses: [
    { id: "demo-license", provider: "CCLI", licenseType: "Church Copyright License", status: "Researching", notes: "Streaming coverage under review." }
  ],
  equipment: [
    { id: "demo-camera", name: "Camera 1", category: "Cameras", status: "Ready", location: "Booth", condition: "Good" },
    { id: "demo-mic", name: "Wireless Microphone 3", category: "Audio", status: "Needs battery", location: "Audio cabinet", condition: "Attention" }
  ],
  profiles: [
    { id: "demo-profile", name: "Shayla Kelly", role: "Administrator / Graphics", skills: "Graphics, slides, planning" }
  ],
  settings: {}
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
        await loadSingleDocuments();
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
  const saved = localStorage.getItem("mvcc-v04-demo");
  const source = saved ? JSON.parse(saved) : structuredClone(demoSeed);
  Object.assign(state, source);
}

function saveDemo() {
  localStorage.setItem("mvcc-v04-demo", JSON.stringify({
    service: state.service,
    announcements: state.announcements,
    events: state.events,
    songs: state.songs,
    licenses: state.licenses,
    equipment: state.equipment,
    profiles: state.profiles,
    settings: state.settings
  }));
}

function startFirestoreListeners() {
  const collections = [
    ["announcements", "announcements"],
    ["events", "events"],
    ["songs", "songs"],
    ["licenses", "licenses"],
    ["equipment", "equipment"],
    ["profiles", "profiles"]
  ];

  for (const [collectionName, stateKey] of collections) {
    fb.onSnapshot(fb.collection(fb.db, collectionName), (snapshot) => {
      state[stateKey] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderAll();
    });
  }
}

async function loadSingleDocuments() {
  const serviceSnap = await fb.getDoc(fb.doc(fb.db, "services", "current"));
  state.service = serviceSnap.exists() ? serviceSnap.data() : null;

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

function renderAll() {
  renderService();
  renderAnnouncements();
  renderEvents();
  renderMusic();
  renderEquipment();
  renderProfiles();
  renderCalendars();
  renderSettings();
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

function renderService() {
  const service = state.service;
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

  if (service) {
    for (const [key, value] of Object.entries(service)) {
      const element = $(key);
      if (!element) continue;
      if (element.type === "checkbox") element.checked = Boolean(value);
      else element.value = value ?? "";
    }
  }
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

  $("announcementsList").innerHTML = announcements.map((item) => `
    <article class="data-card">
      <div>
        <span class="eyebrow">${escapeHtml(item.graphicStatus || "STATUS PENDING")}</span>
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        <p class="muted">${escapeHtml(item.message || "")}</p>
        <div class="meta">
          ${item.displayStart ? `<span class="pill">Starts ${formatDate(item.displayStart)}</span>` : ""}
          ${item.displayEnd ? `<span class="pill gold">Ends ${formatDate(item.displayEnd)}</span>` : ""}
        </div>
      </div>
      <div class="card-actions">
        <button class="btn secondary" type="button" data-delete-type="announcement" data-delete-id="${item.id}">Delete</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No announcements yet.</div>`;

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
      </div>
    </article>
  `).join("") || `<div class="empty-state">No screen graphics uploaded yet.</div>`;
}

function renderEvents() {
  const events = [...state.events].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const eventCard = (item) => `
    <article class="data-card">
      <div>
        <span class="eyebrow">${formatDate(item.date)}</span>
        <h3>${escapeHtml(item.title || "Untitled Event")}</h3>
        <p class="muted">${escapeHtml(item.coverage || "")}</p>
        <div class="meta">
          ${item.time ? `<span class="pill">${formatTime(item.time)}</span>` : ""}
          ${item.location ? `<span class="pill gold">${escapeHtml(item.location)}</span>` : ""}
        </div>
      </div>
      <div class="card-actions">
        <button class="btn secondary" type="button" data-delete-type="event" data-delete-id="${item.id}">Delete</button>
      </div>
    </article>`;

  $("eventsList").innerHTML = events.map(eventCard).join("") || `<div class="empty-state">No events yet.</div>`;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);

  const upcoming = events.filter((item) => {
    if (!item.date) return false;
    const date = new Date(`${item.date}T12:00:00`);
    return date >= today && date <= limit;
  });

  $("calendarUpcoming").innerHTML = upcoming.map(eventCard).join("") || `<div class="empty-state">No events in the next 30 days.</div>`;

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

  $("songsList").innerHTML = songs.map((song) => `
    <article class="data-card">
      <div>
        <span class="eyebrow">${escapeHtml(song.servicePosition || "SONG")}</span>
        <h3>${escapeHtml(song.title || "Untitled Song")}</h3>
        <p class="muted">${escapeHtml(song.artist || "")}${song.choir ? ` · ${escapeHtml(song.choir)}` : ""}</p>
        <div class="meta">
          ${song.serviceDate ? `<span class="pill">${formatDate(song.serviceDate)}</span>` : ""}
          ${song.key ? `<span class="pill gold">Key ${escapeHtml(song.key)}</span>` : ""}
        </div>
        ${song.notes ? `<p>${escapeHtml(song.notes)}</p>` : ""}
      </div>
      <div class="card-actions">
        <button class="btn secondary" type="button" data-delete-type="song" data-delete-id="${song.id}">Delete</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No songs added.</div>`;

  $("licensesList").innerHTML = licenses.map((license) => `
    <article class="data-card">
      <div>
        <span class="license-status">${escapeHtml(license.status || "Pending")}</span>
        <h3>${escapeHtml(license.provider || "Provider")}</h3>
        <p class="muted">${escapeHtml(license.licenseType || "")}</p>
        ${license.licenseNumber ? `<p><strong>License:</strong> ${escapeHtml(license.licenseNumber)}</p>` : ""}
        ${license.renewalDate ? `<span class="pill gold">Renewal ${formatDate(license.renewalDate)}</span>` : ""}
        ${license.notes ? `<p>${escapeHtml(license.notes)}</p>` : ""}
      </div>
      <div class="card-actions">
        <button class="btn secondary" type="button" data-delete-type="license" data-delete-id="${license.id}">Delete</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No copyright records.</div>`;

  $("musicSnapshot").innerHTML = songs.slice(0, 3).map((song) => `
    <div class="list-item">
      <div><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.servicePosition || song.choir || "Music")}</small></div>
      <span class="pill gold">${song.serviceDate ? formatDate(song.serviceDate) : "Unscheduled"}</span>
    </div>
  `).join("") || `<div class="empty-state">No music items.</div>`;
}

function renderEquipment() {
  $("equipmentList").innerHTML = state.equipment.map((item) => `
    <article class="data-card">
      <div>
        <span class="eyebrow">${escapeHtml(item.category || "EQUIPMENT")}</span>
        <h3>${escapeHtml(item.name || "Unnamed")}</h3>
        <p class="muted">${escapeHtml(item.location || "")}</p>
        <div class="meta">
          <span class="pill">${escapeHtml(item.status || "Unknown")}</span>
          <span class="pill gold">${escapeHtml(item.condition || "Unknown")}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn secondary" type="button" data-delete-type="equipment" data-delete-id="${item.id}">Delete</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No equipment yet.</div>`;

  const alerts = state.equipment.filter((item) => item.status !== "Ready" || item.condition === "Attention");

  $("equipmentSnapshot").innerHTML = alerts.slice(0, 4).map((item) => `
    <div class="list-item">
      <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.location || "")}</small></div>
      <span class="pill alert">${escapeHtml(item.status || item.condition)}</span>
    </div>
  `).join("") || `<div class="empty-state">No equipment alerts.</div>`;
}

function renderProfiles() {
  $("profilesList").innerHTML = state.profiles.map((profile) => `
    <article class="profile-card">
      <div class="profile-avatar">${escapeHtml(initials(profile.name || "?"))}</div>
      <div>
        <h3>${escapeHtml(profile.name || "Unnamed")}</h3>
        <p class="muted">${escapeHtml(profile.role || "Media Team")}</p>
        <small>${escapeHtml(profile.skills || "")}</small>
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
    const isToday = iso === new Date().toISOString().slice(0, 10);

    html += `
      <div class="day ${isToday ? "today" : ""} ${events.length ? "has-event" : ""}">
        <strong>${day}</strong>
        ${events.slice(0, 2).map((event) => `<span class="event-dot">${escapeHtml(event.title)}</span>`).join("")}
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

async function saveDocument(collectionName, documentId, data) {
  if (state.mode === "firebase") {
    await fb.setDoc(fb.doc(fb.db, collectionName, documentId), data, { merge: true });
  } else {
    saveDemo();
  }
}

const collectionMap = {
  announcement: "announcements",
  event: "events",
  song: "songs",
  license: "licenses",
  equipment: "equipment",
  profile: "profiles"
};

const stateMap = {
  announcement: "announcements",
  event: "events",
  song: "songs",
  license: "licenses",
  equipment: "equipment",
  profile: "profiles"
};

async function addRecord(type, data) {
  if (state.mode === "firebase") {
    await fb.addDoc(fb.collection(fb.db, collectionMap[type]), data);
  } else {
    data.id = crypto.randomUUID();
    state[stateMap[type]].push(data);
    saveDemo();
    renderAll();
  }
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

  showToast("Item deleted.");
}

const modalDefinitions = {
  announcement: {
    title: "New Announcement",
    eyebrow: "COMMUNICATION + SCREEN GRAPHICS",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "message", label: "Message", type: "textarea" },
      { name: "priority", label: "Priority", type: "select", options: ["Normal", "Urgent"] },
      { name: "graphicStatus", label: "Graphic status", type: "select", options: ["Not Needed", "Requested", "In Progress", "Ready", "Shown", "Archived"] },
      { name: "displayStart", label: "Display start date", type: "date" },
      { name: "displayEnd", label: "Display end date", type: "date" },
      { name: "graphicUrl", label: "Graphic link", type: "url" },
      { name: "graphicFile", label: "Upload graphic thumbnail", type: "file" }
    ]
  },
  event: {
    title: "New Event",
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
    title: "Add Song",
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
    title: "Add Copyright License",
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
    title: "Add Equipment",
    eyebrow: "INVENTORY",
    fields: [
      { name: "name", label: "Equipment name", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: ["Cameras", "Audio", "Lighting", "Streaming", "Computers", "Accessories"] },
      { name: "status", label: "Status", type: "select", options: ["Ready", "Checked Out", "Needs battery", "Needs repair", "Missing"] },
      { name: "location", label: "Location", type: "text" },
      { name: "condition", label: "Condition", type: "select", options: ["Good", "Fair", "Attention"] }
    ]
  },
  profile: {
    title: "Add Media Profile",
    eyebrow: "TEAM MANAGEMENT",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "role", label: "Role", type: "text" },
      { name: "skills", label: "Skills", type: "textarea" }
    ]
  }
};

function openModal(type) {
  const definition = modalDefinitions[type];
  if (!definition) return;

  $("entryForm").reset();
  $("entryModal").dataset.type = type;
  $("modalTitle").textContent = definition.title;
  $("modalEyebrow").textContent = definition.eyebrow;
  $("modalMessage").textContent = "";

  $("modalFields").innerHTML = definition.fields.map((field) => {
    const optional = field.required ? "" : ` <span class="optional">(optional)</span>`;
    const required = field.required ? "required" : "";

    if (field.type === "textarea") {
      return `<label class="modal-field">${field.label}${optional}<textarea name="${field.name}" rows="4" ${required}></textarea></label>`;
    }

    if (field.type === "select") {
      return `<label class="modal-field">${field.label}${optional}
        <select name="${field.name}">
          <option value="">Select…</option>
          ${field.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>`;
    }

    if (field.type === "file") {
      return `<label class="modal-field file-box">${field.label}${optional}
        <input id="graphicFileInput" name="${field.name}" type="file" accept="image/*">
        <div id="graphicPreview" class="preview"><img alt="Graphic preview"></div>
      </label>`;
    }

    return `<label class="modal-field">${field.label}${optional}<input name="${field.name}" type="${field.type}" ${required}></label>`;
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
      } catch (error) {
        $("modalMessage").textContent = "The graphic could not be previewed.";
      }
    });
  }

  $("entryModal").showModal();
}

function closeModal() {
  $("entryForm").reset();
  $("modalMessage").textContent = "";
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

  const deleteButton = event.target.closest("[data-delete-type]");
  if (deleteButton) {
    await deleteRecord(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
  }

  const subviewButton = event.target.closest("[data-subview]");
  if (subviewButton) {
    document.querySelectorAll(".subnav-button").forEach((button) => button.classList.toggle("active", button === subviewButton));
    document.querySelectorAll(".subview").forEach((panel) => panel.classList.toggle("active", panel.id === subviewButton.dataset.subview));
  }
});

$("menuButton").addEventListener("click", () => $("sidebar").classList.toggle("open"));
$("modalCloseButton").addEventListener("click", closeModal);
$("modalCancelButton").addEventListener("click", closeModal);

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
  state.service = data;

  await saveDocument("services", "current", data);
  renderAll();
  showToast("Sunday plan saved.");
});

$("saveSettingsButton").addEventListener("click", async () => {
  const data = {
    churchName: $("churchName").value,
    churchWebsite: $("churchWebsite").value,
    defaultCallTime: $("defaultCallTime").value,
    version: "0.4"
  };

  state.settings = data;
  await saveDocument("settings", "church", data);
  showToast("Settings saved.");
});

$("entryForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const type = $("entryModal").dataset.type;
  const data = Object.fromEntries(new FormData(event.currentTarget));

  delete data.graphicFile;

  const graphicFileInput = $("graphicFileInput");
  if (graphicFileInput?.dataset.compressed) data.graphicData = graphicFileInput.dataset.compressed;

  Object.keys(data).forEach((key) => {
    if (data[key] === "") delete data[key];
  });

  data.createdAt = new Date().toISOString();

  try {
    await addRecord(type, data);
    closeModal();
    showToast("Item saved.");
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

initFirebase();
