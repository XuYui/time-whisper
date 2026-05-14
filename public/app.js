const SESSION_KEY = "time-whisper-session-v2";
const QA_API_URL = "/api/qa";
const NOTE_API_URL = "/api/notes";

const defaultQA = [];

const qaListEl = document.getElementById("qa-list");
const qaFormEl = document.getElementById("qa-form");
const noteBoardEl = document.getElementById("note-board");
const loginCardEl = document.getElementById("login-card");
const loginFormEl = document.getElementById("login-form");
const loginMsgEl = document.getElementById("login-msg");
const noteActionsEl = document.getElementById("note-actions");
const noteFormEl = document.getElementById("note-form");
const noteContentEl = document.getElementById("note-content");
const counterEl = document.getElementById("counter");
const welcomeEl = document.getElementById("welcome");
const logoutBtnEl = document.getElementById("logout-btn");

let qaItems = cloneFallback(defaultQA);
let notes = [];
let sessionUser = loadSessionUser();

renderQA();
loadQA();
syncAuthUI();
renderNotes();
loadNotes();
initEvents();

function initEvents() {
  qaFormEl.addEventListener("submit", onAddQA);
  loginFormEl.addEventListener("submit", onLogin);
  logoutBtnEl.addEventListener("click", onLogout);
  noteFormEl.addEventListener("submit", onAddNote);
  noteContentEl.addEventListener("input", onTypeNote);

  window.addEventListener("resize", () => {
    renderNotes();
  });
}

function onTypeNote() {
  counterEl.textContent = `${noteContentEl.value.length} / 120`;
}

