const storageKey = "zfl18-boardgame-rule-cards";
const today = new Date();

const ruleTypes = ["forgets", "disputes", "setup", "scoring"];
const ruleLabels = {
  forgets: "容易忘的规则",
  disputes: "常见争议",
  setup: "开局准备",
  scoring: "计分提醒"
};
const validStatuses = ["clear", "stuck", "pending"];

function buildDefaultGames() {
  return [
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
      scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"]
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
      scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"]
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
      scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"]
    }
  ];
}

function snapshotGame(game) {
  return {
    name: game.name,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    duration: game.duration,
    complexity: game.complexity,
    lastPlayed: game.lastPlayed,
    cover: game.cover
  };
}

function buildArchive(game, date) {
  return {
    id: crypto.randomUUID(),
    gameId: game.id,
    date,
    game: snapshotGame(game),
    rules: ruleTypes.flatMap((type) =>
      game[type].map((text) => ({
        id: crypto.randomUUID(),
        type,
        text,
        status: "pending",
        conclusion: ""
      }))
    )
  };
}

function buildDefaultState() {
  const games = buildDefaultGames();
  // 一份示例复盘，演示归档日期、两类结果数量与待补状态
  const sampleArchive = buildArchive(games[0], "2025-11-20");
  const conclusions = {
    0: ["clear", "规则书第5页：商站必须建在已有道路或水路连接的地点。"],
    1: ["stuck", "口述和说明书不一致，下次带附录再核对抽袋时机。"],
    2: ["clear", "先翻事件并结算，再执行玩家行动。"],
    4: ["clear", "货物板块按2/3/4人图示摆放，开局前公放对照表。"],
    5: ["clear", "起始资源每人一致，商人只放1个。"],
    8: ["clear", "剩余建筑按半价折算金币，金币每5枚计1分。"]
  };
  sampleArchive.rules.forEach((rule, index) => {
    const marked = conclusions[index];
    if (marked) {
      rule.status = marked[0];
      rule.conclusion = marked[1];
    }
  });
  return {
    selectedId: games[0].id,
    openArchiveId: "",
    games,
    archives: [sampleArchive]
  };
}

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

function normalizeArchive(raw) {
  const game = raw && typeof raw.game === "object" && raw.game ? raw.game : {};
  const rules = Array.isArray(raw?.rules) ? raw.rules : [];
  return {
    id: typeof raw?.id === "string" ? raw.id : crypto.randomUUID(),
    gameId: typeof raw?.gameId === "string" ? raw.gameId : "",
    date: typeof raw?.date === "string" ? raw.date : "",
    game: {
      name: typeof game.name === "string" ? game.name : "已删除桌游",
      minPlayers: Number(game.minPlayers) || 0,
      maxPlayers: Number(game.maxPlayers) || 0,
      duration: Number(game.duration) || 0,
      complexity: typeof game.complexity === "string" ? game.complexity : "中",
      lastPlayed: typeof game.lastPlayed === "string" ? game.lastPlayed : "",
      cover: typeof game.cover === "string" ? game.cover : ""
    },
    rules: rules.map((rule) => ({
      id: typeof rule?.id === "string" ? rule.id : crypto.randomUUID(),
      type: ruleTypes.includes(rule?.type) ? rule.type : "forgets",
      text: typeof rule?.text === "string" ? rule.text : "",
      status: validStatuses.includes(rule?.status) ? rule.status : "pending",
      conclusion: typeof rule?.conclusion === "string" ? rule.conclusion : ""
    }))
  };
}

