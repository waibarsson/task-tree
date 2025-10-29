/* TaskTree — simple tree-structured task manager
 * - Projects with nested tasks
 * - Status traffic light (red/yellow/green)
 * - LocalStorage persistence
 * - Trash (soft delete) + empty
 * - Swipe up to move task up among siblings (touch); button for desktop
 * - Share: Web Share API or link with state in URL hash; Export/Import JSON
 */

const STORAGE_KEY = "tasktree_v1";

const el = (sel, root=document) => root.querySelector(sel);
const els = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }

const state = {
  projects: [],
  trash: [],
};

// Load from localStorage or URL hash
(function bootstrap() {
  const fromHash = loadFromHashIfPresent();
  if (fromHash) {
    Object.assign(state, fromHash);
    persist();
  } else {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { Object.assign(state, JSON.parse(saved)); }
      catch(e) { console.warn("Bad storage, resetting", e); }
    } else {
      // Seed example project
      state.projects.push({
        id: uid(), title: "Ukázkový projekt", tasks: [
          { id: uid(), title: "Naplánovat milníky", status: "yellow", children: [] },
          { id: uid(), title: "Vytvořit wireframy", status: "red", children: [
              { id: uid(), title: "Domovská stránka", status: "green", children: []},
              { id: uid(), title: "Detail úkolu", status: "yellow", children: []},
            ]
          },
        ]
      });
    }
  }
  render();
})();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const container = el("#projects");
  container.innerHTML = "";
  state.projects.forEach(project => {
    container.appendChild(renderProject(project));
  });
}

function renderProject(project) {
  const tpl = el("#tpl-project").content.cloneNode(true);
  const article = tpl.querySelector(".project");
  tpl.querySelector(".project-title").textContent = project.title;

  const ul = tpl.querySelector(".task-tree");
  (project.tasks || []).forEach(t => ul.appendChild(renderTask(project.id, t)));

  tpl.querySelector('[data-action="add-task"]').addEventListener("click", () => openTaskDialog(project.id, null));
  tpl.querySelector('[data-action="delete-project"]').addEventListener("click", () => deleteProject(project.id));

  return article;
}

function renderTask(projectId, task) {
  const tpl = el("#tpl-task").content.cloneNode(true);
  const li = tpl.querySelector(".task-node");
  const row = tpl.querySelector(".task-row");
  const title = tpl.querySelector(".task-title");
  const dot = tpl.querySelector(".status-dot");
  const childrenUl = tpl.querySelector(".children");

  title.textContent = task.title;
  applyStatus(dot, task.status);

  dot.addEventListener("click", () => {
    task.status = nextStatus(task.status);
    applyStatus(dot, task.status);
    persist();
  });

  // Actions
  tpl.querySelector('[data-action="add-subtask"]').addEventListener("click", () => openTaskDialog(projectId, task.id));
  tpl.querySelector('[data-action="delete-task"]').addEventListener("click", () => deleteTask(projectId, task.id));
  tpl.querySelector('[data-action="move-up"]').addEventListener("click", () => moveTaskUp(projectId, task.id));
  tpl.querySelector('[data-action="share-task"]').addEventListener("click", () => shareTask(task));

  // Touch swipe up to move up among siblings
  let touchStartY = null, touchStartX = null, moved = false;
  row.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStartY = t.clientY;
    touchStartX = t.clientX;
    moved = false;
  }, {passive: true});
  row.addEventListener("touchmove", (e) => {
    moved = true;
  }, {passive: true});
  row.addEventListener("touchend", (e) => {
    if (touchStartY == null) return;
    const t = e.changedTouches[0];
    const dy = t.clientY - touchStartY;
    const dx = Math.abs(t.clientX - touchStartX);
    // Upward swipe with minimal horizontal movement
    if (moved && dy < -30 && dx < 50) {
      moveTaskUp(projectId, task.id);
      row.animate([{transform:"translateY(0)"},{transform:"translateY(-8px)"},{transform:"translateY(0)"}], {duration: 250});
    }
    touchStartY = null;
  }, {passive: true});

  // Children
  (task.children || []).forEach(ch => childrenUl.appendChild(renderTask(projectId, ch)));
  return li;
}

function applyStatus(elm, status) {
  elm.classList.remove("status-red", "status-yellow", "status-green");
  if (status === "red") elm.classList.add("status-red");
  else if (status === "yellow") elm.classList.add("status-yellow");
  else if (status === "green") elm.classList.add("status-green");
}

function nextStatus(s) {
  return s === "red" ? "yellow" : s === "yellow" ? "green" : "red";
}

// Dialog wiring
const dlgProject = el("#dlg-project");
el("#btn-new-project").addEventListener("click", () => {
  el("#project-name").value = "";
  dlgProject.showModal();
});
el("#project-create").addEventListener("click", (e) => {
  const name = el("#project-name").value.trim();
  if (!name) return;
  state.projects.push({ id: uid(), title: name, tasks: [] });
  persist(); render();
});

