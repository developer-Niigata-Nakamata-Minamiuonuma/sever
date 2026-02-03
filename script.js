const output = document.getElementById("output");
const input = document.getElementById("input");
const prompt = document.getElementById("prompt");

/* ===== 仮想サーバー状態 ===== */
const server = {
  user: "user",
  cwd: "/home/user",
  ip: "192.168.1.100",
  netmask: "255.255.255.0",
  gateway: "192.168.1.1",

  fs: {
    "/": ["home", "var", "etc"],
    "/home": ["user"],
    "/home/user": ["test.txt"],
    "/var": ["www", "log"],
    "/var/www": ["html"],
    "/var/www/html": ["index.html", "image.png"],
    "/var/log": ["syslog"],
    "/etc": ["passwd", "network.conf"]
  },

  files: {
    "/etc/passwd":
`root:x:0:0:root:/root:/bin/bash
user:x:1000:1000:user:/home/user:/bin/bash`,

    "/etc/network.conf": "",
    "/var/log/syslog": ""
  }
};

/* ===== ネットワーク設定ファイル更新 ===== */
function updateNetworkConfig() {
  server.files["/etc/network.conf"] =
`DEVICE=eth0
IPADDR=${server.ip}
NETMASK=${server.netmask}
GATEWAY=${server.gateway}`;
}
updateNetworkConfig();

/* ===== ログ関連 ===== */
const fakeLogs = [
  "kernel: eth0 link up",
  "sshd: Accepted password for user",
  "cron: CMD (/usr/bin/backup)",
  "nginx: 200 GET /index.html",
  "systemd: Reloading network service"
];

let logInterval = null;
let logIndex = 0;

/* ===== 履歴 ===== */
const history = [];
let historyIndex = -1;

/* ===== ユーティリティ ===== */
function print(text = "") {
  output.textContent += text + "\n";
  output.scrollTop = output.scrollHeight;
}

function updatePrompt() {
  prompt.textContent = `${server.user}@server:${server.cwd}$`;
}

/* ===== コマンド実装 ===== */
const commands = {
  ls(args) {
    const path = args[1] || server.cwd;
    if (!server.fs[path]) return "No such directory";
    return server.fs[path].join("  ");
  },

  cd(args) {
    const target = args[0];
    if (target === "..") {
      server.cwd = server.cwd.split("/").slice(0, -1).join("/") || "/";
      return "";
    }
    const newPath = target.startsWith("/")
      ? target
      : `${server.cwd}/${target}`.replace("//", "/");

    if (!server.fs[newPath]) return "No such directory";
    server.cwd = newPath;
    return "";
  },

  pwd() {
    return server.cwd;
  },

  clear() {
    output.textContent = "";
    return "";
  },

  date() {
    return new Date().toString();
  },

  who() {
    return `${server.user} tty1`;
  },

  df() {
    return `Filesystem Type Size Used Avail Use%
/dev/sda1 ext4 40G 20G 18G 52%`;
  },

  cat(args) {
    return server.files[args[0]] || "No such file";
  },

  find(args) {
    const base = args[0];
    const ext = args[2].replace("*", "");
    const result = [];
    Object.keys(server.fs).forEach(p => {
      if (p.startsWith(base)) {
        server.fs[p].forEach(f => {
          if (f.endsWith(ext)) result.push(`${p}/${f}`);
        });
      }
    });
    return result.join("\n");
  },

  ip(args) {
    if (args[0] === "addr" && args[1] === "show") {
      return `eth0:
  inet ${server.ip}
  netmask ${server.netmask}
  gateway ${server.gateway}`;
    }
    if (args[0] === "addr" && args[1] === "set") {
      server.ip = args[2];
      updateNetworkConfig();
      print("kernel: eth0 link down");
      print("kernel: eth0 link up");
      return "IP address updated";
    }
    return "Usage: ip addr show | ip addr set [IP]";
  },

  tail(args) {
    if (args[0] === "-f" && args[1] === "/var/log/syslog") {
      if (logInterval) return "already following log";

      print("==> Following /var/log/syslog (Ctrl+C to stop)");
      logIndex = 0;
      logInterval = setInterval(() => {
        print(fakeLogs[logIndex % fakeLogs.length]);
        logIndex++;
      }, 500);
      return "";
    }
    return "Usage: tail -f /var/log/syslog";
  },

  logout() {
    location.reload();
  }
};

/* ===== 入力処理 ===== */
input.addEventListener("keydown", e => {

  /* Ctrl + C（ログ停止） */
  if (e.ctrlKey && e.key === "c") {
    if (logInterval) {
      clearInterval(logInterval);
      logInterval = null;
      print("^C");
      updatePrompt();
    }
    e.preventDefault();
    return;
  }

  /* Enter */
  if (e.key === "Enter") {
    const text = input.value.trim();
    input.value = "";

    if (text) {
      history.push(text);
      historyIndex = history.length;
    }

    print(`${prompt.textContent} ${text}`);
    if (!text) return;

    const [cmd, ...args] = text.split(" ");
    if (commands[cmd]) {
      const result = commands[cmd](args);
      if (result) print(result);
    } else {
      print("command not found");
    }

    updatePrompt();
  }

  /* ↑ 履歴 */
  if (e.key === "ArrowUp") {
    if (historyIndex > 0) {
      historyIndex--;
      input.value = history[historyIndex];
    }
  }

  /* ↓ 履歴 */
  if (e.key === "ArrowDown") {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      input.value = history[historyIndex];
    } else {
      historyIndex = history.length;
      input.value = "";
    }
  }
});

updatePrompt();
