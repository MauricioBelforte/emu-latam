const net = require("net");

// Netplay protocol magic & lengths
const NETPLAY_MAGIC = 0x52414E50;
const MITM_SESSION_MAGIC = 0x52415453;  // RATS
const MITM_LINK_MAGIC = 0x5241544C;     // RATL
const MITM_ID_LEN = 16;  // magic(4) + uuid(12)
const HEADER_LEN = 16;
const POST_HEADER_LEN = 8;
const NICK_LEN = 32;

// Netplay commands
const CMD_ACK = 0x0000;
const CMD_NACK = 0x0001;
const CMD_DISCONNECT = 0x0002;
const CMD_INPUT = 0x0003;
const CMD_NICK = 0x0020;
const CMD_INFO = 0x0022;
const CMD_SYNC = 0x0023;

// Client states during handshake
const ST_MITM_ID = 0;    // MITM pre-handshake (RATS + UUID)
const ST_HEADER = 1;
const ST_POST_HEADER = 2;
const ST_SEND_NICK = 3;
const ST_RECV_NICK = 4;
const ST_SEND_INFO = 5;
const ST_RECV_INFO = 6;
const ST_SEND_SYNC = 7;
const ST_READY = 8;

function be32(val) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(val, 0);
  return b;
}

function readBE32(buf, off) {
  return buf.readUInt32BE(off);
}

class MitmRelay {
  constructor(port = 55435) {
    this.port = port;
    this.server = null;
    this.master = null;
    this.guest = null;
    this.masterHeader = null;
    this.masterPostHeader = null;
    this.masterInfo = null;
    this.firstSyncSent = false;
    this.guestInfoDeferred = false;
    this.states = new WeakMap();
    this.cmdBuffer = new WeakMap();
    this.cmdSize = new WeakMap();
    this.syncSent = new WeakMap();
    this.clientNum = new WeakMap();

    this.nick = new WeakMap();
    this.protocolVersion = 4;
  }