function loadState() {
  const defaults = buildDefaultState();
  const saved = localStorage.getItem(storageKey);
  if (!saved) return defaults;
  try {
    const parsed = JSON.parse(saved);
    const merged = { ...defaults, ...parsed };
    // 旧收藏升级：没有归档字段时补空数组，已有记录做字段归一化
    merged.archives = Array.isArray(parsed.archives) ? parsed.archives.map(normalizeArchive) : [];
    merged.openArchiveId = typeof parsed.openArchiveId === "string" ? parsed.openArchiveId : "";
    return merged;
  } catch {
    return defaults;
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

function archiveStats(archive) {
  return archive.rules.reduce(
    (stats, rule) => {
      stats[rule.status] += 1;
      return stats;
    },
    { clear: 0, stuck: 0, pending: 0 }
  );
}

function getGameArchives(gameId) {
  return state.archives
    .filter((archive) => archive.gameId === gameId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getLatestArchive(gameId) {
  return getGameArchives(gameId)[0] || null;
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

function renderArchiveStrip(game) {
  const archive = getLatestArchive(game.id);
  if (!archive) {
    return `<div class="archive-strip"><span class="muted">暂无复盘</span></div>`;
  }
  const stats = archiveStats(archive);
  return `
    <div class="archive-strip">
      <span>复盘 ${archive.date}</span>
      <span class="ok">已清楚 ${stats.clear}</span>
      <span class="bad">仍卡住 ${stats.stuck}</span>
      ${stats.pending ? `<span class="pending">待补 ${stats.pending}</span>` : ""}
    </div>
  `;
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
              ${renderArchiveStrip(game)}
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderDetail() {
  if (state.openArchiveId) {
    const archive = state.archives.find((item) => item.id === state.openArchiveId);
    if (archive) {
      renderArchiveDetail(archive);
      return;
    }
    state.openArchiveId = "";
  }

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
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets)}
      ${renderRuleSection("常见争议", "disputes", game.disputes)}
      ${renderRuleSection("开局准备", "setup", game.setup)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      ${renderArchiveHistory(game)}
      <div class="detail-actions">
        <button id="archiveBtn" type="button">复盘归档</button>
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
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

function renderArchiveHistory(game) {
  const archives = getGameArchives(game.id);
  return `
    <section class="rule-section archive-history">
      <h3>复盘记录</h3>
      <ul class="archive-list">
        ${
          archives
            .map((archive) => {
              const stats = archiveStats(archive);
              return `
                <li class="archive-item" data-archive-id="${archive.id}">
                  <div>
                    <strong>${archive.date} 复盘</strong>
                    <div class="archive-counts">
                      <em class="clear">已解释清楚 ${stats.clear}</em>
                      <em class="stuck">仍会卡住 ${stats.stuck}</em>
                      ${stats.pending ? `<em class="pending">待补 ${stats.pending}</em>` : `<em class="done">全部处理</em>`}
                    </div>
                  </div>
                  <span class="open-hint">查看 ›</span>
                </li>
              `;
            })
            .join("") || `<li class="archive-empty">暂无复盘。聚完一局点「复盘归档」，会快照当前资料和全部规则，之后修改收藏不影响旧记录。</li>`
        }
      </ul>
    </section>
  `;
}

function statusButton(rule, status, label) {
  const pressed = rule.status === status;
  return `
    <button
      type="button"
      class="status-btn status-${status}"
      data-rule-id="${rule.id}"
      data-status="${status}"
      aria-pressed="${pressed}"
    >${label}</button>
  `;
}

function renderArchiveRuleGroup(type, archive) {
  const items = archive.rules.filter((rule) => rule.type === type);
  if (!items.length) return "";
  return `
    <section class="rule-section archive-rule-section">
      <h3>${ruleLabels[type]}</h3>
      <ul class="archive-rule-list">
        ${items
          .map(
            (rule) => `
              <li class="archive-rule">
                <p class="archive-rule-text">${escapeHtml(rule.text)}</p>
                <div class="status-toggle" role="group" aria-label="复盘结果">
                  ${statusButton(rule, "clear", "已解释清楚")}
                  ${statusButton(rule, "stuck", "仍会卡住")}
                  ${statusButton(rule, "pending", "待补")}
                </div>
                <textarea rows="2" data-conclusion-for="${rule.id}" placeholder="现场结论：当时怎么解释的、依据是什么…">${escapeHtml(rule.conclusion)}</textarea>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderArchiveDetail(archive) {
  const info = archive.game;
  const stats = archiveStats(archive);
  els.detailView.innerHTML = `
    <div class="quick-card archive-editor">
      <button class="back-btn" id="archiveBackBtn" type="button">← 返回桌游详情</button>
      <h2>${escapeHtml(info.name)} · 复盘归档</h2>
      <div class="game-meta">
        <span class="pill">归档日期 ${archive.date}</span>
        <span class="pill">${info.minPlayers}-${info.maxPlayers}人</span>
        <span class="pill">${info.duration}分钟</span>
        <span class="pill heavy">${escapeHtml(info.complexity)}</span>
      </div>
      <div class="game-meta" id="archiveStatBar">
        <span class="pill clear">已解释清楚 <b id="statClear">${stats.clear}</b></span>
        <span class="pill stuck">仍会卡住 <b id="statStuck">${stats.stuck}</b></span>
        <span class="pill pending ${stats.pending ? "" : "is-zero"}">待补 <b id="statPending">${stats.pending}</b></span>
      </div>
      <p class="archive-note">本记录保留的是当次桌游资料与规则原文，之后照常编辑收藏不会改变它。逐条标记结果并写下现场结论；没处理完的条目保持「待补」，下次可继续补充。</p>
      ${ruleTypes.map((type) => renderArchiveRuleGroup(type, archive)).join("")}
      <div class="archive-save">
        <button class="primary" id="saveArchiveBtn" type="button">保存并返回详情</button>
        <span id="archiveSavedHint" class="saved-hint"></span>
      </div>
    </div>
  `;
}

function syncArchiveHeader(archive) {
  const stats = archiveStats(archive);
  const clearEl = els.detailView.querySelector("#statClear");
  const stuckEl = els.detailView.querySelector("#statStuck");
  const pendingEl = els.detailView.querySelector("#statPending");
  const pendingPill = els.detailView.querySelector("#archiveStatBar .pill.pending");
  if (clearEl) clearEl.textContent = stats.clear;
  if (stuckEl) stuckEl.textContent = stats.stuck;
  if (pendingEl) pendingEl.textContent = stats.pending;
  if (pendingPill) pendingPill.classList.toggle("is-zero", stats.pending === 0);
}

function syncConclusionsFromForm() {
  const archive = state.archives.find((item) => item.id === state.openArchiveId);
  if (!archive) return;
  els.detailView.querySelectorAll("[data-conclusion-for]").forEach((textarea) => {
    const rule = archive.rules.find((item) => item.id === textarea.dataset.conclusionFor);
    if (rule) rule.conclusion = textarea.value.trim();
  });
  saveState();
}

function closeArchiveView() {
  syncConclusionsFromForm();
  state.openArchiveId = "";
  renderAll();
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
    scoring: ["确认终局计分项和即时得分项。"]
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  state.openArchiveId = "";
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
  state.openArchiveId = "";
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

els.detailView.addEventListener("input", (event) => {
  const textarea = event.target.closest("[data-conclusion-for]");
  if (!textarea || !state.openArchiveId) return;
  const archive = state.archives.find((item) => item.id === state.openArchiveId);
  const rule = archive?.rules.find((item) => item.id === textarea.dataset.conclusionFor);
  if (rule) {
    rule.conclusion = textarea.value;
    saveState();
  }
});

function handleArchiveClick(event) {
  const archive = state.archives.find((item) => item.id === state.openArchiveId);
  if (!archive) {
    state.openArchiveId = "";
    renderAll();
    return;
  }

  const statusButtonEl = event.target.closest(".status-btn");
  if (statusButtonEl) {
    const rule = archive.rules.find((item) => item.id === statusButtonEl.dataset.ruleId);
    if (!rule || !validStatuses.includes(statusButtonEl.dataset.status)) return;
    rule.status = statusButtonEl.dataset.status;
    saveState();
    statusButtonEl
      .closest(".status-toggle")
      .querySelectorAll(".status-btn")
      .forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.status === rule.status));
      });
    syncArchiveHeader(archive);
    return;
  }

  if (event.target.closest("#archiveBackBtn")) {
    closeArchiveView();
    return;
  }

  if (event.target.closest("#saveArchiveBtn")) {
    syncConclusionsFromForm();
    const hint = els.detailView.querySelector("#archiveSavedHint");
    if (hint) hint.textContent = "已保存";
    state.openArchiveId = "";
    renderAll();
  }
}

els.detailView.addEventListener("click", (event) => {
  if (state.openArchiveId) {
    handleArchiveClick(event);
    return;
  }

  const archiveEntry = event.target.closest("[data-archive-id]");
  if (archiveEntry) {
    syncConclusionsFromForm();
    state.openArchiveId = archiveEntry.dataset.archiveId;
    renderAll();
    return;
  }

  const ruleButton = event.target.closest("[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const archiveButton = event.target.closest("#archiveBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

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
    // 再次复盘新增一份快照，不覆盖前次记录
    const archive = buildArchive(game, new Date().toISOString().slice(0, 10));
    state.archives.unshift(archive);
    state.openArchiveId = archive.id;
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    state.archives = state.archives.filter((item) => item.gameId !== game.id);
    state.selectedId = state.games[0]?.id || "";
    renderAll();
  }
});

setDefaultDate();
renderAll();
