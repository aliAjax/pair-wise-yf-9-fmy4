const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

const defaultState = {
  selectedId: "",
  games: [
    {
      id: crypto.randomUUID(),
      name: "奥尔良",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 90,
      complexity: "中",
      lastPlayed: "2025-11-20",
      cover: "",
      forgets: ["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
      disputes: ["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"],
      setup: ["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"],
      scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"],
      archives: []
    },
    {
      id: crypto.randomUUID(),
      name: "盖亚计划",
      minPlayers: 1,
      maxPlayers: 4,
      duration: 150,
      complexity: "重",
      lastPlayed: "2025-08-02",
      cover: "",
      forgets: ["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"],
      disputes: ["被动充能是否能拒绝", "星球改造费用受哪些能力影响"],
      setup: ["随机终局计分板和回合得分板", "按种族设置起始资源和母星"],
      scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"],
      archives: []
    },
    {
      id: crypto.randomUUID(),
      name: "花砖物语",
      minPlayers: 2,
      maxPlayers: 4,
      duration: 45,
      complexity: "轻",
      lastPlayed: "2026-03-15",
      cover: "",
      forgets: ["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"],
      disputes: ["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"],
      setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"],
      archives: []
    }
  ]
};

const ruleSections = [
  { key: "forgets", title: "容易忘的规则" },
  { key: "disputes", title: "常见争议" },
  { key: "setup", title: "开局准备" },
  { key: "scoring", title: "计分提醒" }
];

const uiState = { openArchives: new Set() };

let state = loadState();
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  visibleCount: document.querySelector("#visibleCount")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = { ...structuredClone(defaultState), ...JSON.parse(saved) };
    parsed.games = (parsed.games || []).map((game) => ({
      ...game,
      archives: (game.archives || []).map((archive) => ({ reviews: {}, ...archive }))
    }));
    return parsed;
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function daysSince(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Math.max(0, Math.floor((today - date) / 86400000));
}

function getAllRules(game) {
  return [...game.forgets, ...game.disputes, ...game.setup, ...game.scoring];
}

function createArchive(game) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString().slice(0, 10),
    snapshot: {
      name: game.name,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      duration: game.duration,
      complexity: game.complexity,
      lastPlayed: game.lastPlayed,
      cover: game.cover,
      forgets: [...game.forgets],
      disputes: [...game.disputes],
      setup: [...game.setup],
      scoring: [...game.scoring]
    },
    reviews: {}
  };
}

function getArchiveStats(archive) {
  const total = ruleSections.reduce((sum, section) => sum + (archive.snapshot[section.key]?.length || 0), 0);
  let clear = 0;
  let stuck = 0;
  Object.values(archive.reviews || {}).forEach((review) => {
    if (review.status === "clear") clear += 1;
    if (review.status === "stuck") stuck += 1;
  });
  return { total, clear, stuck, pending: Math.max(0, total - clear - stuck) };
}

