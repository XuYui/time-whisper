# Time Whisper 时光悄悄话

该项目服务于南京某校的某一次志愿活动

Time Whisper 是一个面向代际交流场景的小型全栈 Web 应用。工作人员可以录入儿童提出的问题和长辈的回答，访客也可以在共享留言板上留下祝福便签。

项目强调轻量、可运行和完整闭环：前端使用原生 HTML/CSS/JavaScript，后端使用 Node.js 提供静态资源服务和 REST API，并通过 SQLite 持久化问答与留言数据。

## 项目亮点

- 使用 Node.js 原生能力搭建无框架全栈应用，包含静态资源服务、REST API 和 SQLite 数据持久化。
- 实现问答录入与展示、访客留言、便签删除、桌面端拖拽定位等完整交互流程。
- 通过 `localStorage` 保存访客本地身份，用于控制本人便签的删除和位置更新权限。
- 将公开静态资源与后端源码分离，运行时数据库文件不进入 Git 历史，便于公开展示和部署。
- 使用响应式 CSS 适配桌面端和移动端，无需前端构建工具即可运行。

## 技术栈

- Node.js 24+
- `node:sqlite`
- HTML / CSS / Vanilla JavaScript
- REST-style JSON API

## 项目结构

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

默认情况下，SQLite 数据库会在运行时创建到 `data/time-whisper.db`，该目录已加入 `.gitignore`。

## 本地运行

```bash
npm start
```

启动后访问：

```text
http://localhost:3000
```

开发时可以使用自动重启模式：

```bash
npm run dev
```

## 代码检查

```bash
npm run check
```

## API 说明

- `GET /api/qa`：获取问答列表。
- `POST /api/qa`：新增问答内容。
- `GET /api/notes`：获取便签列表。
- `POST /api/notes`：新增便签。
- `PATCH /api/notes/:id`：更新本人便签的位置。
- `DELETE /api/notes/:id?author=...`：删除本人便签。

## 可配置项

- `PORT`：指定服务端口，默认值为 `3000`。
- `DB_PATH`：指定 SQLite 数据库文件路径，默认值为 `data/time-whisper.db`。

## 简历描述参考

> Time Whisper：基于 Node.js、SQLite 和原生 JavaScript 构建的代际问答与留言板 Web 应用，实现 REST API、SQLite 持久化、本地访客身份、便签发布/删除/拖拽定位以及响应式界面设计。
