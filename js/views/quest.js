import { getLevelById, getNextLevel } from "../levels.js";
import { Sandbox, humanizeSqlError } from "../sandbox.js";
import { gradeSqlStage, gradeQuizStage } from "../grader.js";
import {
  getState,
  getStageProgress,
  saveDraft,
  getDraft,
  setLastActive,
  markLevelStarted,
  markIntroSeen,
  recordHintUsed,
  submitStageResult,
  completeUngradedStage,
} from "../state.js";
import { el, clear, toast, showXpToast, confirmModal, escapeHtml } from "../ui.js";
import { celebrateLevelComplete } from "../confetti.js";

const TABS = [
  { id: "quest", label: "Quest", icon: "📜" },
  { id: "editor", label: "Editor", icon: "⌨️" },
  { id: "schema", label: "Schema", icon: "🗂️" },
  { id: "result", label: "Result", icon: "📊" },
];

function isSqlStage(stage) {
  return stage.type === "sql" || stage.type === "practice";
}

function stageStatusClass(level, stage) {
  const sp = getStageProgress(level.id, stage.id);
  if (sp.status === "passed") return "pass";
  return "";
}

export async function renderQuest({ navigate, levelId }) {
  const level = getLevelById(levelId);
  const root = el("div", { class: "page-quest-root" });

  if (!level) {
    root.appendChild(el("div", { class: "page page-narrow" }, [
      el("div", { class: "empty-state" }, [el("div", { class: "ic" }, "❓"), el("p", {}, "Level tidak ditemukan."), el("button", { class: "btn btn-primary", onclick: () => navigate("journey") }, "Kembali ke Journey")]),
    ]));
    return root;
  }

  const s = getState();
  const levelStatus = s.levels[level.id].status;
  if (levelStatus === "locked") {
    root.appendChild(el("div", { class: "page page-narrow" }, [
      el("div", { class: "empty-state" }, [
        el("div", { class: "ic" }, "🔒"),
        el("h3", {}, `Level ${level.id} — ${level.title} masih terkunci`),
        el("p", {}, "Selesaikan level sebelumnya (mastery ≥ 80%) untuk membuka level ini."),
        el("button", { class: "btn btn-primary", onclick: () => navigate("journey") }, "Kembali ke Journey"),
      ]),
    ]));
    return root;
  }

  markLevelStarted(level.id);
  setLastActive(level.id, level.stages[0].id);

  // -------------------------------------------------------------- state
  const draftKeyOf = (stage) => `${level.id}:${stage.id}`;
  const st = {
    stageId: pickInitialStage(level),
    tab: "quest",
    sandbox: null,
    cm: null,
    lastExec: null,
    hasRunThisStage: false,
    saveTimer: null,
  };

  function currentStage() {
    return level.stages.find((x) => x.id === st.stageId);
  }

  // -------------------------------------------------------------- skeleton
  const header = el("div", { class: "quest-header" });
  const introScreen = el("div", { class: "intro-screen force-hide" });
  const tabsBar = el("div", { class: "quest-tabs force-hide" });
  const panels = el("div", { class: "quest-panels force-hide" });
  const panelQuest = el("div", { class: "panel panel-quest active" });
  const panelEditor = el("div", { class: "panel panel-editor" });
  const panelSchema = el("div", { class: "panel panel-schema" });
  const panelResult = el("div", { class: "panel panel-result" });
  panels.append(panelQuest, panelEditor, panelSchema, panelResult);
  const actionBar = el("div", { class: "mobile-action-bar force-hide" });

  root.append(header, introScreen, tabsBar, panels, actionBar);

  // -------------------------------------------------------------- header
  function renderHeader() {
    clear(header);
    const ls = getState().levels[level.id];
    header.append(
      el("button", { class: "back-btn", onclick: () => navigate("journey") }, "← Journey"),
      el("div", { class: "qtitle" }, `Lv.${level.id} ${level.title} — ${level.questTitle}`),
      el("div", { class: "qmastery" }, `${ls.mastery}%`)
    );
  }

  // -------------------------------------------------------------- tabs
  function renderTabs() {
    clear(tabsBar);
    for (const t of TABS) {
      tabsBar.appendChild(
        el("button", { class: `tab-btn${st.tab === t.id ? " active" : ""}`, onclick: () => switchTab(t.id) }, `${t.icon} ${t.label}`)
      );
    }
  }

  function switchTab(tabId) {
    st.tab = tabId;
    [panelQuest, panelEditor, panelSchema, panelResult].forEach((p) => p.classList.remove("active"));
    ({ quest: panelQuest, editor: panelEditor, schema: panelSchema, result: panelResult }[tabId]).classList.add("active");
    renderTabs();
    if (tabId === "editor" && st.cm) setTimeout(() => st.cm.refresh(), 30);
  }

  // -------------------------------------------------------------- quest panel
  function renderQuestPanel() {
    clear(panelQuest);
    const stage = currentStage();

    panelQuest.appendChild(
      el("div", { class: "quest-story" }, [
        el("div", { class: "kicker" }, `${level.cpmk} • ${level.subCpmk}`),
        el("div", {}, level.story),
      ])
    );

    const microDetails = el("details", { class: "micro-block" });
    const summary = el("summary", { style: "cursor:pointer;font-weight:800;font-size:13px;color:var(--brand);" }, "📘 Materi Pembelajaran — buka lagi bila perlu");
    microDetails.appendChild(summary);
    for (const m of level.microlearning) {
      const b = el("div", { style: "margin-top:10px;" }, [el("h4", {}, m.heading), el("p", { style: "margin:0;" }, m.body)]);
      if (m.code) b.appendChild(el("pre", { class: "code-block" }, m.code));
      microDetails.appendChild(b);
    }
    panelQuest.appendChild(microDetails);

    const pillRow = el("div", { class: "stage-pill-row" });
    level.stages.forEach((stg, i) => {
      pillRow.appendChild(
        el("button", { class: `stage-pill ${stg.id === st.stageId ? "active" : ""} ${stageStatusClass(level, stg)}`, onclick: () => selectStage(stg.id) }, `${i + 1}. ${stg.title}`)
      );
    });
    panelQuest.appendChild(pillRow);

    panelQuest.appendChild(renderStageBody(stage));
  }

  function renderStageBody(stage) {
    const wrap = el("div", {});
    const instrBox = el("div", { class: "instruction-box" }, [
      el("div", { style: "font-weight:800;font-size:13.5px;margin-bottom:6px;" }, `${stage.bossBattle ? "⚔ " : ""}${stage.title}`),
      el("p", { style: "margin:0;" }, stage.instruction || stage.question || ""),
    ]);
    if (stage.requiredConstructs && stage.requiredConstructs.length) {
      const reqRow = el("div", { class: "req-row" });
      stage.requiredConstructs.forEach((c) => reqRow.appendChild(el("span", { class: "req-tag" }, `wajib: ${c === "SUBQUERY" ? "subquery" : c}`)));
      instrBox.appendChild(reqRow);
    }
    if (stage.expectError) instrBox.appendChild(el("div", { class: "tag-note" }, "⚠ Error di sini SENGAJA terjadi sebagai contoh — ini bukan kesalahan Anda."));
    if (stage.expectFailure) instrBox.appendChild(el("div", { class: "tag-note" }, "ℹ Pada quest ini, statement yang DITOLAK sistem (gagal) justru menandakan sukses."));
    wrap.appendChild(instrBox);

    if (stage.type === "quiz") {
      wrap.appendChild(renderQuiz(stage));
    } else if (stage.type === "reflect") {
      wrap.appendChild(renderReflect(stage));
    } else {
      const sp = getStageProgress(level.id, stage.id);
      wrap.appendChild(
        el("div", { style: "font-size:12.5px;color:var(--text-faint);margin-top:-4px;" }, `Buka tab Editor untuk menulis SQL. Percobaan: ${sp.attempts} • Skor terbaik: ${sp.bestScore}%`)
      );
      if (stage.hints && stage.hints.length) wrap.appendChild(renderHintSheet(stage));
    }
    return wrap;
  }

  function renderQuiz(stage) {
    const sp = getStageProgress(level.id, stage.id);
    const alreadyAnswered = sp.status === "passed";
    const wrap = el("div", {});
    stage.options.forEach((opt, i) => {
      const btn = el("button", { class: "quiz-opt", disabled: alreadyAnswered }, opt);
      if (alreadyAnswered && i === stage.correctIndex) btn.classList.add("correct");
      btn.addEventListener("click", () => {
        const result = gradeQuizStage(stage, i);
        Array.from(wrap.children).forEach((b, bi) => {
          b.disabled = true;
          if (bi === stage.correctIndex) b.classList.add("correct");
          else if (bi === i && !result.passed) b.classList.add("wrong");
        });
        toast(result.message, result.passed ? "" : "err");
        if (result.passed) {
          const r = completeUngradedStage(level, stage);
          if (r.xpAwarded) showXpToast(r.xpAwarded, stage.title);
        }
        renderHeader();
        setTimeout(() => renderQuestPanel(), 350);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function renderReflect(stage) {
    const sp = getStageProgress(level.id, stage.id);
    const done = sp.status === "passed";
    const ta = el("textarea", {
      placeholder: stage.placeholder || "",
      style: "width:100%;min-height:110px;padding:12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text);font-family:inherit;font-size:13.5px;resize:vertical;",
      disabled: done,
    });
    const wrap = el("div", {}, [ta]);
    if (done) {
      ta.value = "✓ Refleksi tersimpan. Terima kasih!";
    } else {
      const btn = el("button", { class: "btn btn-primary btn-sm", style: "margin-top:10px;" }, "Simpan Refleksi");
      btn.addEventListener("click", () => {
        const val = ta.value.trim();
        if (val.length < (stage.minLength || 15)) {
          toast(`Tulis minimal ${stage.minLength || 15} karakter.`, "err");
          return;
        }
        const r = completeUngradedStage(level, stage, { note: val });
        if (r.xpAwarded) showXpToast(r.xpAwarded, stage.title);
        renderHeader();
        renderQuestPanel();
      });
      wrap.appendChild(btn);
    }
    return wrap;
  }

  function renderHintSheet(stage) {
    const sp = getStageProgress(level.id, stage.id);
    const revealed = Math.min(sp.hintsUsed, stage.hints.length);
    const sheet = el("div", { class: "hint-sheet" });
    sheet.appendChild(el("div", { style: "font-weight:800;font-size:13px;color:var(--accent);" }, `💡 Hint (${revealed}/${stage.hints.length})`));
    for (let i = 0; i < revealed; i++) {
      sheet.appendChild(el("div", { class: "hint-item" }, [el("div", { class: "hn" }, `Hint ${i + 1}`), el("div", {}, stage.hints[i])]));
    }
    if (revealed < stage.hints.length) {
      sheet.appendChild(
        el("button", { class: "btn btn-ghost btn-sm", style: "margin-top:8px;", onclick: () => { recordHintUsed(level.id, stage.id); renderQuestPanel(); } }, "Tampilkan Hint Berikutnya")
      );
    }
    return sheet;
  }

  function selectStage(stageId) {
    st.stageId = stageId;
    st.hasRunThisStage = false;
    const stage = currentStage();
    if (isSqlStage(stage) && st.cm) {
      st.cm.setValue(getDraft(draftKeyOf(stage)) || stage.starterSql || "");
    }
    clear(panelResult);
    panelResult.appendChild(emptyResultHint());
    renderQuestPanel();
    renderEditorPanel();
    renderActionBar();
  }

  // -------------------------------------------------------------- editor panel
  function renderEditorPanel() {
    clear(panelEditor);
    const stage = currentStage();

    if (!isSqlStage(stage)) {
      panelEditor.appendChild(el("div", { class: "empty-state" }, [el("div", { class: "ic" }, "📝"), el("p", {}, "Tahap ini tidak menggunakan SQL Editor — jawab langsung pada tab Quest.")]));
      return;
    }

    const toolbar = el("div", { class: "editor-toolbar" }, [
      el("button", { class: "btn btn-sm btn-ghost", onclick: resetCode }, "↺ Reset Kode"),
      el("button", { class: "btn btn-sm btn-ghost", onclick: toggleFullscreen }, "⛶ Full Screen"),
      el("div", { class: "spacer" }),
      el("button", { class: "btn btn-sm btn-danger", onclick: onResetSandbox }, "🗄 Reset Sandbox"),
    ]);
    const editorWrap = el("div", { class: "editor-wrap" });
    const cmHost = el("div", {});
    editorWrap.appendChild(cmHost);

    const runSubmitRow = el("div", { class: "editor-toolbar run-submit-row", style: "margin-top:8px;" }, [
      el("button", { class: "btn btn-primary btn-block", onclick: onRun }, "▶ Run"),
      stage.type === "sql"
        ? el("button", { class: "btn btn-submit btn-block", onclick: onSubmit }, "✓ Submit")
        : el("button", { class: "btn btn-submit btn-block", onclick: onMarkUnderstood }, "✓ Tandai Paham"),
    ]);

    panelEditor.append(toolbar, editorWrap, runSubmitRow);

    st.cm = CodeMirror(cmHost, {
      value: getDraft(draftKeyOf(stage)) || stage.starterSql || "",
      mode: "text/x-mysql",
      theme: "dracula",
      lineNumbers: true,
      matchBrackets: true,
      autofocus: false,
      extraKeys: { "Ctrl-Space": "autocomplete" },
    });
    st.cm.on("change", () => {
      clearTimeout(st.saveTimer);
      st.saveTimer = setTimeout(() => saveDraft(draftKeyOf(stage), st.cm.getValue()), 500);
    });
    setTimeout(() => st.cm.refresh(), 30);

    const fsBtn = editorWrap;
    fsBtn.__toggle = () => {
      editorWrap.classList.toggle("fullscreen");
      setTimeout(() => st.cm.refresh(), 30);
    };
  }

  function toggleFullscreen() {
    const wrap = panelEditor.querySelector(".editor-wrap");
    wrap.classList.toggle("fullscreen");
    if (!wrap.querySelector(".fs-close")) {
      if (wrap.classList.contains("fullscreen")) {
        const closeBtn = el("button", { class: "btn btn-sm btn-ghost fs-close", style: "align-self:flex-end;margin-bottom:6px;", onclick: () => { wrap.classList.remove("fullscreen"); setTimeout(() => st.cm.refresh(), 30); } }, "✕ Tutup Full Screen");
        wrap.insertBefore(closeBtn, wrap.firstChild);
      }
    }
    setTimeout(() => st.cm.refresh(), 30);
  }

  function resetCode() {
    const stage = currentStage();
    st.cm.setValue(stage.starterSql || "");
    saveDraft(draftKeyOf(stage), stage.starterSql || "");
  }

  async function onResetSandbox() {
    const ok = await confirmModal({
      title: "Reset Sandbox?",
      body: "Seluruh perubahan data (INSERT/UPDATE/DELETE/CREATE) pada sandbox level ini akan dikembalikan ke kondisi awal. Kode di editor tidak akan hilang.",
      confirmLabel: "Reset Sandbox",
      danger: true,
    });
    if (!ok) return;
    await st.sandbox.restart();
    toast("Sandbox direset ke kondisi awal.");
    renderSchemaPanel();
    clear(panelResult);
    panelResult.appendChild(emptyResultHint());
  }

  // -------------------------------------------------------------- run / submit
  function onRun() {
    const stage = currentStage();
    const sql = st.cm.getValue();
    saveDraft(draftKeyOf(stage), sql);
    const execResult = st.sandbox.run(sql);
    st.lastExec = execResult;
    st.hasRunThisStage = true;
    renderResultFromExec(execResult, stage.expectError);
    renderSchemaPanel();
    switchToResultOnMobile();
  }

  function onMarkUnderstood() {
    const stage = currentStage();
    if (!st.hasRunThisStage) {
      toast("Jalankan (Run) query contohnya dulu, baru tandai paham.", "err");
      return;
    }
    const r = completeUngradedStage(level, stage);
    if (r.xpAwarded) showXpToast(r.xpAwarded, stage.title);
    renderHeader();
    renderQuestPanel();
    toast("Mantap! Lanjut ke tahap berikutnya.");
    advanceStageIfPossible();
  }

  function onSubmit() {
    const stage = currentStage();
    const sql = st.cm.getValue();
    saveDraft(draftKeyOf(stage), sql);
    const execResult = st.sandbox.run(sql);
    st.lastExec = execResult;
    const gradeResult = gradeSqlStage(st.sandbox, sql, execResult, stage);
    renderFeedback(gradeResult, execResult);
    renderSchemaPanel();
    switchToResultOnMobile();

    const { xpEvents, mastery, justCompleted, courseJustCompleted } = submitStageResult(level, stage, sql, gradeResult);
    xpEvents.forEach((e) => showXpToast(e.amount, e.reason));
    renderHeader();
    renderQuestPanel();

    if (gradeResult.passed) {
      if (justCompleted) {
        const next = getNextLevel(level.id);
        const xpGained = xpEvents.reduce((a, e) => a + e.amount, 0);
        setTimeout(() => {
          celebrateLevelComplete({
            badgeIcon: level.badgeIcon,
            badgeName: level.title,
            levelTitle: `Lv.${level.id} ${level.title}`,
            xpGained,
            mastery,
            hasNext: !!next,
            courseComplete: courseJustCompleted,
            onContinue: () => (courseJustCompleted ? navigate("certificate") : next ? navigate("quest", next.id) : navigate("journey")),
          });
        }, 250);
      } else {
        toast("✅ Submit diterima — kriteria terpenuhi!");
        setTimeout(() => advanceStageIfPossible(), 400);
      }
    } else {
      toast("Belum lolos — cek feedback pada tab Result.", "err");
    }
  }

  function advanceStageIfPossible() {
    const idx = level.stages.findIndex((x) => x.id === st.stageId);
    const next = level.stages[idx + 1];
    if (next) selectStage(next.id);
  }

  function switchToResultOnMobile() {
    if (window.matchMedia("(max-width: 1023px)").matches) switchTab("result");
  }

  // -------------------------------------------------------------- result panel
  function emptyResultHint() {
    return el("div", { class: "empty-hint" }, "Jalankan query (Run) untuk melihat hasil di sini.");
  }

  function renderResultFromExec(execResult, expectError) {
    clear(panelResult);
    if (!execResult.ok) {
      panelResult.appendChild(
        el("div", { class: "error-box" }, expectError ? `(Sesuai dugaan) ${humanizeSqlError(execResult.error)}` : humanizeSqlError(execResult.error))
      );
      return;
    }
    panelResult.appendChild(renderResultTable(execResult.results));
  }

  function renderFeedback(gradeResult, execResult) {
    clear(panelResult);
    const box = el("div", { class: `feedback-box ${gradeResult.passed ? "pass" : "fail"}` }, [
      el("div", { class: "fb-title" }, gradeResult.passed ? "✅ Lolos" : "❌ Belum Lolos"),
      el("p", { style: "margin:0;" }, gradeResult.message),
    ]);
    if (gradeResult.breakdown) {
      const bd = gradeResult.breakdown;
      box.appendChild(
        el("div", { class: "fb-breakdown" }, [
          metric("Correctness", bd.correctness),
          metric("Concept", bd.concept),
          metric("Efficiency", bd.efficiency),
          metric("Interpretation", bd.interpretation),
        ])
      );
      box.appendChild(el("div", { style: "margin-top:10px;font-weight:800;font-size:13px;" }, `Skor: ${gradeResult.score}%`));
    }
    panelResult.appendChild(box);
    if (execResult && execResult.ok) panelResult.appendChild(renderResultTable(execResult.results));
    else if (execResult) panelResult.appendChild(el("div", { class: "error-box" }, humanizeSqlError(execResult.error)));
  }

  function metric(label, value) {
    return el("div", { class: "fb-metric" }, [el("div", { class: "v" }, `${value}%`), el("div", { class: "k" }, label)]);
  }

  function renderResultTable(results) {
    if (!results || !results.length) {
      return el("div", { class: "empty-hint" }, "Query berhasil dijalankan (tidak ada baris hasil untuk ditampilkan — mis. INSERT/UPDATE/DELETE/CREATE).");
    }
    const last = results[results.length - 1];
    const wrap = el("div", {}, [
      el("div", { class: "result-meta" }, [el("span", {}, ["Baris: ", el("b", {}, String(last.values.length))]), el("span", {}, ["Kolom: ", el("b", {}, String(last.columns.length))])]),
    ]);
    const table = el("table", { class: "result-table" });
    const thead = el("thead", {}, [el("tr", {}, last.columns.map((c) => el("th", {}, c)))]);
    const tbody = el("tbody", {}, last.values.slice(0, 200).map((row) => el("tr", {}, row.map((v) => el("td", {}, v === null ? "NULL" : String(v))))));
    table.append(thead, tbody);
    wrap.appendChild(el("div", { class: "table-scroll" }, table));
    if (last.values.length > 200) wrap.appendChild(el("div", { class: "tag-note" }, `Menampilkan 200 dari ${last.values.length} baris.`));
    return wrap;
  }

  // -------------------------------------------------------------- schema panel
  function renderSchemaPanel() {
    clear(panelSchema);
    panelSchema.appendChild(el("div", { class: "section-title" }, "Schema Sandbox"));
    for (const tableName of level.tables) {
      if (!st.sandbox.tableExists(tableName)) continue;
      const info = st.sandbox.getTableInfo(tableName);
      const block = el("div", { class: "schema-table" });
      block.appendChild(el("div", { class: "tname" }, tableName));
      info.forEach((c) => {
        const isPk = c.pk === 1;
        const isFk = !isPk && /_id$/.test(c.name);
        block.appendChild(
          el("div", { class: "schema-col" }, [
            el("span", { class: "cname" }, c.name),
            el("span", {}, [el("span", { class: "ctype" }, c.type || "TEXT"), isPk ? el("span", { class: "ckey pk" }, "PK") : null, isFk ? el("span", { class: "ckey fk" }, "FK?") : null]),
          ])
        );
      });
      const sample = st.sandbox.query(`SELECT * FROM ${tableName} LIMIT 3`);
      if (sample.length) {
        const cols = Object.keys(sample[0]);
        const sTable = el("table", { class: "result-table" }, [
          el("thead", {}, [el("tr", {}, cols.map((c) => el("th", {}, c)))]),
          el("tbody", {}, sample.map((row) => el("tr", {}, cols.map((c) => el("td", {}, row[c] === null ? "NULL" : String(row[c])))))),
        ]);
        block.appendChild(el("div", { class: "schema-sample" }, el("div", { class: "table-scroll" }, sTable)));
      }
      panelSchema.appendChild(block);
    }
  }

  // -------------------------------------------------------------- action bar (mobile)
  function renderActionBar() {
    clear(actionBar);
    const stage = currentStage();
    if (!isSqlStage(stage)) {
      actionBar.appendChild(el("div", { class: "empty-hint", style: "flex:1;padding:6px;" }, "Jawab pada tab Quest ⤴"));
      return;
    }
    actionBar.append(
      el("button", { class: "btn btn-primary", onclick: onRun }, "▶ Run"),
      stage.type === "sql" ? el("button", { class: "btn btn-submit", onclick: onSubmit }, "✓ Submit") : el("button", { class: "btn btn-submit", onclick: onMarkUnderstood }, "✓ Paham")
    );
  }

  // -------------------------------------------------------------- intro / materi + latihan awal
  function showQuestInterface() {
    introScreen.classList.add("force-hide");
    tabsBar.classList.remove("force-hide");
    panels.classList.remove("force-hide");
    actionBar.classList.remove("force-hide");
    renderQuestPanel();
    renderEditorPanel();
    renderSchemaPanel();
    renderActionBar();
  }

  function renderIntroScreen() {
    clear(introScreen);
    tabsBar.classList.add("force-hide");
    panels.classList.add("force-hide");
    actionBar.classList.add("force-hide");
    introScreen.classList.remove("force-hide");

    const introStage = level.stages[0];
    const hasPractice = introStage.type === "practice";
    const demoSql = hasPractice ? (introStage.starterSql || "") : `SELECT * FROM ${level.tables[0]} LIMIT 5;`;
    const demoInstruction = hasPractice
      ? introStage.instruction
      : "Jalankan query berikut untuk melihat contoh data yang akan Anda pakai di level ini.";

    introScreen.appendChild(
      el("div", { class: "quest-story" }, [
        el("div", { class: "kicker" }, `${level.cpmk} • ${level.subCpmk}`),
        el("div", {}, level.story),
      ])
    );

    introScreen.appendChild(el("div", { class: "intro-kicker" }, [el("span", { class: "step-num" }, "1"), "Materi Pembelajaran"]));
    for (const m of level.microlearning) {
      const block = el("div", { class: "micro-block" }, [el("h4", {}, m.heading), el("p", { style: "margin:0;" }, m.body)]);
      if (m.code) block.appendChild(el("pre", { class: "code-block" }, m.code));
      introScreen.appendChild(block);
    }

    introScreen.appendChild(el("div", { class: "intro-kicker" }, [el("span", { class: "step-num" }, "2"), "Latihan Awal (Guided Practice)"]));
    const practiceCard = el("div", { class: "instruction-box" }, [el("p", { style: "margin:0 0 10px;" }, demoInstruction)]);
    const cmHost = el("div", { class: "intro-practice-editor" });
    practiceCard.appendChild(cmHost);
    const introResult = el("div", { style: "margin-top:10px;" });
    practiceCard.appendChild(el("button", { class: "btn btn-primary btn-sm", style: "margin-top:10px;" }, "▶ Jalankan Latihan"));
    practiceCard.appendChild(introResult);
    introScreen.appendChild(practiceCard);

    const introCm = CodeMirror(cmHost, {
      value: demoSql,
      mode: "text/x-mysql",
      theme: "dracula",
      lineNumbers: true,
      matchBrackets: true,
    });
    setTimeout(() => introCm.refresh(), 30);

    let hasRunPractice = false;
    practiceCard.querySelector("button").addEventListener("click", () => {
      const exec = st.sandbox.run(introCm.getValue());
      hasRunPractice = true;
      clear(introResult);
      if (!exec.ok) introResult.appendChild(el("div", { class: "error-box" }, humanizeSqlError(exec.error)));
      else introResult.appendChild(renderResultTable(exec.results));
    });

    introScreen.appendChild(
      el(
        "button",
        {
          class: "btn btn-submit btn-block intro-cta",
          onclick: () => {
            if (!hasRunPractice) {
              toast("Coba jalankan dulu latihannya (▶ Jalankan Latihan) sebelum lanjut.", "err");
              return;
            }
            if (hasPractice) {
              const r = completeUngradedStage(level, introStage);
              if (r.xpAwarded) showXpToast(r.xpAwarded, introStage.title);
            }
            markIntroSeen(level.id);
            st.stageId = pickInitialStage(level);
            renderHeader();
            showQuestInterface();
          },
        },
        "Lanjut ke Quest →"
      )
    );
  }

  // -------------------------------------------------------------- boot
  renderHeader();
  renderTabs();
  panelResult.appendChild(emptyResultHint());

  const loadingNode = el("div", { class: "empty-state" }, [el("div", { class: "spinner" }), el("p", {}, "Menyiapkan SQL sandbox (SQLite via WebAssembly)...")]);
  panelSchema.appendChild(loadingNode);

  st.sandbox = await new Sandbox(level.datasetSql).init();

  clear(panelSchema);
  if (getState().levels[level.id].introSeen) {
    showQuestInterface();
  } else {
    renderIntroScreen();
  }

  window.addEventListener("resize", () => { if (st.cm) st.cm.refresh(); });

  return root;
}

function pickInitialStage(level) {
  const s = getState();
  const ls = s.levels[level.id];
  for (const stg of level.stages) {
    const sp = ls.stages[stg.id];
    if (!sp || sp.status !== "passed") return stg.id;
  }
  return level.stages[level.stages.length - 1].id;
}
