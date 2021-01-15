import {
  editor,
  IDisposable,
  Range
} from "monaco-editor/esm/vs/editor/editor.api";
import { debounce } from "lodash";
import { css } from "glamor";
import { isActionOf } from "typesafe-actions";
import socket, { WebsocketEvents } from "state/clients/websocket";
import * as actions from "state/clients/websocket/actions";
import { Viewer, ViewerSelection, TextOperations } from "state/file/types";
import getStore from "state/store";
import { getCurrentUser } from "state/user/hooks/useCurrentUser";
import { getUserList } from "state/user/hooks/useUserList";
import { User } from "state/user/types";
import { getOpScriptWorker } from "workers";

interface File {
  id: string;
  path: string;
  contents: string;
  branch_name: string;
  module_name: string;
  module_scope: string;
  module_version: string;
}

interface LiveClientOptions {
  model: editor.ITextModel;
  file: File;
  onViewersChanged: () => void;
}

const ViewerColors = [
  [0, 200, 255],
  [255, 200, 0],
  [0, 255, 200],
  [100, 0, 255],
  [255, 0, 0],
  [255, 0, 200],
  [0, 100, 255],
  [200, 255, 0],
  [0, 255, 0],
  [200, 0, 255],
  [0, 0, 255],
  [0, 255, 100],
  [255, 0, 100],
  [100, 255, 0],
  [255, 100, 0]
];

function createCursorStyle(color: number[]) {
  return `${css({
    display: "inherit",
    position: "absolute",
    backgroundColor: rgba([...color, 0.8]),
    width: "2px !important",
    height: "100%",
    cursor: "text",
    zindex: 200
  })}`;
}

function createSecondaryCursorStyle(color: number[]) {
  return `${css({
    backgroundColor: rgba([...color, 0.6]),
    width: "2px !important"
  })}`;
}

function createSelectionStyle(color: number[], opacity: number) {
  return `${css({
    backgroundColor: rgba([...color, opacity]),
    borderRadius: 3,
    minWidth: 8
  })}`;
}

