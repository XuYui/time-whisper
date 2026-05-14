# Time Whisper

Time Whisper is a small full-stack web app for intergenerational communication. Staff can record questions from children and answers from older adults, while visitors can leave warm sticky-note messages on a shared board.

## Resume Highlights

- Built a zero-framework Node.js application with a REST API, static file server, and SQLite persistence.
- Implemented two product flows: Q&A content management and a visitor message board.
- Added local visitor identity with `localStorage`, sticky-note creation, deletion, and desktop drag-to-reposition behavior.
- Organized public assets separately from server code and stores runtime data outside the Git history.
- Designed responsive layouts for desktop and mobile without a frontend build step.

## Tech Stack

- Node.js 24+
- Built-in `node:sqlite`
- HTML, CSS, vanilla JavaScript
- REST-style JSON API

## Project Structure

```text
.
|-- public/
|   |-- index.html
|   |-- app.js
|   `-- styles.css
|-- server.js
|-- package.json
`-- README.md
```

Runtime SQLite data is created under `data/time-whisper.db` by default and is ignored by Git.

## Run Locally

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

For development with automatic restart:

```bash
npm run dev
```

## Quality Check

```bash
npm run check
```

## API Overview

- `GET /api/qa` lists Q&A entries.
- `POST /api/qa` creates a Q&A entry.
- `GET /api/notes` lists sticky notes.
- `POST /api/notes` creates a sticky note.
- `PATCH /api/notes/:id` updates a note position for its author.
- `DELETE /api/notes/:id?author=...` deletes a note for its author.

## Deployment Notes

The app is intentionally simple: it runs as one Node.js process and does not require a build step. Set `PORT` to change the HTTP port, or `DB_PATH` to store the SQLite database in a custom location.
