/**
 * ↑ / ↓ (with ⇧ extending) and Clone Caret Above / Below in visible columns:
 * the caret keeps its goal column across lines of mixed-width text (CJK,
 * fullwidth punctuation, emoji, tabs) instead of a pixel x that drifts when a
 * wide glyph is not exactly two cells wide. Soft-wrapped lines keep
 * CodeMirror's pixel motion between their visual rows.
 */
import { EditorSelection, StateEffect, StateField, type EditorState, type SelectionRange } from "@codemirror/state";
import type { Command, EditorView } from "@codemirror/view";
import { offsetAtVisibleColumn, visibleColumn } from "./visibleColumn";

/** Goal visible column per caret head, kept while only these commands move the carets. */
const setGoals = StateEffect.define<ReadonlyMap<number, number>>();

export const visibleGoalColumns = StateField.define<ReadonlyMap<number, number> | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setGoals)) return e.value;
    return tr.selection || tr.docChanged ? null : value;
  },
});

function goalOf(state: EditorState, head: number): number {
  const goal = state.field(visibleGoalColumns, false)?.get(head);
  if (goal !== undefined) return goal;
  const line = state.doc.lineAt(head);
  return visibleColumn(line.text, head - line.from, state.tabSize);
}

/** Whether the line from `pos` is one visual row (not soft-wrapped, not merged with others by a fold). */
function singleRow(view: EditorView, pos: number): boolean {
  const line = view.state.doc.lineAt(pos);
  const block = view.lineBlockAt(pos);
  if (block.from !== line.from || block.to !== line.to) return false;
  if (!view.lineWrapping || line.length === 0) return true;
  const a = view.coordsAtPos(line.from, 1);
  const b = view.coordsAtPos(line.to, -1);
  return !!a && !!b && Math.abs(a.top - b.top) < 1;
}

/** The head one visual line up / down from `head` at visible column `goal`, or null at the document edge. */
export function verticalHead(view: EditorView, head: number, forward: boolean, goal: number): number | null {
  const { state } = view;
  const block = view.lineBlockAt(head);
  if (forward ? block.to >= state.doc.length : block.from <= 0) return null;
  const target = forward ? block.to + 1 : block.from - 1;
  if (singleRow(view, head) && singleRow(view, target)) {
    const line = state.doc.lineAt(target);
    return line.from + offsetAtVisibleColumn(line.text, goal, state.tabSize);
  }
  const moved = view.moveVertically(EditorSelection.cursor(head), forward).head;
  return moved === head ? null : moved;
}

function moveCarets(view: EditorView, forward: boolean, extend: boolean): boolean {
  const { state } = view;
  const goals = new Map<number, number>();
  const ranges = state.selection.ranges.map((r): SelectionRange => {
    if (!extend && !r.empty) return EditorSelection.cursor(forward ? r.to : r.from);
    const goal = goalOf(state, r.head);
    let head = verticalHead(view, r.head, forward, goal);
    if (head === null) head = forward ? state.doc.lineAt(r.head).to : state.doc.lineAt(r.head).from;
    goals.set(head, goal);
    return extend ? EditorSelection.range(r.anchor, head) : EditorSelection.cursor(head);
  });
  const selection = EditorSelection.create(ranges, state.selection.mainIndex);
  if (selection.eq(state.selection)) return false;
  view.dispatch({ selection, effects: setGoals.of(goals), scrollIntoView: true, userEvent: "select" });
  return true;
}

export const cursorLineUp: Command = (view) => moveCarets(view, false, false);
export const cursorLineDown: Command = (view) => moveCarets(view, true, false);
export const selectLineUp: Command = (view) => moveCarets(view, false, true);
export const selectLineDown: Command = (view) => moveCarets(view, true, true);

/** One batch of carets added by a clone, kept so the opposite direction can undo it. */
interface CloneBatch {
  heads: readonly number[];
  forward: boolean;
}
const setCloneStack = StateEffect.define<readonly CloneBatch[]>();

/** Clone history since the last non-clone selection change; any other selection or doc change resets it. */
export const cloneStack = StateField.define<readonly CloneBatch[]>({
  create: () => [],
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setCloneStack)) return e.value;
    return tr.selection || tr.docChanged ? [] : value;
  },
});

/** Clone Caret Above / Below: a caret on the next line at each caret's goal column.
 * IntelliJ-style stack: cloning in the opposite direction undoes the last batch
 * instead of adding another one; once the stack is empty, cloning adds again. */
function cloneCaret(view: EditorView, forward: boolean): boolean {
  const { state } = view;
  const stack = state.field(cloneStack, false) ?? [];
  const top = stack[stack.length - 1];
  if (top && top.forward !== forward) {
    const undo = new Set(top.heads);
    const kept = state.selection.ranges.filter((r) => !undo.has(r.head));
    if (kept.length < state.selection.ranges.length) {
      const goals = new Map<number, number>();
      for (const r of kept) goals.set(r.head, goalOf(state, r.head));
      view.dispatch({
        selection: EditorSelection.create(kept, Math.min(state.selection.mainIndex, kept.length - 1)),
        effects: [setGoals.of(goals), setCloneStack.of(stack.slice(0, -1))],
        scrollIntoView: true,
        userEvent: "select",
      });
      return true;
    }
  }
  const ranges = state.selection.ranges.slice();
  const goals = new Map<number, number>();
  const added: number[] = [];
  for (const r of state.selection.ranges) {
    const goal = goalOf(state, r.head);
    goals.set(r.head, goal);
    const line = state.doc.lineAt(r.head);
    // A soft-wrapped line: step over its own visual rows first.
    let head: number | null = r.head;
    while (head !== null && head >= line.from && head <= line.to) {
      const next = verticalHead(view, head, forward, goal);
      head = next === head ? null : next;
    }
    if (head === null || ranges.some((x) => x.head === head)) continue;
    ranges.push(EditorSelection.cursor(head));
    goals.set(head, goal);
    added.push(head);
  }
  if (added.length === 0) return false;
  view.dispatch({
    selection: EditorSelection.create(ranges, ranges.length - 1),
    effects: [setGoals.of(goals), setCloneStack.of([...stack, { heads: added, forward }])],
    scrollIntoView: true,
    userEvent: "select",
  });
  return true;
}

export const cloneCaretAbove: Command = (view) => cloneCaret(view, false);
export const cloneCaretBelow: Command = (view) => cloneCaret(view, true);