function syncArchiveNotes() {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  els.detailView.querySelectorAll(".archive-note").forEach((textarea) => {
    const archive = game.archives.find((item) => item.id === textarea.dataset.archiveId);
    if (!archive) return;
    const key = textarea.dataset.itemKey;
    const current = archive.reviews[key] || { status: "", note: "" };
    const note = textarea.value.trim();
    if (!current.status && !note) {
      delete archive.reviews[key];
    } else {
      archive.reviews[key] = { status: current.status || "", note };
    }
  });
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${getAllRules(game).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || (Number(player) >= game.minPlayers && Number(player) <= game.maxPlayers);
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + getAllRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${daysSince(stale.lastPlayed)}天` : "-";
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${daysSince(game.lastPlayed)}天未玩</span>
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
              </div>
              ${renderArchiveBadge(game)}
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderArchiveBadge(game) {
  const latest = game.archives[0];
  if (!latest) return "";
  const stats = getArchiveStats(latest);
  return `
    <div class="game-meta archive-line">
      <span class="pill">复盘 ${latest.createdAt}</span>
      <span class="pill clear">清楚 ${stats.clear}</span>
      <span class="pill stuck">卡住 ${stats.stuck}</span>
      ${stats.pending > 0 ? `<span class="pill pending">待补 ${stats.pending}</span>` : ""}
    </div>
  `;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${daysSince(game.lastPlayed)}天未玩</span>
        </div>
      </div>
      ${ruleSections.map((section) => renderRuleSection(section.title, section.key, game[section.key])).join("")}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          ${ruleSections.map((section) => `<option value="${section.key}">${section.title}</option>`).join("")}
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="archiveGameBtn" type="button">复盘归档</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
      ${renderArchives(game)}
    </div>
  `;
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (item, index) => `
                <li>
                  <span>${escapeHtml(item)}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
                </li>
              `
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderArchives(game) {
  return `
    <section class="rule-section archives-section">
      <h3>复盘归档</h3>
      <div class="archive-list">
        ${
          game.archives.map(renderArchive).join("") ||
          `<p class="empty">还没有复盘归档。聚完一局点「复盘归档」，把当前规则原样留底，之后照常改收藏也不影响这份记录。</p>`
        }
      </div>
    </section>
  `;
}

function renderArchive(archive) {
  const stats = getArchiveStats(archive);
  const snap = archive.snapshot;
  const open = uiState.openArchives.has(archive.id) ? "open" : "";
  return `
    <details class="archive" data-archive-id="${archive.id}" ${open}>
      <summary>
        <span class="archive-date">${archive.createdAt} 归档</span>
        <span class="archive-pills">
          <span class="pill clear">清楚 ${stats.clear}</span>
          <span class="pill stuck">卡住 ${stats.stuck}</span>
          ${stats.pending > 0 ? `<span class="pill pending">待补 ${stats.pending}</span>` : `<span class="pill done">已处理完</span>`}
        </span>
      </summary>
      <div class="archive-body">
        <p class="archive-meta">
          ${escapeHtml(snap.name)} · ${snap.minPlayers}-${snap.maxPlayers}人 · ${snap.duration}分钟 · ${escapeHtml(snap.complexity)} · 当时上次游玩 ${snap.lastPlayed}
        </p>
        ${ruleSections.map((section) => renderArchiveSection(archive, section)).join("")}
      </div>
    </details>
  `;
}

function renderArchiveSection(archive, section) {
  const items = archive.snapshot[section.key] || [];
  if (!items.length) return "";
  return `
    <div class="archive-section">
      <h4>${section.title}</h4>
      <ul class="archive-items">
        ${items.map((text, index) => renderArchiveItem(archive, section.key, text, index)).join("")}
      </ul>
    </div>
  `;
}

function renderArchiveItem(archive, sectionKey, text, index) {
  const itemKey = `${sectionKey}:${index}`;
  const review = archive.reviews[itemKey] || {};
  const stateClass = review.status === "clear" ? "is-clear" : review.status === "stuck" ? "is-stuck" : "";
  return `
    <li class="archive-item ${stateClass}">
      <span class="archive-text">${escapeHtml(text)}</span>
      <div class="archive-controls">
        <button type="button" class="status-btn ${review.status === "clear" ? "active-clear" : ""}"
          data-archive-id="${archive.id}" data-item-key="${itemKey}" data-status="clear">已解释清楚</button>
        <button type="button" class="status-btn ${review.status === "stuck" ? "active-stuck" : ""}"
          data-archive-id="${archive.id}" data-item-key="${itemKey}" data-status="stuck">仍会卡住</button>
      </div>
      <textarea class="archive-note" rows="1" placeholder="现场结论：这局最后怎么定的"
        data-archive-id="${archive.id}" data-item-key="${itemKey}">${escapeHtml(review.note || "")}</textarea>
    </li>
  `;
}

function renderAll() {
  saveState();
  renderSummary();
  renderList();
  renderDetail();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: ["本局开始前先补充容易忘的规则。"],
    disputes: [],
    setup: ["整理组件并按人数调整初始设置。"],
    scoring: ["确认终局计分项和即时得分项。"],
    archives: []
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game[key].push(text);
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  syncArchiveNotes();

  const ruleButton = event.target.closest("[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const archiveButton = event.target.closest("#archiveGameBtn");
  const statusButton = event.target.closest("[data-status]");

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (archiveButton) {
    const archive = createArchive(game);
    game.archives.unshift(archive);
    uiState.openArchives.add(archive.id);
    renderAll();
  }

  if (statusButton) {
    const archive = game.archives.find((item) => item.id === statusButton.dataset.archiveId);
    if (!archive) return;
    const key = statusButton.dataset.itemKey;
    const status = statusButton.dataset.status;
    const current = archive.reviews[key];
    if (current?.status === status) {
      if (current.note) archive.reviews[key] = { status: "", note: current.note };
      else delete archive.reviews[key];
    } else {
      archive.reviews[key] = { status, note: current?.note || "" };
    }
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

els.detailView.addEventListener("change", (event) => {
  if (!event.target.classList.contains("archive-note")) return;
  syncArchiveNotes();
  renderAll();
});

els.detailView.addEventListener(
  "toggle",
  (event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.classList.contains("archive")) return;
    if (details.open) uiState.openArchives.add(details.dataset.archiveId);
    else uiState.openArchives.delete(details.dataset.archiveId);
  },
  true
);

setDefaultDate();
renderAll();