const dlgTask = el("#dlg-task");
let dialogContext = { projectId: null, parentTaskId: null };
function openTaskDialog(projectId, parentTaskId) {
  dialogContext = { projectId, parentTaskId };
  el("#task-name").value = "";
  dlgTask.showModal();
}
el("#task-create").addEventListener("click", () => {
  const name = el("#task-name").value.trim();
  if (!name) return;
  const p = state.projects.find(p => p.id === dialogContext.projectId);
  if (!p) return;

  const newTask = { id: uid(), title: name, status: "yellow", children: [] };

  if (dialogContext.parentTaskId) {
    const parent = findTask(p.tasks, dialogContext.parentTaskId);
    if (parent) parent.children.push(newTask);
  } else {
    p.tasks.push(newTask);
  }
  persist(); render();
});

// Helpers to find & mutate tasks
function findTask(list, id) {
  for (const t of list) {
    if (t.id === id) return t;
    const inChild = findTask(t.children || [], id);
    if (inChild) return inChild;
  }
  return null;
}
function findParent(list, id, parent=null) {
  for (const t of list) {
    if (t.id === id) return {parent, node:t};
    const found = findParent(t.children || [], id, t);
    if (found) return found;
  }
  return null;
}

function deleteProject(projectId) {
  const idx = state.projects.findIndex(p => p.id === projectId);
  if (idx >= 0) {
    const removed = state.projects.splice(idx, 1)[0];
    state.trash.push({ kind: "project", item: removed, deletedAt: Date.now() });
    persist(); render();
  }
}

function deleteTask(projectId, taskId) {
  const p = state.projects.find(p => p.id === projectId);
  if (!p) return;
  const { parent, node } = findParent(p.tasks, taskId) || {};
  if (!node) return;
  const list = parent ? parent.children : p.tasks;
  const idx = list.findIndex(t => t.id === taskId);
  if (idx >= 0) {
    const removed = list.splice(idx, 1)[0];
    state.trash.push({ kind: "task", projectId, item: removed, deletedAt: Date.now() });
    persist(); render();
  }
}

function moveTaskUp(projectId, taskId) {
  const p = state.projects.find(p => p.id === projectId);
  if (!p) return;
  const found = findParent(p.tasks, taskId);
  if (!found) return;
  const list = found.parent ? found.parent.children : p.tasks;
  const idx = list.findIndex(t => t.id === taskId);
  if (idx > 0) {
    [list[idx-1], list[idx]] = [list[idx], list[idx-1]];
    persist(); render();
  }
}

// Trash UI
const dlgTrash = el("#dlg-trash");
el("#btn-trash").addEventListener("click", () => { renderTrash(); dlgTrash.showModal(); });
el("#trash-empty").addEventListener("click", () => {
  state.trash = [];
  persist(); renderTrash();
});
function renderTrash() {
  const host = el("#trash-list");
  host.innerHTML = "";
  if (!state.trash.length) {
    host.innerHTML = "<p>Koš je prázdný.</p>";
    return;
  }
  state.trash
    .sort((a,b) => b.deletedAt - a.deletedAt)
    .forEach((entry, idx) => {
      const div = document.createElement("div");
      div.className = "trash-item";
      const title = entry.kind === "project" ? entry.item.title : entry.item.title;
      div.innerHTML = `
        <span>${entry.kind === "project" ? "Projekt" : "Úkol"}: <strong>${escapeHtml(title)}</strong></span>
        <span style="margin-left:auto;"></span>
      `;
      const btnRestore = document.createElement("button");
      btnRestore.className = "btn tiny";
      btnRestore.textContent = "Obnovit";
      btnRestore.addEventListener("click", () => restoreFromTrash(idx));
      const btnDelete = document.createElement("button");
      btnDelete.className = "btn tiny danger";
      btnDelete.textContent = "Smazat trvale";
      btnDelete.addEventListener("click", () => { state.trash.splice(idx,1); persist(); renderTrash(); });
      div.appendChild(btnRestore);
      div.appendChild(btnDelete);
      host.appendChild(div);
    });
}
function restoreFromTrash(index) {
  const entry = state.trash.splice(index,1)[0];
  if (!entry) return;
  if (entry.kind === "project") {
    state.projects.push(entry.item);
  } else if (entry.kind === "task") {
    const p = state.projects.find(p => p.id === entry.projectId);
    if (p) p.tasks.push(entry.item);
  }
  persist(); render(); renderTrash();
}

// Import / Export / Share
el("#btn-export").addEventListener("click", () => {
  const data = JSON.stringify(state);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "tasktree-export.json";
  a.click();
  URL.revokeObjectURL(url);
});

const dlgImport = el("#dlg-import");
el("#btn-import").addEventListener("click", () => {
  el("#import-text").value = "";
  dlgImport.showModal();
});
el("#import-apply").addEventListener("click", () => {
  try {
    const json = JSON.parse(el("#import-text").value);
    if (!json || !Array.isArray(json.projects)) throw new Error("Neplatný formát");
    state.projects = json.projects || [];
    state.trash = json.trash || [];
    persist(); render();
  } catch (e) {
    alert("Import selhal: " + e.message);
  }
});

