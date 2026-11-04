import { describe, expect, it } from "vitest";
import { intellijMacos } from "./intellij-macos";
import { intellijClassicMacos } from "./intellij-classic-macos";

/** Bindings checked against IDEA's `$default.xml` (base) and `Mac OS X.xml`
 * (overlay), i.e. the "IntelliJ IDEA Classic (macOS)" preset of IDEA 2026.1.
 * An action the overlay lists without keystrokes is unbound; one it does not
 * list inherits the `$default` Ctrl spelling. */
describe("IDEA Classic keymap", () => {
  it("covers the same actions as intellij-macos", () => {
    expect(Object.keys(intellijClassicMacos).sort()).toEqual(Object.keys(intellijMacos).sort());
  });

  it.each([
    // Inherited from `$default.xml` (Mac OS X.xml does not override).
    ["navigate.gotoClass", ["Ctrl+N"]], // GotoClass
    ["navigate.back", ["Ctrl+Alt+Left", "Button4"]], // Back + side button
    ["navigate.forward", ["Ctrl+Alt+Right", "Button5"]], // Forward
    ["navigate.findAction", ["Ctrl+Shift+A"]], // GotoAction
    ["navigate.recentFiles", ["Ctrl+E"]], // RecentFiles
    ["code.commentLine", ["Ctrl+/"]], // CommentByLineComment
    ["navigate.gotoTest", ["Ctrl+Shift+T"]], // GotoTest
    ["find.inFile", ["Ctrl+F", "Alt+F3"]], // Find + Mac OS X.xml FindAlt
    ["editor.codeBlockStart", ["Ctrl+["]], // EditorCodeBlockStart
    ["code.expandToLevel1", ["Ctrl+* 1"]], // ExpandToLevel1 (second-keystroke chord)
    ["run.run", ["Shift+F10"]], // Run
    ["run.debug", ["Shift+F9"]], // Debug
    ["editor.closeTab", ["Ctrl+F4"]], // CloseContent
    ["file.save", ["Ctrl+S"]], // SaveAll
    // Overridden by `Mac OS X.xml` with ⌘ spellings.
    ["navigate.declaration", ["Meta+B"]], // GotoDeclaration
    ["navigate.implementation", ["Ctrl+Alt+B", "Meta+Alt+Button1"]], // GotoImplementation + mouse
    ["file.settings", ["Meta+,"]], // ShowSettings
    ["toolwindow.project", ["Meta+1"]], // ActivateProjectToolWindow
    ["toolwindow.bookmarks", ["Meta+2"]], // ActivateBookmarksToolWindow
    ["toolwindow.resizeLeft", ["Ctrl+Alt+Shift+Left"]], // ResizeToolWindowLeft
    ["window.next", ["Meta+`"]], // NextWindow
    ["window.previous", ["Shift+Meta+`"]], // PreviousWindow
    ["window.toggleFullScreen", ["Ctrl+Meta+F"]], // ToggleFullScreen
    ["code.expandAllToLevel1", ["Alt+Meta+* 1"]], // ExpandAllToLevel1 (chord)
    ["editor.toggleColumnSelection", ["Shift+Meta+8", "Shift+Meta+*"]], // EditorToggleColumnMode
    ["code.selectAllOccurrences", ["Ctrl+Meta+G"]], // SelectAllOccurrences
    // Unbound by `Mac OS X.xml` (listed without keystrokes).
    ["editor.scrollToCenter", []], // EditorScrollToCenter
    ["refactor.thisMenu", []], // RefactorThis
    // Unbound everywhere (no XML lists them).
    ["editor.reopenClosedTab", []],
    ["build.rebuildProject", []],
  ])("%s matches the Classic XML layering", (id, bindings) => {
    expect(intellijClassicMacos[id]).toEqual(bindings);
  });

  it("keeps the mouse bindings of intellij-macos (side buttons, editor clicks)", () => {
    const mouse = (b: string[]) => b.filter((x) => /Button\d+$/.test(x));
    for (const [id, bindings] of Object.entries(intellijMacos)) {
      expect(mouse(intellijClassicMacos[id]!), id).toEqual(mouse(bindings));
    }
    expect(intellijClassicMacos["navigate.back"]).toContain("Button4");
    expect(intellijClassicMacos["navigate.forward"]).toContain("Button5");
  });
});
