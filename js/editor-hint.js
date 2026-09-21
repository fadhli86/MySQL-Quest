// Schema-aware SQL autocomplete for CodeMirror editors.
//
// CodeMirror's sql-hint addon (already loaded in index.html) completes SQL
// keywords out of the box, and table/column names if it is given a
// `tables` map. This wires it to the live sandbox schema — including tables
// the student created during the level — and opens the list while typing
// instead of only on Ctrl-Space.

// `getSchema` returns { tableName: [columnName, ...] } for the current sandbox.
export function enableSchemaAutocomplete(cm, getSchema) {
  const hintOptions = {
    hint: (editor, options) => window.CodeMirror.hint.sql(editor, { ...options, tables: getSchema() }),
    completeSingle: false,
    // Enter must keep inserting a newline: an open list would otherwise
    // swallow it and insert a suggestion. Tab still picks the suggestion.
    extraKeys: { Enter: undefined },
  };
  cm.setOption("hintOptions", hintOptions);
  cm.setOption("extraKeys", { ...(cm.getOption("extraKeys") || {}), "Ctrl-Space": "autocomplete" });

  cm.on("inputRead", (editor, change) => {
    if (change.origin !== "+input" || editor.state.completionActive) return;
    const typed = (change.text && change.text[0]) || "";
    if (!/^[A-Za-z0-9_.]$/.test(typed)) return;
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line).slice(0, cur.ch);
    const word = (line.match(/[A-Za-z0-9_.]*$/) || [""])[0];
    if (word.length >= 2 || typed === ".") editor.showHint(hintOptions);
  });
}

// Keyboard/screen-reader access for a CodeMirror editor:
// - the hidden textarea gets an accessible name;
// - Tab / Shift+Tab leave the editor instead of inserting indentation
//   (CodeMirror's default makes the editor a keyboard trap). The suggestion
//   list still uses Tab to pick a completion while it is open.
export function makeEditorAccessible(cm, label) {
  cm.getInputField().setAttribute("aria-label", label);
  cm.setOption("extraKeys", { ...(cm.getOption("extraKeys") || {}), Tab: false, "Shift-Tab": false });
}
