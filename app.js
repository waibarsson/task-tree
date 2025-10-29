
/* Task Tree - jednoduchý stromový task manager s „semaforem“
   - Projekty na levém panelu (lze přidávat/volit/přejmenovat)
   - Strom uzlů (úkolů) vpravo
   - Každý uzel má název a stav: červená/žlutá/zelená (klikem se cykluje)
   - Úkoly NEmizí (není implementováno mazání)
   - Persistuje do localStorage
*/

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const storageKey = 'taskTreeProjects_v1';
let state = {
  projects: [],
  selectedProjectId: null,
};

function uid() { return Math.random().toString(36).slice(2, 10); }

function save() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}
function load() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) state = JSON.parse(raw);
  } catch (e) { console.error(e); }
}

function createProject(name = 'Nový projekt') {
  const id = uid();
  const project = { id, name, root: { id: uid(), title: 'Kořen', status: 'yellow', children: [] } };
  state.projects.push(project);
  state.selectedProjectId = id;
  save();
  render();
}

function selectProject(id) {
  state.selectedProjectId = id;
  save();
  render();
}

function renameProject() {
  const proj = getSelectedProject();
  if (!proj) return;
  const name = prompt('Nový název projektu:', proj.name);
  if (name && name.trim()) {
    proj.name = name.trim();
    save(); render();
  }
}

function getSelectedProject() {
  return state.projects.find(p => p.id === state.selectedProjectId) || null;
}

function addChildNode(parent) {
  const node = { id: uid(), title: 'Nový úkol', status: 'red', children: [] };
  parent.children.push(node);
  save(); renderTree();
}

function cycleStatus(node) {
  const order = ['red','yellow','green'];
  const idx = order.indexOf(node.status);
  node.status = order[(idx + 1) % order.length];
  save(); renderTree();
}

function updateTitle(node, value) {
  node.title = value;
  save();
}

function renderProjects() {
  const list = $('#projectList');
  list.innerHTML = '';
  if (state.projects.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = '<div class="empty">Žádné projekty. Vytvoř si první pomocí tlačítka +.</div>';
    list.appendChild(li);
    return;
  }
  for (const p of state.projects) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'project-btn' + (p.id === state.selectedProjectId ? ' active' : '');
    btn.textContent = p.name;
    btn.onclick = () => selectProject(p.id);
    li.appendChild(btn);
    list.appendChild(li);
  }
}

function renderTree() {
  const container = $('#treeContainer');
  const title = $('#projectTitle');
  const toolbar = $('#treeToolbar');
  const proj = getSelectedProject();
  if (!proj) {
    title.textContent = 'Vyber projekt';
    toolbar.classList.add('hidden');
    container.innerHTML = '<div class="empty">Načti nebo vytvoř projekt.</div>';
    return;
  }
  title.textContent = proj.name;
  toolbar.classList.remove('hidden');
  container.innerHTML = '';

  function makeNodeEl(node) {
    const wrap = document.createElement('div');
    wrap.className = 'node';

    const row = document.createElement('div');
    row.className = 'row';

    const toggle = document.createElement('div');
    toggle.className = 'toggle';
    toggle.textContent = node._collapsed ? '▸' : '▾';
    toggle.title = node._collapsed ? 'Rozbalit' : 'Sbalit';
    toggle.onclick = () => { node._collapsed = !node._collapsed; save(); renderTree(); };

    const icon = document.createElement('span');
    icon.className = 'icon ' + node.status;
    icon.title = 'Klikni pro změnu stavu';
    icon.onclick = () => cycleStatus(node);

    const input = document.createElement('input');
    input.className = 'title';
    input.value = node.title;
    input.oninput = (e) => updateTitle(node, e.target.value);

    const controls = document.createElement('div');
    controls.className = 'controls';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.textContent = '+ Podúkol';
    addBtn.onclick = () => addChildNode(node);
    controls.appendChild(addBtn);

    row.appendChild(toggle);
    row.appendChild(icon);
    row.appendChild(input);
    row.appendChild(controls);

    wrap.appendChild(row);

    const children = document.createElement('div');
    children.className = 'children';
    if (node._collapsed) {
      children.style.display = 'none';
    }

    for (const ch of node.children) {
      children.appendChild(makeNodeEl(ch));
    }
    wrap.appendChild(children);

    return wrap;
  }

  const rootEl = makeNodeEl(proj.root);
  container.appendChild(rootEl);
}

function addRootTask() {
  const proj = getSelectedProject();
  if (!proj) return;
  addChildNode(proj.root);
}

function bindUI() {
  $('#addProjectBtn').addEventListener('click', () => createProject('Nový projekt'));
  $('#renameProjectBtn').addEventListener('click', () => renameProject());
  $('#addRootTaskBtn').addEventListener('click', () => addRootTask());
}

function init() {
  load();
  bindUI();
  render();
}

function render() {
  renderProjects();
  renderTree();
}

init();
