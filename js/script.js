let pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  let channel;

  const chat = document.getElementById("chat");
  const notification = document.getElementById("notification");

  function log(msg, sender = "me") {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.textContent = (sender === "me" ? "You: " : "Peer: ") + msg;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function logFile(name, url, sender) {
    const div = document.createElement("div");
    div.className = "msg " + sender;
    div.innerHTML =
      (sender === "me" ? "You: " : "Peer: ") +
      `<a href="${url}" download="${name}">📎 ${name}</a>`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) return;
    document.getElementById("offer").value = JSON.stringify(
      pc.localDescription
    );
  };

  pc.ondatachannel = (event) => {
    channel = event.channel;
    setupChannel();
  };

  function createOffer() {
    channel = pc.createDataChannel("chat");
    setupChannel();
    pc.createOffer().then((d) => pc.setLocalDescription(d));
  }

  function setupChannel() {
    channel.onmessage = (e) => {
      const data = e.data;
      if (typeof data === "string" && data.startsWith("file::")) {
        const [_, name, base64] = data.split("::");
        const blob = base64ToBlob(base64);
        const url = URL.createObjectURL(blob);
        logFile(name, url, "peer");
      } else {
        log(data, "peer");
      }
    };
    channel.onopen = () => showConnectionNotification();
  }

  function createAnswer() {
    const offer = JSON.parse(document.getElementById("offer").value);
    pc.setRemoteDescription(new RTCSessionDescription(offer)).then(() => {
      pc.createAnswer().then((answer) => {
        pc.setLocalDescription(answer);
        document.getElementById("answer").value = JSON.stringify(answer);
      });
    });
  }

  function addAnswer() {
    const answer = JSON.parse(document.getElementById("answer").value);
    pc.setRemoteDescription(new RTCSessionDescription(answer)).then(() => {
      alert("Connection established! You can now chat.");
      showConnectionNotification();
    });
  }

  function sendMessage() {
    const input = document.getElementById("message");
    const msg = input.value.trim();
    if (!msg) return;
    channel.send(msg);
    log(msg, "me");
    input.value = "";
  }

  function sendFile() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      channel.send(`file::${file.name}::${base64}`);
      logFile(file.name, reader.result, "me");
    };
    reader.readAsDataURL(file);
  }

  function base64ToBlob(base64) {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array]);
  }

  function showConnectionNotification() {
    notification.style.display = "block";
  }