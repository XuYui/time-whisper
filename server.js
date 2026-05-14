const http = require("node:http");
const { mkdirSync } = require("node:fs");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "time-whisper.db");

mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS qa_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    x REAL NOT NULL,
    y REAL NOT NULL,
    color TEXT NOT NULL,
    rotation REAL NOT NULL
  );
`);

const listQA = db.prepare(`
  SELECT id, question, answer, created_at AS createdAt
  FROM qa_items
  ORDER BY id DESC
`);
const insertQA = db.prepare(`
  INSERT INTO qa_items (question, answer)
  VALUES (?, ?)
  RETURNING id, question, answer, created_at AS createdAt
`);
const listNotes = db.prepare(`
  SELECT id, author, content, created_at AS createdAt, x, y, color, rotation
  FROM notes
  ORDER BY created_at DESC
`);
const insertNote = db.prepare(`
  INSERT INTO notes (id, author, content, x, y, color, rotation)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  RETURNING id, author, content, created_at AS createdAt, x, y, color, rotation
`);
const updateNotePosition = db.prepare(`
  UPDATE notes
  SET x = ?, y = ?
  WHERE id = ? AND author = ?
  RETURNING id, author, content, created_at AS createdAt, x, y, color, rotation
`);
const deleteNote = db.prepare(`
  DELETE FROM notes
  WHERE id = ? AND author = ?
`);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/qa" && req.method === "GET") {
      return sendJSON(res, 200, listQA.all());
    }

    if (url.pathname === "/api/qa" && req.method === "POST") {
      const body = await readJSONBody(req);
      const question = String(body.question || "").trim();
      const answer = String(body.answer || "").trim();

      if (!question || !answer) {
        return sendJSON(res, 400, { error: "Question and answer are required." });
      }

      const item = insertQA.get(question, answer);
      return sendJSON(res, 201, item);
    }

    if (url.pathname === "/api/notes" && req.method === "GET") {
      return sendJSON(res, 200, listNotes.all());
    }

    if (url.pathname === "/api/notes" && req.method === "POST") {
      const body = await readJSONBody(req);
      const author = String(body.author || "").trim();
      const content = String(body.content || "").trim();
      const x = toFiniteNumber(body.x, 8);
      const y = toFiniteNumber(body.y, 8);
      const color = body.color === "blue" ? "blue" : "pink";
      const rotation = toFiniteNumber(body.rotation, 0);

      if (!author || !content) {
        return sendJSON(res, 400, { error: "Author and content are required." });
      }

      const item = insertNote.get(randomUUID(), author, content, x, y, color, rotation);
      return sendJSON(res, 201, item);
    }

    const noteMatch = url.pathname.match(/^\/api\/notes\/([^/]+)$/);
    if (noteMatch && req.method === "PATCH") {
      const body = await readJSONBody(req);
      const id = decodeURIComponent(noteMatch[1]);
      const author = String(body.author || "").trim();
      const x = toFiniteNumber(body.x, 8);
      const y = toFiniteNumber(body.y, 8);

      if (!author) {
        return sendJSON(res, 400, { error: "Author is required." });
      }

      const item = updateNotePosition.get(x, y, id, author);
      if (!item) {
        return sendJSON(res, 404, { error: "Note not found." });
      }

      return sendJSON(res, 200, item);
    }

    if (noteMatch && req.method === "DELETE") {
      const id = decodeURIComponent(noteMatch[1]);
      const author = String(url.searchParams.get("author") || "").trim();

      if (!author) {
        return sendJSON(res, 400, { error: "Author is required." });
      }

      deleteNote.run(id, author);
      return sendJSON(res, 204, null);
    }

    if (url.pathname.startsWith("/api/")) {
      return sendJSON(res, 404, { error: "Not found." });
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    return sendJSON(res, 500, { error: "Internal server error." });
  }
});

server.listen(PORT, () => {
  console.log(`Time Whisper running at http://localhost:${PORT}`);
});

module.exports = { db, server };

async function serveStatic(requestPath, res) {
  const cleanPath = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const resolved = path.resolve(PUBLIC_DIR, `.${cleanPath}`);

  if (!isInsidePublicDir(resolved)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(resolved);
    res.writeHead(200, {
      "Content-Type": getContentType(resolved),
      "Cache-Control": "no-store",
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

function isInsidePublicDir(filePath) {
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body too large."));
      }
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(data === null ? "" : JSON.stringify(data));
}

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml; charset=utf-8",
  };

  return types[ext] || "application/octet-stream";
}
