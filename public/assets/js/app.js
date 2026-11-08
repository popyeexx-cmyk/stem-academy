const pageTitles = {
  dashboard: "Dashboard",
  classes: "Classes & People",
  subjects: "Subjects & Topics",
  assignments: "Assignments",
  assessments: "Assessments & Results",
  "course-hub": "Course Hub",
  attendance: "Attendance",
  communication: "Communication",
  activity: "Activity Logs",
  profile: "My Profile",
  settings: "Admin & Settings"
};

const pageDescriptions = {
  classes: "Manage grade groups, classes, teachers and student records.",
  subjects: "Organise the AJK Board Physics curriculum into subjects, chapters and topics.",
  assignments: "Create classroom assignments, set due dates and review submitted work.",
  assessments: "Prepare assessments, record marks and manage result visibility.",
  "course-hub": "Arrange learning resources and lesson sequences for each class.",
  attendance: "Record and review classroom attendance.",
  communication: "Share academy notices and classroom discussions.",
  activity: "Review important account and academic activity.",
  profile: "View account details and request profile corrections.",
  settings: "Manage academy configuration and access settings."
};

function renderPage(page) {
  const safePage = pageTitles[page] ? page : "dashboard";
  if (safePage === "assignments") { window.location.href = "/assignments.html"; return; }
  if (safePage === "assessments") { window.location.href = "/assessments.html"; return; }
  if (safePage === "course-hub") { window.location.href = "/course-hub.html"; return; }
  if (safePage === "attendance") { window.location.href = "/attendance.html"; return; }
  if (safePage === "communication") { window.location.href = "/communication.html"; return; }
  if (safePage === "subjects") { window.location.href = "/subjects.html"; return; }
  if (safePage === "classes") {
    window.location.href = "/classes.html";
    return;
  }
  document.querySelectorAll("[data-page]").forEach(link => {
    link.classList.toggle("active", link.dataset.page === safePage);
  });
  document.getElementById("currentSection").textContent = pageTitles[safePage];

  if (safePage === "dashboard") {
    window.location.hash = "dashboard";
    window.location.reload();
    return;
  }

  const content = document.getElementById("pageContent");
  content.innerHTML = `
    <div class="welcome-row">
      <div><p class="eyebrow">STEM ACADEMY WORKSPACE</p><h1>${pageTitles[safePage]}</h1><p class="muted">${pageDescriptions[safePage]}</p></div>
      <span class="preview-tag">COMING IN DEVELOPMENT</span>
    </div>
    <div class="notice"><span class="notice-icon">i</span><p><strong>Module planned:</strong> This section is part of the approved LMS scope. Its working features will be added in upcoming development steps.</p></div>
    <div class="empty-page"><div class="empty-icon">◫</div><h2>${pageTitles[safePage]}</h2><p>${pageDescriptions[safePage]} The interface and secure data operations for this module have not been implemented yet.</p></div>
    <footer>STEM Academy <span>•</span> AJK Board Physics <span>•</span> Development preview</footer>`;
  window.location.hash = safePage;
  document.getElementById("sidebar").classList.remove("open");
}

document.addEventListener("click", event => {
  const link = event.target.closest("[data-page]");
  if (link) {
    event.preventDefault();
    renderPage(link.dataset.page);
  }
});

document.getElementById("menuButton")?.addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

const initialPage = window.location.hash.replace("#", "") || "dashboard";
if (initialPage !== "dashboard" && pageTitles[initialPage]) {
  renderPage(initialPage);
}