function rgba(arr: number[]) {
  if (arr.length < 3) {
    throw Error("not a valid rgb array");
  }
  return arr.length > 3
    ? `rgba(${arr[0]}, ${arr[1]}, ${arr[2]}, ${arr[3]})`
    : `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
}

class LiveClient {
  isEditor = false;
  viewers: Viewer[] = [];

  private currentUser?: User;
  private suppress = false;
  private model: editor.ITextModel;
  private file: File;
  private onViewersChanged: () => void;
  private editor?: editor.ICodeEditor;

  private viewerClasses: { [key: string]: string } = {};
  private vsd: { [key: string]: string[] } = {};
  private modelDisposables: IDisposable[] = [];
  private editorDisposables: IDisposable[] = [];
  private currentSelection?: ReturnType<typeof actions.viewerSelectionChange>;

  constructor(options: LiveClientOptions) {
    this.file = options.file;
    this.model = options.model;
    this.onViewersChanged = options.onViewersChanged;
    this.onMessage = this.onMessage.bind(this);
    this.onLocalChange = this.onLocalChange.bind(this);
    this.debouncedOnContentChanged = debounce(
      this.debouncedOnContentChanged.bind(this),
      200
    );
    this.modelDisposables.push(
      this.model.onDidChangeContent(this.onLocalChange)
    );

    socket.listen(this.onMessage);
    socket.emit(actions.subscribeFile(this.file.id));
  }

  private debouncedOnContentChanged(
    e: monaco.editor.IModelContentChangedEvent
  ) {
    this.getEmitOutput();
  }

  private async getEmitOutput() {
    const worker = await getOpScriptWorker();
    const output = await worker.emitFile(this.model.uri.toString());
    socket.emit(actions.compilerOutput({ fileId: this.file.id, output }));
  }

  attachEditor(editor: editor.ICodeEditor) {
    this.editorDisposables.push(
      editor.onDidChangeCursorSelection(e => {
        if (this.suppress) {
          // change came from remote
          return;
        }
        this.currentSelection = actions.viewerSelectionChange({
          selection: {
            primary: this.getSelection(e.selection),
            secondary: e.secondarySelections.map(s => this.getSelection(s)),
            source: e.source
          },
          fileId: this.file.id
        });
        socket.emit(this.currentSelection);
      })
    );

    this.editor = editor;
  }

  detachEditor() {
    this.editorDisposables.forEach(d => d.dispose());
    this.editorDisposables = [];
    this.editor = undefined;
  }

  dispose() {
    socket.unlisten(this.onMessage);
    this.modelDisposables.forEach(d => d.dispose());
    this.editorDisposables.forEach(d => d.dispose());
  }

  private getSelection(selection: monaco.Selection) {
    const startPrimarySelection = this.model.getOffsetAt({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn
    });
    const endPrimarySelection = this.model.getOffsetAt({
      lineNumber: selection.endLineNumber,
      column: selection.endColumn
    });

    return {
      selection:
        startPrimarySelection === endPrimarySelection
          ? []
          : [startPrimarySelection, endPrimarySelection],
      cursorPosition: this.model.getOffsetAt({
        lineNumber: selection.positionLineNumber,
        column: selection.positionColumn
      })
    };
  }

  private setEditable(editable: boolean) {
    this.editor?.updateOptions({ readOnly: !editable });
  }

  // Handles local editor change events
  private onLocalChange(e: editor.IModelContentChangedEvent) {
    if (this.suppress) {
      return;
    }
    this.debouncedOnContentChanged(e);

    const ops: TextOperations = [];

    e.changes.forEach(c => {
      const { rangeOffset, rangeLength, text } = c;

      if (text.length > 0 && rangeLength === 0) {
        // Insert operation
        ops.push([rangeOffset, text]);
      } else if (text.length > 0 && rangeLength > 0) {
        // Replace operation. In this case we treat it as an insert and a delete
        // so we push to operations
        ops.push([rangeOffset, text], [rangeOffset + text.length, rangeLength]);
      } else if (text.length === 0 && rangeLength > 0) {
        // Delete operation.
        ops.push([rangeOffset, rangeLength]);
      } else {
        throw new Error("Unexpected change: " + JSON.stringify(c));
      }
    });
    this.sendOps(ops);
  }

  // Handles changes from another client
  private onRemoteChange(ops: TextOperations) {
    this.suppress = true;
    // Have to set editable momentarily to make the remote edits.
    // Could alternatively use model.applyEdits
    this.setEditable(true);

    for (const [offset, change] of ops) {
      const pos = this.model.getPositionAt(offset);
      const start = pos;

      let edits: Array<editor.IIdentifiedSingleEditOperation> = [];

      if (typeof change === "string") {
        // Insert operation
        edits.push({
          range: new Range(
            start.lineNumber,
            start.column,
            start.lineNumber,
            start.column
          ),
          text: change,
          forceMoveMarkers: true
        });
      } else {
        // Delete operation
        const end = this.model.getPositionAt(offset + change);
        edits.push({
          range: new Range(
            start.lineNumber,
            start.column,
            end.lineNumber,
            end.column
          ),
          text: null,
          forceMoveMarkers: true
        });
      }

      this.editor?.executeEdits("remote", edits);
    }
    this.setEditable(false);
    this.suppress = false;
  }

  private onMessage(action: WebsocketEvents) {
    if (
      isActionOf(actions.edit, action) &&
      action.payload.fileId === this.file.id
    ) {
      this.onRemoteChange(action.payload.ops);
    }

    if (
      isActionOf(actions.viewers, action) &&
      action.payload.fileId === this.file.id
    ) {
      this.onViewersChange(action);
    }

    if (
      isActionOf(actions.viewerSelectionChange, action) &&
      action.payload.fileId === this.file.id
    ) {
      this.updateViewerSelections(action);
    }
  }

  private onViewersChange(action: ReturnType<typeof actions.viewers>) {
    // Immediately send current selection so all other viewers
    if (this.currentSelection) {
      socket.emit(this.currentSelection);
    }
    const { viewers, editor } = action.payload;
    this.clearViewerSelections();
    this.currentUser = getCurrentUser(getStore().getState());
    if (!this.currentUser) {
      throw Error("no current user defined");
    }
    this.isEditor = this.currentUser?.email === editor;
    if (this.isEditor) {
      this.clearViewerSelections(this.currentUser.opaque_id);
    }
    this.viewers = viewers.map((v, idx) => {
      const existingViewer = this.viewers.find(ev => ev.email === v);
      return {
        email: v,
        color: ViewerColors[idx % ViewerColors.length],
        isEditor: v === editor,
        selection: existingViewer?.selection || {
          primary: {
            cursorPosition: 0,
            selection: []
          },
          secondary: [],
          source: "LiveClient"
        }
      };
    });
    this.setEditable(this.isEditor);

    this.onViewersChanged();
  }

  private sendOps(ops: TextOperations) {
    socket.emit(
      actions.edit({
        fileId: this.file.id,
        ops
      })
    );
  }

  private clearViewerSelections(userId?: string) {
    const decorations = Object.keys(this.vsd).filter(d =>
      userId ? d.startsWith(userId) : true
    );

    decorations.forEach(decorationId => {
      if (
        !userId ||
        decorationId.startsWith(this.getSelectionDecorationId(userId))
      ) {
        this.vsd[decorationId] = this.model.deltaDecorations(
          this.vsd[decorationId] || [],
          []
        );
      }
    });
  }

  private getSelectionDecorationId = (userId: string) =>
    [userId, this.file.id].join("|");

  private cleanViewerSelections = (
    viewerSelectionsToKeep: ViewerSelection[]
  ) => {
    const existingVsds = Object.keys(this.vsd);

    const newViewerSelections: { [key: string]: ViewerSelection } = {};
    for (let i = 0; i < viewerSelectionsToKeep.length; i++) {
      newViewerSelections[viewerSelectionsToKeep[i].userId] =
        viewerSelectionsToKeep[i];
    }

    existingVsds.forEach(existingDecorationId => {
      const userId = existingDecorationId.split("|")[0];
      if (!newViewerSelections[userId]) {
        const decorationId = this.getSelectionDecorationId(userId);
        this.vsd[decorationId] = this.model.deltaDecorations(
          this.vsd[decorationId] || [],
          []
        );
      }
    });
  };

  public updateViewerSelections(
    action: ReturnType<typeof actions.viewerSelectionChange>
  ) {
    const { selection, email } = action.payload;

    const existingViewer = this.viewers.find(ev => ev.email === email);
    if (!existingViewer) {
      return;
    }
    existingViewer.selection = selection;
    // Filter out ourselves. We don't want to highlight our own selections because our editor does that for us
    const viewerSelections = this.getSelections().filter(
      s => s.userId !== this.currentUser?.opaque_id
    );
    this.cleanViewerSelections(viewerSelections);

    viewerSelections.forEach((viewerSelection: ViewerSelection) => {
      const { userId } = viewerSelection;

      const decorationId = this.getSelectionDecorationId(userId);
      if (viewerSelection.selection === null) {
        this.vsd[decorationId] = this.model.deltaDecorations(
          this.vsd[decorationId] || [],
          []
        );

        return;
      }

      const decorations: Array<{
        range: monaco.Range;
        options: {
          className: string;
        };
      }> = [];
      const { selection, color } = viewerSelection;

      const getCursorDecoration = (position: number, className: string) => {
        const cursorPos = this.model.getPositionAt(position);

        return {
          range: new monaco.Range(
            cursorPos.lineNumber,
            cursorPos.column,
            cursorPos.lineNumber,
            cursorPos.column
          ),
          options: {
            className: `${this.viewerClasses[className]}`
          }
        };
      };

      const getSelectionDecoration = (
        start: number,
        end: number,
        className: string
      ) => {
        const from = this.model.getPositionAt(start);
        const to = this.model.getPositionAt(end);

        return {
          range: new monaco.Range(
            from.lineNumber,
            from.column,
            to.lineNumber,
            to.column
          ),
          options: {
            className: this.viewerClasses[className],
            stickiness: 3 // https://microsoft.github.io/monaco-editor/api/enums/monaco.editor.trackedrangestickiness.html
          }
        };
      };
      const prefix = color.join("-") + "_" + userId;
      const cursorClassName = prefix + "-c";
      const nameTagClassName = prefix + "-nt";
      const secondaryCursorClassName = prefix + "-sc";
      const selectionClassName = prefix + "-s";
      const secondarySelectionClassName = prefix + "-ss";

      if (!this.viewerClasses[cursorClassName]) {
        this.viewerClasses[cursorClassName] = createCursorStyle(color);
      }

      if (!this.viewerClasses[secondaryCursorClassName]) {
        this.viewerClasses[
          secondaryCursorClassName
        ] = createSecondaryCursorStyle(color);
      }

      if (!this.viewerClasses[selectionClassName]) {
        this.viewerClasses[selectionClassName] = createSelectionStyle(
          color,
          0.3
        );
      }

      if (!this.viewerClasses[secondarySelectionClassName]) {
        this.viewerClasses[secondarySelectionClassName] = createSelectionStyle(
          color,
          0.2
        );
      }

      decorations.push(
        getCursorDecoration(selection.primary.cursorPosition, cursorClassName)
      );

      if (selection.primary.selection.length) {
        decorations.push(
          getSelectionDecoration(
            selection.primary.selection[0],
            selection.primary.selection[1],
            selectionClassName
          )
        );
      }

      if (selection.secondary.length) {
        selection.secondary.forEach(s => {
          decorations.push(
            getCursorDecoration(s.cursorPosition, secondaryCursorClassName)
          );

          if (s.selection.length) {
            decorations.push(
              getSelectionDecoration(
                s.selection[0],
                s.selection[1],
                secondarySelectionClassName
              )
            );
          }
        });
      }

      this.vsd[decorationId] = this.model.deltaDecorations(
        this.vsd[decorationId] || [],
        decorations
      );

      if (selection.source !== "modelChange") {
        const decoration = this.model.deltaDecorations(
          [],
          [
            getCursorDecoration(
              selection.primary.cursorPosition,
              nameTagClassName
            )
          ]
        );
        this.vsd[decorationId].push(...decoration);
      }
    });
  }

  getSelections() {
    const selections: ViewerSelection[] = [];
    const users = getUserList(getStore().getState());

    this.viewers.forEach(viewer => {
      const user = users.find(u => u.email === viewer.email);

      if (user && viewer.selection) {
        selections.push({
          userId: user.opaque_id,
          color: viewer.color,
          name: user.username || user.email,
          selection: viewer.selection
        });
      }
    });

    return selections;
  }
}

export default LiveClient;
