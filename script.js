const output = document.getElementById("output");
const input = document.getElementById("input");
const prompt = document.getElementById("prompt");

/* ===== 仮想サーバー状態 ===== */
const server = {
  user: "user",
  cwd: "/home/user",
  ip: "192.168.1.100",
  fs: {
    "/": ["home", "var", "etc"],
    "/home": ["user"],
    "/home/user": ["test.txt"],
    "/var": ["www"],
    "/var/www": ["html"],
    "/var/www/html": ["index.html", "image.png"],
    "/etc": ["passwd"]
  },
  files: {
    "/etc/passwd":
`root:x:0:0:root:/root:/bin/bash
user:x:1000:1000:user:/home/user:/bin/bash`
  }
};

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
    const path = args[0];
    return server.files[path] || "No such file";
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
  inet ${server.ip}`;
    }
    if (args[0] === "addr" && args[1] === "set") {
      server.ip = args[2];
      return "IP address updated";
    }
    return "Usage: ip addr show | ip addr set [IP]";
  },

  logout() {
    location.reload();
  }
};

/* ===== 入力処理 ===== */
input.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;

  const text = input.value.trim();
  input.value = "";
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
});

updatePrompt();