  start() {
    this.server = net.createServer((socket) => {
      socket.setNoDelay(true);

      let buf = Buffer.alloc(0);

      socket.on("data", (data) => {
        buf = Buffer.concat([buf, data]);

        // Assign master/guest lazily on first data, not on TCP connection.
        // This prevents waitForPort probes (connect+disconnect without data)
        // from capturing a slot.
        const existing = this.clientNum.get(socket);
        if (!existing) {
          const firstMagic = data.length >= 4 ? "0x" + data.slice(0, 4).toString("hex").toUpperCase() : "N/A";
          console.log(`[MITM] New client data, first bytes: ${firstMagic}, total: ${data.length}`);
          if (!this.master) {
            this.master = socket;
            this.clientNum.set(socket, 1);
            this.states.set(socket, ST_MITM_ID);
            this.cmdBuffer.set(socket, null);
            this.cmdSize.set(socket, 0);
            this.syncSent.set(socket, false);
            this.nick.set(socket, null);
            console.log("[MITM] Master connected (client 1)");
          } else if (!this.guest) {
            this.guest = socket;
            this.clientNum.set(socket, 2);
            this.states.set(socket, ST_MITM_ID);
            this.cmdBuffer.set(socket, null);
            this.cmdSize.set(socket, 0);
            this.syncSent.set(socket, false);
            this.nick.set(socket, null);
            console.log("[MITM] Guest connected (client 2)");
            this.onGuestReady();
          } else {
            console.log("[MITM] Rejected extra connection");
            socket.end();
            return;
          }
        }

        buf = this.process(socket, buf);
      });

      socket.on("close", () => {
        const num = this.clientNum.get(socket);
        console.log(`[MITM] Client ${num || "?"} disconnected`);
        if (socket === this.master) this.master = null;
        if (socket === this.guest) this.guest = null;
        if (this.master && this.master !== socket) this.master.end();
        if (this.guest && this.guest !== socket) this.guest.end();
        if (!num) console.log("[MITM] (was a probe, no data received)");
      });

      socket.on("error", (err) => {
        if (!err.message.includes("ECONNRESET") && !err.message.includes("EPIPE")) {
          console.error(`[MITM] Socket error: ${err.message}`);
        }
      });
    });
    this.server.listen(this.port, "0.0.0.0", () => {
      console.log(`[MITM] Relay listening on 0.0.0.0:${this.port}`);
    });
    this.server.on("error", (err) => {
      console.error(`[MITM] Server error: ${err.message}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    if (this.master) {
      this.master.destroy();
      this.master = null;
    }
    if (this.guest) {
      this.guest.destroy();
      this.guest = null;
    }
    console.log("[MITM] Relay stopped");
  }

  // initClient logic moved inline into the 'connection' callback for lazy
  // master/guest assignment (see start()). This avoids waitForPort probes
  // capturing a slot.

  onGuestReady() {
    if (this.master && this.guest) {
      console.log("[MITM] Both clients connected, starting handshake relay");
    }
  }

  process(socket, buf) {
    let state = this.states.get(socket);
    const num = this.clientNum.get(socket);
    let consumed = 0;

    while (consumed < buf.length) {
      const remaining = buf.slice(consumed);

      switch (state) {
        case ST_MITM_ID: {
          if (remaining.length < MITM_ID_LEN) {
            return remaining;
          }
          const mitmMagic = readBE32(remaining, 0);
          if (mitmMagic === MITM_SESSION_MAGIC) {
            const uuid = remaining.slice(4, MITM_ID_LEN);
            consumed += MITM_ID_LEN;
            // Respond with RATL + same UUID
            const linkBuf = Buffer.alloc(MITM_ID_LEN);
            linkBuf.writeUInt32BE(MITM_LINK_MAGIC, 0);
            uuid.copy(linkBuf, 4);
            socket.write(linkBuf);
            console.log(`[MITM] Sent MITM link (RATL) to client ${num}`);
            state = ST_HEADER;
            this.states.set(socket, state);
            if (consumed >= buf.length) {
              return remaining.slice(MITM_ID_LEN);
            }
          } else {
            // No MITM pre-handshake, proceed directly to header
            console.log(`[MITM] No MITM pre-handshake (magic: 0x${mitmMagic.toString(16)}), direct header`);
            state = ST_HEADER;
            this.states.set(socket, state);
          }
          break;
        }
        case ST_HEADER: {
          if (remaining.length < HEADER_LEN) {
            return remaining;
          }
          const header = remaining.slice(0, HEADER_LEN);
          consumed += HEADER_LEN;

          if (num === 1) {
            this.masterHeader = header;
            // Detect protocol version from header
            const magic = readBE32(header, 0);
            if (magic === NETPLAY_MAGIC) {
              this.protocolVersion = 5;
            }
            console.log(`[MITM] Master header received, protocol v${this.protocolVersion}`);
          }

          // Echo back appropriate header, zeroing out the salt field (bytes 12-15)
          // to avoid triggering RA's password dialog (client interprets non-zero as password required)
          const echoHeader = Buffer.alloc(HEADER_LEN);
          header.copy(echoHeader);
          echoHeader.writeUInt32BE(0, 12);
          socket.write(echoHeader);
          console.log(`[MITM] Sent header echo to client ${num} (salt zeroed)`);
          console.log(`[MITM]   src: ${header.toString("hex").toUpperCase()}`);
          console.log(`[MITM]   out: ${echoHeader.toString("hex").toUpperCase()}`);

          if (num === 1 && this.guest && this.guest !== socket) {
            // For master when guest already connected, need to read guest's post-header first
            // Actually, the master just proceeds normally
            state = ST_POST_HEADER;
          } else if (num === 2) {
            state = ST_POST_HEADER;
          } else {
            state = ST_POST_HEADER;
          }
          this.states.set(socket, state);
          break;
        }

        case ST_POST_HEADER: {
          if (this.protocolVersion < 5) {
            // v4 protocol has no post-header
            state = ST_SEND_NICK;
            this.states.set(socket, state);
            break;
          }
          if (remaining.length < POST_HEADER_LEN) {
            return remaining;
          }
          const postHeader = remaining.slice(0, POST_HEADER_LEN);
          consumed += POST_HEADER_LEN;

          if (num === 1) {
            this.masterPostHeader = postHeader;
            const pv = readBE32(postHeader, 0);
            if (pv >= 5) this.protocolVersion = pv;
            console.log(`[MITM] Master post-header, protocol v${this.protocolVersion}`);
          }

          socket.write(postHeader);
          console.log(`[MITM] Sent post-header echo to client ${num}`);

          state = ST_SEND_NICK;
          this.states.set(socket, state);
          break;
        }

        case ST_SEND_NICK: {
          // Send hardcoded "NICK" (matches C mitm server behavior)
          const serverNick = "NICK";
          const nickBuf = Buffer.alloc(8 + NICK_LEN);
          nickBuf.writeUInt32BE(CMD_NICK, 0);
          nickBuf.writeUInt32BE(NICK_LEN, 4);
          nickBuf.write(serverNick, 8, NICK_LEN, "ascii");
          socket.write(nickBuf);
          console.log(`[MITM] Sent server NICK "${serverNick}" to client ${num}`);
          state = ST_RECV_NICK;
          this.states.set(socket, state);
          if (consumed >= buf.length) {
            return remaining;
          }
          break;
        }

        case ST_RECV_NICK: {
          if (remaining.length < 8) {
            return remaining;
          }
          const cmdId = readBE32(remaining, 0);
          const payloadLen = readBE32(remaining, 4);
          const totalSize = 8 + payloadLen;
          if (remaining.length < totalSize) {
            return remaining;
          }
          const cmd = remaining.slice(0, totalSize);
          consumed += totalSize;

          if (cmdId === CMD_NICK) {
            const nickStr = cmd.toString("ascii", 8, Math.min(8 + NICK_LEN, totalSize)).replace(/\0/g, "").trim();
            this.nick.set(socket, nickStr);
            console.log(`[MITM] Received NICK from client ${num}: "${nickStr}"`);
            // Server NICK already conveys the opponent's name; no peer forwarding needed
          } else if (cmdId === CMD_NACK) {
            console.error(`[MITM] Client ${num} sent NACK during nick`);
            socket.end();
            return remaining;
          }

          state = ST_SEND_INFO;
          this.states.set(socket, state);
          break;
        }

        case ST_SEND_INFO: {
          if (num === 1 || (num === 2 && !this.masterInfo)) {
            // Master: empty INFO; guest also empty if master not ready
            const infoBuf = Buffer.alloc(8);
            infoBuf.writeUInt32BE(CMD_INFO, 0);
            infoBuf.writeUInt32BE(0, 4);
            socket.write(infoBuf);
            console.log(`[MITM] Sent empty INFO to client ${num}`);
            state = ST_RECV_INFO;
          } else {
            // Guest with masterInfo: send peer INFO + SYNC immediately
            // (matches C mitm server: client 2+ gets INFO+SYNC back-to-back)
            socket.write(this.masterInfo);
            console.log(`[MITM] Sent master INFO to guest`);
            this.sendSync(socket, num);
            this.syncSent.set(socket, true);
            state = ST_READY;
            console.log(`[MITM] Sent SYNC to guest (immediate)`);
            if (this.master && this.syncSent.get(this.master)) {
              this.requestSaveStateFromMaster();
            }
          }
          this.states.set(socket, state);
          break;
        }

        case ST_RECV_INFO: {
          if (remaining.length < 8) {
            return remaining;
          }
          const cmdId = readBE32(remaining, 0);
          const payloadSize = readBE32(remaining, 4);
          const totalSize = 8 + payloadSize;

          if (remaining.length < totalSize) {
            return remaining;
          }

          // Ignore non-INFO commands during INFO exchange (e.g., forwarded INPUT)
          if (cmdId !== CMD_INFO) {
            consumed += totalSize;
            console.log(`[MITM] Ignored non-INFO cmd 0x${cmdId.toString(16)} (payload ${payloadSize}) in ST_RECV_INFO`);
            break;
          }

          const infoPacket = remaining.slice(0, totalSize);
          consumed += totalSize;

          if (num === 1) {
            // Master: two-INFO echo approach (unchanged)
            if (!this.infoSentTo || !this.infoSentTo[1]) {
              // First INFO → echo back, wait for second
              this.masterInfo = infoPacket;
              console.log(`[MITM] Master first INFO, echoing back`);
              socket.write(infoPacket);
              this.infoSentTo = this.infoSentTo || {};
              this.infoSentTo[1] = true;
              this.states.set(socket, ST_RECV_INFO);
              console.log(`[MITM] Master will get SYNC on next INFO`);

              // If guest was waiting, send SYNC now
              if (this.guestInfoDeferred) {
                this.sendSync(this.guest, 2);
                this.syncSent.set(this.guest, true);
                this.states.set(this.guest, ST_READY);
                this.guestInfoDeferred = false;
                console.log(`[MITM] Sent SYNC to guest (deferred)`);
                this.firstSyncSent = true;
                if (this.master && this.guest &&
                    this.syncSent.get(this.master) && this.syncSent.get(this.guest)) {
                  this.requestSaveStateFromMaster();
                }
              }
            } else {
              // Second INFO → send SYNC
              console.log(`[MITM] Master second INFO, sending SYNC`);
              this.sendSync(socket, num);
              this.syncSent.set(socket, true);
              this.states.set(socket, ST_READY);
              console.log(`[MITM] Sent SYNC to master`);
              this.firstSyncSent = true;
              // If guest is deferred, send SYNC now
              if (this.guestInfoDeferred) {
                this.sendSync(this.guest, 2);
                this.syncSent.set(this.guest, true);
                this.states.set(this.guest, ST_READY);
                this.guestInfoDeferred = false;
                console.log(`[MITM] Sent deferred SYNC to guest`);
              }
              if (this.master && this.guest &&
                  this.syncSent.get(this.master) && this.syncSent.get(this.guest)) {
                this.requestSaveStateFromMaster();
              }
            }
          } else if (num === 2) {
            // Guest
            if (this.guestInfoDeferred || this.syncSent.get(this.master)) {
              // Guest deferred or master already ready → send SYNC now
              console.log(`[MITM] Guest sent INFO, sending SYNC`);
              this.sendSync(socket, num);
              this.syncSent.set(socket, true);
              this.states.set(socket, ST_READY);
              console.log(`[MITM] Sent SYNC to guest`);
              this.guestInfoDeferred = false;
              if (this.master && this.guest &&
                  this.syncSent.get(this.master) && this.syncSent.get(this.guest)) {
                this.requestSaveStateFromMaster();
              }
            } else {
              // Guest sent INFO (master not ready yet), defer
              console.log(`[MITM] Guest sent INFO (master not ready), deferring`);
              this.guestInfoDeferred = true;
              this.states.set(socket, ST_RECV_INFO);
            }
          }
          break;
        }

        case ST_SEND_SYNC: {
          // This case may be reached from the normal state machine path
          // but sync was already sent from ST_RECV_INFO, so just skip
          if (this.syncSent.get(socket)) {
            // Already synced, move to ready
            this.states.set(socket, ST_READY);
            break;
          }
          this.sendSync(socket, num);
          this.syncSent.set(socket, true);
          this.states.set(socket, ST_READY);
          console.log(`[MITM] Sent SYNC to client ${num}`);

          if (num === 1) {
            this.firstSyncSent = true;
            if (this.guest && this.syncSent.get(this.guest)) {
              this.requestSaveStateFromMaster();
            }
          } else if (num === 2) {
            if (this.master && this.syncSent.get(this.master)) {
              this.requestSaveStateFromMaster();
            }
          }
          return remaining;
        }

        case ST_READY: {
          // In READY state, process commands
          const result = this.processCommand(socket, num, remaining);
          if (!result) {
            return remaining;
          }
          consumed += result.consumed;
          if (result.newState !== undefined) {
            state = result.newState;
            this.states.set(socket, state);
          }
          break;
        }

        default:
          consumed = buf.length;
          break;
      }
    }

    // Execute pending "send" states that were queued after all data was consumed.
    // Without this, the while loop exits when consumed == buf.length and send states
    // like ST_SEND_INFO never execute, causing deadlock (client waits for our message).
    state = this.states.get(socket);
    if (state === ST_SEND_NICK) {
      const serverNick = "NICK";
      const nickBuf = Buffer.alloc(8 + NICK_LEN);
      nickBuf.writeUInt32BE(CMD_NICK, 0);
      nickBuf.writeUInt32BE(NICK_LEN, 4);
      nickBuf.write(serverNick, 8, NICK_LEN, "ascii");
      socket.write(nickBuf);
      console.log(`[MITM] Sent server NICK "${serverNick}" to client ${num} (post-loop)`);
      this.states.set(socket, ST_RECV_NICK);
    } else if (state === ST_SEND_INFO) {
      if (num === 1 || (num === 2 && !this.masterInfo)) {
        const infoBuf = Buffer.alloc(8);
        infoBuf.writeUInt32BE(CMD_INFO, 0);
        infoBuf.writeUInt32BE(0, 4);
        socket.write(infoBuf);
        console.log(`[MITM] Sent empty INFO to client ${num} (post-loop)`);
        this.states.set(socket, ST_RECV_INFO);
      } else {
        socket.write(this.masterInfo);
        console.log(`[MITM] Sent master INFO to guest (post-loop)`);
        this.sendSync(socket, num);
        this.syncSent.set(socket, true);
        this.states.set(socket, ST_READY);
        console.log(`[MITM] Sent SYNC to guest (post-loop, immediate)`);
        if (this.master && this.syncSent.get(this.master)) {
          this.requestSaveStateFromMaster();
        }
      }
    }

    return buf.slice(consumed);
  }

  processCommand(socket, num, data) {
    if (data.length < 8) return null;
    const cmdId = readBE32(data, 0);
    const payloadSize = readBE32(data, 4);
    const totalSize = 8 + payloadSize;

    if (data.length < totalSize) return null;

    const packet = data.slice(0, totalSize);

    const other = num === 1 ? this.guest : this.master;
    if (other && other.writable) {
      other.write(packet);
      if (cmdId !== CMD_INPUT) {
        console.log(`[MITM] Forwarded cmd 0x${cmdId.toString(16)} from client ${num}`);
      }
    }

    return { consumed: totalSize };
  }

  sendSync(socket, num) {
    const bothPlayers = 3; // bits 0 and 1 = players 1 and 2
    let syncBuf;
    if (this.protocolVersion >= 5) {
      syncBuf = Buffer.alloc(8 + 4 + 4 + 4*16 + 16 + 4*16 + 32);
      syncBuf.writeUInt32BE(CMD_SYNC, 0);
      syncBuf.writeUInt32BE(syncBuf.length - 8, 4);
      syncBuf.writeUInt32BE(0, 8);          // frame count
      syncBuf.writeUInt32BE(bothPlayers, 12); // both players present
      syncBuf.writeUInt32BE(5, 16);          // netplay version / features
      syncBuf.writeUInt32BE(5, 20);          // netplay version / features
      // Device info array (64 bytes) — all zeros, RA will use defaults
      // 16-byte field at offset 88
      syncBuf.writeUInt32BE(bothPlayers, 88); // both players have devices
      // Second device array (64 bytes) — all zeros
      // Spectator info (32 bytes) — all zeros
    } else {
      syncBuf = Buffer.alloc(8 + 4 + 4 + 4 + 4*16 + 32);
      syncBuf.writeUInt32BE(CMD_SYNC, 0);
      syncBuf.writeUInt32BE(syncBuf.length - 8, 4);
      syncBuf.writeUInt32BE(0, 8);          // frame count
      syncBuf.writeUInt32BE(bothPlayers, 12); // both players present
      syncBuf.writeUInt32BE(5, 16);          // netplay version / features
      syncBuf.writeUInt32BE(5, 20);          // netplay version / features
      // Device info array (64 bytes) — all zeros
      // Spectator info (32 bytes) — all zeros
    }
    socket.write(syncBuf);
  }

  getOtherSocket(socket) {
    if (socket === this.master) return this.guest;
    if (socket === this.guest) return this.master;
    return null;
  }

  getClientNum(socket) {
    return this.clientNum.get(socket) || 0;
  }


  requestSaveStateFromMaster() {
    // Skip savestate sync - let netplay handle it naturally
    // This prevents premature REQ_SAVE/LOAD_SAVE that confuses the guest
  }
}

// Run standalone if executed directly
if (require.main === module) {
  const port = parseInt(process.argv[2], 10) || 55435;
  const relay = new MitmRelay(port);
  relay.start();

  process.on("SIGINT", () => {
    console.log("[MITM] Shutting down...");
    relay.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    relay.stop();
    process.exit(0);
  });
  process.on("uncaughtException", (err) => {
    if (err.message.includes("EPIPE") || err.message.includes("ECONNRESET")) return;
    console.error("[MITM] Uncaught:", err);
  });
}

module.exports = { MitmRelay };
