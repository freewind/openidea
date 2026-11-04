import { describe, expect, it } from "vitest";
import { intellijMacos } from "./intellij-macos";
import { intellijClassicMacos } from "./intellij-classic-macos";

/** Bindings checked against IDEA's `$default.xml` (base) and `Mac OS X.xml`
 * (overlay), i.e. the "IntelliJ IDEA Classic" preset of IDEA 2026.1.
 * An action the overlay lists without keystrokes is unbound; one it does not
 * list inherits the `$default` binding, which macOS loads through
 * `MacOSDefaultKeymap` — its `mapModifiers` swaps Ctrl and Meta, so
 * `control shift N` there is ⇧⌘N here. */
describe("IDEA Classic keymap", () => {
  it("covers the same actions as intellij-macos", () => {
    expect(Object.keys(intellijClassicMacos).sort()).toEqual(Object.keys(intellijMacos).sort());
  });

  it.each([
    // Inherited from `$default.xml`, with macOS' Ctrl↔Meta swap applied.
    ["navigate.gotoClass", ["Meta+N"]], // GotoClass
    ["navigate.gotoFile", ["Shift+Meta+N"]], // GotoFile
    ["navigate.back", ["Alt+Meta+Left", "Button4"]], // Back + side button
    ["navigate.forward", ["Alt+Meta+Right", "Button5"]], // Forward
    ["code.commentLine", ["Meta+/"]], // CommentByLineComment
    ["editor.closeTab", ["Meta+F4"]], // CloseContent
    ["file.save", ["Meta+S"]], // SaveAll
    ["editor.codeBlockStart", ["Meta+["]], // EditorCodeBlockStart
    ["code.unfold", ["Meta+="]], // ExpandRegion
    ["find.inFile", ["Meta+F", "Alt+F3"]], // Find + Mac OS X.xml FindAlt
    ["code.expandToLevel1", ["Meta+* 1"]], // ExpandToLevel1 (chord, $default → swapped)
    // Written in `Mac OS X.xml` itself: no swap.
    ["navigate.declaration", ["Meta+B"]], // GotoDeclaration
    ["file.settings", ["Meta+,"]], // ShowSettings
    ["toolwindow.project", ["Meta+1"]], // ActivateProjectToolWindow
    ["window.next", ["Meta+`"]], // NextWindow
    ["window.toggleFullScreen", ["Ctrl+Meta+F"]], // ToggleFullScreen
    ["editor.toggleColumnSelection", ["Shift+Meta+8", "Shift+Meta+*"]], // EditorToggleColumnMode
    ["code.selectAllOccurrences", ["Ctrl+Meta+G"]], // SelectAllOccurrences
    ["code.expandAllToLevel1", ["Alt+Meta+* 1"]], // ExpandAllToLevel1 (chord)
    // Unbound by `Mac OS X.xml` (listed without keystrokes).
    ["editor.scrollToCenter", []], // EditorScrollToCenter
    ["refactor.thisMenu", []], // Refactorings.QuickListPopupAction
    // Unbound everywhere (no XML lists them).
    ["editor.reopenClosedTab", []],
    ["build.rebuildProject", []],
    // `Mac OS X.xml` moves the group action; the base binding must not survive.
    ["project.newFile", ["Ctrl+N", "Ctrl+Enter"]], // NewElement
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