async function onAddQA(event) {
  event.preventDefault();
  const formData = new FormData(qaFormEl);
  const question = (formData.get("question") || "").toString().trim();
  const answer = (formData.get("answer") || "").toString().trim();
  if (!question || !answer) return;

  const submitBtn = qaFormEl.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch(QA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question, answer }),
    });

    if (!response.ok) {
      throw new Error("Failed to save QA item.");
    }

    const item = await response.json();
    qaItems.unshift(item);
    renderQA();
    qaFormEl.reset();
  } catch {
    showQAStatus("问答保存失败，请稍后再试。");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function loadQA() {
  showQAStatus("正在加载问答...");

  try {
    const response = await fetch(QA_API_URL);
    if (!response.ok) {
      throw new Error("Failed to load QA items.");
    }

    qaItems = await response.json();
    renderQA();
  } catch {
    showQAStatus("问答加载失败，请确认后端服务已启动。");
  }
}

async function loadNotes() {
  showNoteStatus("正在加载便签...");

  try {
    const response = await fetch(NOTE_API_URL);
    if (!response.ok) {
      throw new Error("Failed to load notes.");
    }

    notes = await response.json();
    renderNotes();
  } catch {
    showNoteStatus("便签加载失败，请确认后端服务已启动。");
  }
}

function onLogin(event) {
  event.preventDefault();
  const formData = new FormData(loginFormEl);
  const displayName = (formData.get("displayName") || "").toString().trim();

  if (!displayName) {
    loginMsgEl.textContent = "请输入留言名。";
    return;
  }

  sessionUser = {
    displayName,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  loginMsgEl.textContent = "";
  loginFormEl.reset();
  syncAuthUI();
  renderNotes();
}

function onLogout() {
  sessionUser = null;
  localStorage.removeItem(SESSION_KEY);
  syncAuthUI();
  renderNotes();
}

async function onAddNote(event) {
  event.preventDefault();
  if (!sessionUser) return;

  const formData = new FormData(noteFormEl);
  const content = (formData.get("content") || "").toString().trim();
  if (!content) return;

  const position = getRandomPosition();
  const color = Math.random() > 0.5 ? "pink" : "blue";
  const rotation = randomInt(-4, 4);
  const submitBtn = noteFormEl.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch(NOTE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: sessionUser.displayName,
        content,
        x: position.x,
        y: position.y,
        color,
        rotation,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save note.");
    }

    const note = await response.json();
    notes.unshift(note);
    noteFormEl.reset();
    onTypeNote();
    renderNotes();
  } catch {
    showNoteStatus("便签保存失败，请稍后再试。");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function renderQA() {
  qaListEl.innerHTML = "";

  if (qaItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "qa-empty";
    empty.textContent = "暂无问答，工作人员录入后会显示在这里。";
    qaListEl.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  qaItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "qa-item";
    card.innerHTML = `
      <p class="qa-q"><span class="badge">小孩问：</span><span>${escapeHTML(item.question)}</span></p>
      <p class="qa-a"><span class="badge">长辈答：</span><span>${escapeHTML(item.answer)}</span></p>
    `;
    fragment.append(card);
  });

  qaListEl.append(fragment);
}

function showQAStatus(message) {
  qaListEl.innerHTML = "";
  const status = document.createElement("div");
  status.className = "qa-empty";
  status.textContent = message;
  qaListEl.append(status);
}

function renderNotes() {
  noteBoardEl.innerHTML = "";

  if (notes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "note-empty";
    empty.textContent = "还没有便签，输入留言名后写下第一条祝福吧。";
    noteBoardEl.append(empty);
    return;
  }

  const desktopMode = window.matchMedia("(min-width: 860px)").matches;
  const fragment = document.createDocumentFragment();

  notes.forEach((note, index) => {
    if (desktopMode && (typeof note.x !== "number" || typeof note.y !== "number")) {
      const p = getRandomPosition();
      note.x = p.x;
      note.y = p.y;
      note.rotation = randomInt(-4, 4);
      note.color = note.color || (Math.random() > 0.5 ? "pink" : "blue");
    }

    const card = document.createElement("article");
    card.className = `sticky ${note.color || "pink"}`;
    card.dataset.id = note.id;
    card.style.zIndex = (200 + index).toString();

    if (desktopMode) {
      card.style.left = `${clamp(note.x, 8, Math.max(8, noteBoardEl.clientWidth - 232))}px`;
      card.style.top = `${clamp(note.y, 8, Math.max(8, noteBoardEl.clientHeight - 190))}px`;
      card.style.transform = `rotate(${note.rotation || 0}deg)`;
    }

    const canDelete = sessionUser && note.author === sessionUser.displayName;
    const time = formatTime(note.createdAt);

    card.innerHTML = `
      <div class="sticky-head">
        <span class="sticky-author">${escapeHTML(note.author)}</span>
        ${
          canDelete
            ? `<button class="sticky-del" type="button" aria-label="删除便签">×</button>`
            : ""
        }
      </div>
      <p class="sticky-body">${escapeHTML(note.content)}</p>
      <div class="sticky-time">${time}</div>
    `;

    const delBtn = card.querySelector(".sticky-del");
    if (delBtn) {
      delBtn.addEventListener("click", () => deleteNoteById(note.id));
    }

    if (desktopMode) {
      bindDrag(card, note);
    }

    fragment.append(card);
  });

  noteBoardEl.append(fragment);
}

function showNoteStatus(message) {
  noteBoardEl.innerHTML = "";
  const status = document.createElement("div");
  status.className = "note-empty";
  status.textContent = message;
  noteBoardEl.append(status);
}

async function deleteNoteById(id) {
  if (!sessionUser) return;

  try {
    const url = `${NOTE_API_URL}/${encodeURIComponent(id)}?author=${encodeURIComponent(
      sessionUser.displayName,
    )}`;
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      throw new Error("Failed to delete note.");
    }

    notes = notes.filter((item) => item.id !== id);
    renderNotes();
  } catch {
    showNoteStatus("便签删除失败，请刷新后再试。");
  }
}

function syncAuthUI() {
  const loggedIn = Boolean(sessionUser);
  loginCardEl.classList.toggle("hidden", loggedIn);
  noteActionsEl.classList.toggle("hidden", !loggedIn);
  noteFormEl.classList.toggle("hidden", !loggedIn);
  welcomeEl.textContent = loggedIn
    ? `${sessionUser.displayName}，欢迎你来给长辈们留一句温暖的话。`
    : "";
}

function bindDrag(card, note) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  card.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".sticky-del")) return;
    isDragging = true;
    card.style.zIndex = Date.now().toString().slice(-6);
    card.setPointerCapture(event.pointerId);

    const rect = card.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
  });

  card.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const boardRect = noteBoardEl.getBoundingClientRect();
    const maxX = Math.max(8, noteBoardEl.clientWidth - card.offsetWidth - 8);
    const maxY = Math.max(8, noteBoardEl.clientHeight - card.offsetHeight - 8);

    const nextX = clamp(event.clientX - boardRect.left - offsetX, 8, maxX);
    const nextY = clamp(event.clientY - boardRect.top - offsetY, 8, maxY);

    card.style.left = `${nextX}px`;
    card.style.top = `${nextY}px`;
    note.x = nextX;
    note.y = nextY;
  });

  card.addEventListener("pointerup", () => {
    if (!isDragging) return;
    isDragging = false;
    saveNotePosition(note);
  });
}

async function saveNotePosition(note) {
  if (!sessionUser || note.author !== sessionUser.displayName) return;

  try {
    const response = await fetch(`${NOTE_API_URL}/${encodeURIComponent(note.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: sessionUser.displayName,
        x: note.x,
        y: note.y,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save note position.");
    }
  } catch {
    loadNotes();
  }
}

function getRandomPosition() {
  const width = noteBoardEl.clientWidth || 900;
  const height = noteBoardEl.clientHeight || 620;
  return {
    x: randomInt(8, Math.max(8, width - 235)),
    y: randomInt(8, Math.max(8, height - 190)),
  };
}

function loadSessionUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.displayName) return parsed;
    return null;
  } catch {
    return null;
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cloneFallback(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHTML(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
