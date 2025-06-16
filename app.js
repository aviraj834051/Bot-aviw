import login from "fca-priyansh";
import fs from "fs";
import express from "express";

const OWNER_UIDS = ["100001808342073", "100005122337500", "100085671340090", "100087646701594", "100024447049530"];
let spamInterval = null;
let stopRequested = false;
const lockedGroupNames = {};

const app = express();
app.get("/", (_, res) => res.send("<h2>✨ AVII DON BOT Running</h2>"));
app.listen(20782, () => console.log("🌐 Log server: http://localhost:20782"));

// Handle crashes
process.on("uncaughtException", (err) => console.error("❗ Uncaught Exception:", err.message));
process.on("unhandledRejection", (reason) => console.error("❗ Unhandled Rejection:", reason));

login({ appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) }, (err, api) => {
  if (err) return console.error("❌ Login failed:", err);

  api.setOptions({ listenEvents: true });
  console.log("✅ Bot logged in and running...");

  api.listenMqtt(async (err, event) => {
    try {
      if (err || !event) return;
      const { threadID, senderID, body, messageID } = event;

      // Anti group name change
      if (event.type === "event" && event.logMessageType === "log:thread-name") {
        const currentName = event.logMessageData.name;
        const lockedName = lockedGroupNames[threadID];

        if (lockedName && currentName !== lockedName) {
          try {
            await api.setTitle(lockedName, threadID);
            api.sendMessage(`🧷 Group name change mt kr. Locked: "${lockedName}" 🔐`, threadID);
          } catch (e) {
            console.error("❌ Error reverting group name:", e.message);
          }
        }
        return;
      }

      if (!body) return;
      const lowerBody = body.toLowerCase();

      // 🚫 Abuse detection
      const badNames = ["hannu", "syco", "anox", "avii"];
      const triggers = ["teri", "bhen", "maa", "rndi"];
      if (badNames.some(n => lowerBody.includes(n)) && triggers.some(w => lowerBody.includes(w))) {
        return api.sendMessage(
          "⚠️ Teri ma Rndi hai tu msg mt kr. Hannu chodega teri ma ko byy🙂 SS lekr story lga by",
          threadID,
          messageID
        );
      }

      if (!OWNER_UIDS.includes(senderID)) return;

      const args = body.trim().split(" ");
      const cmd = args[0].toLowerCase();
      const input = args.slice(1).join(" ");

      // ---- COMMANDS ----

      if (cmd === "!allname") {
        const info = await api.getThreadInfo(threadID);
        const members = info.participantIDs;
        api.sendMessage(`🛠 ${members.length} members ko nickname de rhe...`, threadID);

        for (const uid of members) {
          try {
            await api.changeNickname(input, threadID, uid);
            await new Promise(res => setTimeout(res, 30000));
          } catch (e) {
            console.log(`⚠️ Nickname fail for ${uid}:`, e.message);
          }
        }

        api.sendMessage("✅ Nickname update done by ✨AVII DON", threadID);
      }

      else if (cmd === "!groupname") {
        try {
          await api.setTitle(input, threadID);
          api.sendMessage(`📝 Group name changed to: "${input}" by ✨AVII DON`, threadID);
        } catch {
          api.sendMessage("⚠️ Group name change fail 🤣", threadID);
        }
      }

      else if (cmd === "!lockgroupname") {
        if (!input) return api.sendMessage("⚠️ Name de bhai GC ke liye", threadID);
        try {
          await api.setTitle(input, threadID);
          lockedGroupNames[threadID] = input;
          api.sendMessage(`🔒 Group name locked to: "${input}" by ✨AVII DON`, threadID);
        } catch {
          api.sendMessage("❌ Locking failed.", threadID);
        }
      }

      else if (cmd === "!unlockgroupname") {
        delete lockedGroupNames[threadID];
        api.sendMessage("🔓 Group name unlocked. ✨AVII DON", threadID);
      }

      else if (cmd === "!uid") {
        api.sendMessage(`🆔 Group ID: ${threadID}`, threadID);
      }

      else if (cmd === "!exit") {
        try {
          await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        } catch {
          api.sendMessage("❌ Can't leave group.", threadID);
        }
      }

      else if (cmd === "!mkl" || cmd === "!mkl2") {
        const filename = cmd === "!mkl" ? "np.txt" : "np2.txt";
        if (!fs.existsSync(filename)) return api.sendMessage(`❌ File not found: ${filename}`, threadID);

        const name = input.trim();
        const lines = fs.readFileSync(filename, "utf8").split("\n").filter(Boolean);
        stopRequested = false;

        if (spamInterval) clearInterval(spamInterval);
        let index = 0;

        spamInterval = setInterval(() => {
          if (index >= lines.length || stopRequested) {
            clearInterval(spamInterval);
            spamInterval = null;
            return;
          }

          const msg = `✨AVII DON SAYS:\n👉 ${name} ${lines[index]}`;
          api.sendMessage(msg, threadID);
          index++;
        }, 6000); // every 6 seconds
      }

    } catch (e) {
      console.error("💥 Error in listener:", e.message);
    }
  });
});
