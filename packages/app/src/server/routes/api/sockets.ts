import http from "http";
import redis from "redis";
import { Server, Socket } from "socket.io";
import { createAdapter } from "socket.io-redis";
import { ActionType, isActionOf } from "typesafe-actions";

import env from "server/env";
import * as actions from "state/clients/websocket/actions";
import ModuleClient from "server/moduleClient";
import { log } from "@opstrace/utils";

type WebsocketEvents = ActionType<typeof actions>;

class SocketClient {
  private io: Server;
  private roomPrefix = "file:";
  private moduleClient = new ModuleClient();

  constructor(server: Server) {
    this.io = server;
    this.io.on("connection", this.onConnection.bind(this));
  }

  async onMessage(socket: Socket, action: WebsocketEvents) {
    if (isActionOf(actions.subscribeFile, action)) {
      this.onSubscribeFile(socket, action.payload);
    }

    if (isActionOf(actions.unsubscribeFile, action)) {
      this.onUnsubscribeFile(socket, action.payload);
    }

    if (isActionOf(actions.claimEditor, action)) {
      this.onClaimEditor(socket, action.payload);
    }

    if (isActionOf(actions.edit, action)) {
      this.onFileEdit(socket, action);
    }

    if (isActionOf(actions.viewerSelectionChange, action)) {
      this.onViewerSelectionChange(socket, action);
    }
  }

  onViewerSelectionChange(
    socket: Socket,
    action: ReturnType<typeof actions.viewerSelectionChange>
  ) {
    const room = this.getFileRoom(action.payload.fileId);
    // inject email and broadcast to all others watching this file
    action.payload.email = socket.request.session.email;
    this.emit(room, action, socket);
  }

  onFileEdit(socket: Socket, action: ReturnType<typeof actions.edit>) {
    const room = this.getFileRoom(action.payload.fileId);
    // broadcast to all others watching this file
    this.emit(room, action, socket);
    this.moduleClient.saveFileOps(action.payload.fileId, action.payload.ops);
  }

  onClaimEditor(socket: Socket, fileId: string) {
    this.setFileEditor(fileId, socket.request.session.email);
    const room = this.getFileRoom(fileId);
    this.emitFileViewers(room);
  }

  onUnsubscribeFile(socket: Socket, fileId: string) {
    const room = this.getFileRoom(fileId);
    socket.leave(room);
    this.emitFileViewers(room);
  }

  async onSubscribeFile(socket: Socket, fileId: string) {
    const room = this.getFileRoom(fileId);
    socket.join(room);
    try {
      const ops = await this.moduleClient.getFileOps(fileId);
      socket.emit(
        "message",
        actions.edit({
          fileId: fileId,
          ops
        })
      );
    } catch (err) {
      log.error("failed to get and parse edits: ", err);
    }
    this.emitFileViewers(room);
  }

  getFileRoom(fileId: string) {
    return `${this.roomPrefix}${fileId}`;
  }

  fileIdFromRoom(room: string) {
    return room.replace(this.roomPrefix, "");
  }

  isFileRoom(room: string) {
    return room.startsWith(this.roomPrefix);
  }

  onConnection(socket: Socket) {
    socket.on("disconnecting", () => {
      socket.removeAllListeners();
      this.onDisconnect(socket);
    });
    socket.on("message", (action: WebsocketEvents) => {
      this.onMessage(socket, action);
    });
  }

  async getFileEditor(fileId: string): Promise<string | null> {
    try {
      const editor = await this.moduleClient.redisGet(`file:${fileId}:editor`);
      return editor;
    } catch (err) {
      log.error("failed to get editor from redis: ", err);
      return null;
    }
  }

  setFileEditor(fileId: string, email: string) {
    if (!fileId || !email) {
      return;
    }
    return this.moduleClient.redisSet(`file:${fileId}:editor`, email);
  }

  async isFileEditor(socket: Socket, fileId: string) {
    const editor = await this.getFileEditor(fileId);
    return editor === socket.request.session.email;
  }

  async onDisconnect(socket: Socket) {
    const filesToSnapshot: string[] = await Promise.all(
      [...socket.rooms.values()].map(async room => {
        if (this.isFileRoom(room)) {
          // If user is file editor and they've made edits, save a snapshot
          try {
            const fileId = this.fileIdFromRoom(room);
            const isEditor = await this.isFileEditor(socket, fileId);

            if (isEditor) {
              const ops = await this.moduleClient.getFileOps(fileId);

              if (ops.length) {
                return fileId;
              }
            }
          } catch (err) {
            log.error("failed to check/create snapshot on disconnect: %s", err);
          }
          this.emitFileViewers(room, [socket.id]);
        }
        return "null";
      })
    );
    this.moduleClient.createSnapshot(filesToSnapshot.filter(f => f !== "null"));
  }
  /**
   * If socket defined, will send to all sockets in room
   * except sender.
   * @param room
   * @param action
   * @param socket
   */
  emit(room: string, action: WebsocketEvents, socket?: Socket) {
    return socket
      ? socket.to(room).emit("message", action)
      : this.io.to(room).emit("message", action);
  }

  async emitFileViewers(room: string, excludeSocketIds?: string[]) {
    const sids = await this.io.in(room).allSockets();
    excludeSocketIds?.forEach(sid => {
      sids.delete(sid);
    });
    const members: string[] = [];
    for (const sid of sids) {
      const email = this.io.of("/").sockets.get(sid)?.request.session?.email;
      if (email && !members.includes(email)) {
        members.push(email);
      }
    }
    const fileId = this.fileIdFromRoom(room);
    let editor = await this.getFileEditor(fileId);
    if (!editor || (!members.includes(editor) && members.length)) {
      // set a new editor
      editor = members[0];
      this.setFileEditor(fileId, editor);
    }
    this.emit(
      room,
      actions.viewers({
        fileId,
        viewers: members,
        editor: editor || ""
      })
    );
  }
}

export default function createWebsocketServer(server: http.Server) {
  const socketServer = new Server(server, {
    serveClient: false,
    path: "/_/socket"
  });
  const pubClient = redis.createClient({
    host: env.REDIS_HOST,
    password: env.REDIS_PASSWORD
  });
  const subClient = pubClient.duplicate();

  socketServer.adapter(
    createAdapter({
      pubClient,
      subClient
    })
  );
  new SocketClient(socketServer);
}