el("#btn-share").addEventListener("click", async () => {
  const link = buildShareLink();
  await shareOrCopy("Moje TaskTree", link);
});

async function shareTask(task) {
  const payload = { projects: [{ id: uid(), title: "Sdílený výřez", tasks: [task] }], trash: [] };
  const link = buildShareLink(payload);
  await shareOrCopy(task.title, link);
}

function buildShareLink(snapshot = null) {
  const data = snapshot || state;
  const str = JSON.stringify(data);
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return location.origin + location.pathname + "#data=" + b64;
}

async function shareOrCopy(title, url) {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Odkaz zkopírován do schránky.");
    }
  } catch (e) {
    await navigator.clipboard.writeText(url);
    alert("Odkaz zkopírován do schránky.");
  }
}

function loadFromHashIfPresent() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const data = hash.get("data");
  if (!data) return null;
  try {
    const json = JSON.parse(decodeURIComponent(escape(atob(data))));
    if (json && Array.isArray(json.projects)) return json;
  } catch(e) { console.warn("Hash decode failed", e); }
  return null;
}

// Util
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Keyboard: Enter toggles status, Shift+ArrowUp moves up
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.classList.contains("task-row")) {
    e.target.querySelector(".status-dot").click();
  } else if ((e.key === "ArrowUp" && e.shiftKey) && e.target.classList.contains("task-row")) {
    const id = getTaskIdFromRow(e.target);
    if (!id) return;
    const proj = findProjectIdFromRow(e.target);
    if (!proj) return;
    moveTaskUp(proj, id);
  }
});

function getTaskIdFromRow(row) {
  // we encode the task id into a data attribute when rendering? we didn't.
  // Instead, walk the DOM to find title text and locate node; ambiguous.
  // We'll enhance: when rendering, attach dataset ids.
  return row.dataset.taskId || null;
}
function findProjectIdFromRow(row) {
  return row.dataset.projectId || row.closest(".project")?.dataset.projectId || null;
}

// Patch: When rendering tasks/projects, attach dataset attributes
const _renderProject = renderProject;
renderProject = function(project) {
  const tpl = el("#tpl-project").content.cloneNode(true);
  const article = tpl.querySelector(".project");
  article.dataset.projectId = project.id;
  tpl.querySelector(".project-title").textContent = project.title;

  const ul = tpl.querySelector(".task-tree");
  (project.tasks || []).forEach(t => ul.appendChild(renderTask(project.id, t)));

  tpl.querySelector('[data-action="add-task"]').addEventListener("click", () => openTaskDialog(project.id, null));
  tpl.querySelector('[data-action="delete-project"]').addEventListener("click", () => deleteProject(project.id));

  return article;
}

const _renderTask = renderTask;
renderTask = function(projectId, task) {
  const tpl = el("#tpl-task").content.cloneNode(true);
  const li = tpl.querySelector(".task-node");
  const row = tpl.querySelector(".task-row");
  const title = tpl.querySelector(".task-title");
  const dot = tpl.querySelector(".status-dot");
  const childrenUl = tpl.querySelector(".children");

  row.dataset.taskId = task.id;
  row.dataset.projectId = projectId;

  title.textContent = task.title;
  applyStatus(dot, task.status);

  dot.addEventListener("click", () => {
    task.status = nextStatus(task.status);
    applyStatus(dot, task.status);
    persist();
  });

  tpl.querySelector('[data-action="add-subtask"]').addEventListener("click", () => openTaskDialog(projectId, task.id));
  tpl.querySelector('[data-action="delete-task"]').addEventListener("click", () => deleteTask(projectId, task.id));
  tpl.querySelector('[data-action="move-up"]').addEventListener("click", () => moveTaskUp(projectId, task.id));
  tpl.querySelector('[data-action="share-task"]').addEventListener("click", () => shareTask(task));

  let touchStartY = null, touchStartX = null, moved = false;
  row.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStartY = t.clientY; touchStartX = t.clientX; moved = false;
  }, {passive: true});
  row.addEventListener("touchmove", () => { moved = true; }, {passive: true});
  row.addEventListener("touchend", (e) => {
    if (touchStartY == null) return;
    const t = e.changedTouches[0];
    const dy = t.clientY - touchStartY;
    const dx = Math.abs(t.clientX - touchStartX);
    if (moved && dy < -30 && dx < 50) {
      moveTaskUp(projectId, task.id);
      row.animate([{transform:"translateY(0)"},{transform:"translateY(-8px)"},{transform:"translateY(0)"}], {duration: 250});
    }
    touchStartY = null;
  }, {passive: true});

  (task.children || []).forEach(ch => childrenUl.appendChild(renderTask(projectId, ch)));
  return li;
}

// Initialize buttons after patch (already wired above)
document.addEventListener("DOMContentLoaded", () => {});
