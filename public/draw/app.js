const socket = io();

const roomCode = window.location.pathname.split("/").filter(Boolean).pop()?.toUpperCase() || "";
const colors = [
  "#24120d",
  "#ffffff",
  "#ff4e8a",
  "#ff8fb4",
  "#ff3b30",
  "#ff7a3d",
  "#ffc83d",
  "#ffe66d",
  "#8dffba",
  "#19c37d",
  "#62c7ff",
  "#2f6bff",
  "#aa7cff",
  "#7c3aed",
  "#8b5a2b",
  "#111827"
];

const elements = {
  roomCode: document.querySelector("#roomCode"),
  phaseText: document.querySelector("#phaseText"),
  timerText: document.querySelector("#timerText"),
  roundText: document.querySelector("#roundText"),
  playersCount: document.querySelector("#playersCount"),
  playersList: document.querySelector("#playersList"),
  guessList: document.querySelector("#guessList"),
  guessForm: document.querySelector("#guessForm"),
  guessInput: document.querySelector("#guessInput"),
  wordHint: document.querySelector("#wordHint"),
  drawerBadge: document.querySelector("#drawerBadge"),
  choices: document.querySelector("#choices"),
  overlay: document.querySelector("#overlay"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayBody: document.querySelector("#overlayBody"),
  startGameBtn: document.querySelector("#startGameBtn"),
  toolbar: document.querySelector("#toolbar"),
  colors: document.querySelector("#colors"),
  brushSize: document.querySelector("#brushSize"),
  colorPicker: document.querySelector("#colorPicker"),
  brushBtn: document.querySelector("#brushBtn"),
  fillBtn: document.querySelector("#fillBtn"),
  eraserBtn: document.querySelector("#eraserBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  soundBtn: document.querySelector("#soundBtn"),
  joinGate: document.querySelector("#joinGate"),
  joinForm: document.querySelector("#joinForm"),
  playerName: document.querySelector("#playerName"),
  board: document.querySelector("#board")
};

const ctx = elements.board.getContext("2d");
let state = null;
let selectedColor = colors[0];
let selectedTool = "brush";
let drawing = false;
let lastPoint = null;
let history = [];
let soundEnabled = localStorage.getItem("brownie_draw_sound") !== "false";
let audioContext = null;
let lastTickSecond = null;
const seenGuessIds = new Set();

elements.roomCode.textContent = roomCode || "------";

setupCanvas();
renderSwatches();

elements.joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.playerName.value.trim();
  if (!name) return;
  localStorage.setItem("brownie_draw_name", name);
  socket.emit("join-room", {
    roomCode,
    name,
    avatarColor: randomAvatarColor(name)
  });
  playSound("join");
  elements.joinGate.classList.add("hidden");
});

const savedName = localStorage.getItem("brownie_draw_name");
if (savedName) elements.playerName.value = savedName;

elements.startGameBtn.addEventListener("click", () => {
  socket.emit("start-game");
});

elements.guessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.guessInput.value.trim();
  if (!text) return;
  socket.emit("guess", { text });
  elements.guessInput.value = "";
});

elements.brushBtn.addEventListener("click", () => setTool("brush"));
elements.fillBtn.addEventListener("click", () => setTool("fill"));
elements.eraserBtn.addEventListener("click", () => setTool("eraser"));
elements.colorPicker.addEventListener("input", () => {
  selectedColor = elements.colorPicker.value;
  document.querySelectorAll(".swatch").forEach((item) => item.classList.remove("active"));
  setTool("brush");
});
elements.clearBtn.addEventListener("click", () => {
  if (!canDraw()) return;
  clearCanvas();
  socket.emit("clear-canvas");
});
elements.soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("brownie_draw_sound", String(soundEnabled));
  updateSoundButton();
  playSound(soundEnabled ? "join" : "tick");
});

updateSoundButton();

socket.on("room-state", (nextState) => {
  handleStateAudio(state, nextState);
  state = nextState;
  renderState();
});

socket.on("draw-event", (event) => {
  history.push(event);
  applyDrawEvent(event);
});

socket.on("canvas-history", (events) => {
  history = Array.isArray(events) ? events : [];
  replayCanvas();
});

socket.on("canvas-clear", () => {
  history = [];
  clearCanvas();
});

socket.on("game-error", (message) => {
  elements.overlay.classList.remove("hidden");
  elements.overlayTitle.textContent = "Room issue";
  elements.overlayBody.textContent = message;
  elements.startGameBtn.classList.add("hidden");
});

setInterval(() => {
  if (!state?.deadline) {
    elements.timerText.textContent = "--";
    return;
  }
  const seconds = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
  elements.timerText.textContent = `${seconds}s`;
  if ((state.phase === "drawing" || state.phase === "choosing") && seconds > 0 && seconds <= 5 && seconds !== lastTickSecond) {
    lastTickSecond = seconds;
    playSound("tick");
  }
}, 250);

function handleStateAudio(previous, next) {
  if (!previous) {
    for (const guess of next.guesses || []) seenGuessIds.add(guess.id);
    return;
  }

  if (previous.phase !== next.phase) {
    lastTickSecond = null;
    if (next.phase === "drawing") playSound("start");
    if (next.phase === "reveal" || next.phase === "roundEnd") playSound("reveal");
    if (next.phase === "finished") playSound("win");
  }

  for (const guess of next.guesses || []) {
    if (seenGuessIds.has(guess.id)) continue;
    seenGuessIds.add(guess.id);
    if (guess.correct) playSound("correct");
    else if (guess.system && /joined/i.test(guess.text)) playSound("join");
  }
}

function renderState() {
  elements.phaseText.textContent = labelPhase(state.phase);
  elements.roundText.textContent = `${state.round}/${state.maxRounds}`;
  elements.playersCount.textContent = `${state.players.length}`;
  elements.wordHint.textContent = state.secretWord || state.wordHint || "Waiting...";
  elements.drawerBadge.textContent = state.drawerName ? `Drawing: ${state.drawerName}` : "No drawer yet";

  const isDrawer = state.me === state.drawerId;
  const isDrawing = state.phase === "drawing";
  const me = state.players.find((player) => player.id === state.me);
  elements.toolbar.classList.toggle("locked", !(isDrawer && isDrawing));
  elements.guessInput.disabled = isDrawer || !isDrawing || Boolean(me?.guessed);
  elements.guessInput.placeholder = isDrawer
    ? "You are drawing"
    : me?.guessed
      ? "You guessed it"
      : isDrawing
        ? "Type a guess"
        : "Round is paused";

  renderPlayers();
  renderGuesses();
  renderChoices();
  renderOverlay();
}

function renderPlayers() {
  elements.playersList.innerHTML = "";
  const players = [...state.players].sort((a, b) => b.score - a.score);
  for (const player of players) {
    const card = document.createElement("div");
    card.className = "player-card";

    const avatar = document.createElement("div");
    avatar.className = "avatar-dot";
    avatar.style.background = player.avatarColor;
    avatar.textContent = player.name.slice(0, 1).toUpperCase();

    const main = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = player.name;
    const meta = document.createElement("div");
    meta.className = "player-meta";
    if (player.isDrawer) meta.append(tag("Drawer"));
    if (player.guessed) meta.append(tag("Guessed"));
    main.append(name, meta);

    const score = document.createElement("strong");
    score.textContent = `${player.score}`;

    card.append(avatar, main, score);
    elements.playersList.append(card);
  }
}

function renderGuesses() {
  elements.guessList.innerHTML = "";
  for (const guess of state.guesses) {
    const row = document.createElement("div");
    row.className = `guess${guess.correct ? " correct" : ""}${guess.system ? " system" : ""}`;
    const name = document.createElement("div");
    name.className = "guess-name";
    name.textContent = guess.playerName;
    if (guess.points) {
      const score = document.createElement("span");
      score.className = "score-burst";
      score.textContent = `+${guess.points}`;
      name.append(score);
    }
    const text = document.createElement("div");
    text.className = "guess-text";
    text.textContent = guess.text;
    row.append(name, text);
    elements.guessList.append(row);
  }
  elements.guessList.scrollTop = elements.guessList.scrollHeight;
}

function renderChoices() {
  elements.choices.innerHTML = "";
  if (!Array.isArray(state.choices) || state.phase !== "choosing") return;

  for (const word of state.choices) {
    const button = document.createElement("button");
    button.className = "choice-btn";
    button.type = "button";
    button.textContent = word;
    button.addEventListener("click", () => socket.emit("choose-word", { word }));
    elements.choices.append(button);
  }
}

function renderOverlay() {
  elements.startGameBtn.classList.add("hidden");

  if (state.phase === "drawing") {
    elements.overlay.classList.add("hidden");
    return;
  }

  elements.overlay.classList.remove("hidden");

  if (state.phase === "lobby") {
    elements.overlayTitle.textContent = "Studio lobby";
    elements.overlayBody.textContent = state.players.length < 2 ? "Waiting for one more player." : "The room is ready.";
    elements.startGameBtn.classList.toggle("hidden", state.players.length < 2);
    return;
  }

  if (state.phase === "choosing") {
    elements.overlayTitle.textContent = state.choices ? "Pick a word" : "Choosing word";
    elements.overlayBody.textContent = state.choices ? "Your brush, your chaos." : `${state.drawerName || "The drawer"} is choosing.`;
    return;
  }

  if (state.phase === "roundEnd") {
    elements.overlayTitle.textContent = "Scoreboard";
    elements.overlayBody.textContent = state.wordHint ? `Word was: ${state.wordHint}. Next round soon.` : "Next round soon.";
    return;
  }

  if (state.phase === "reveal") {
    elements.overlayTitle.textContent = "Word reveal";
    elements.overlayBody.textContent = state.wordHint ? `The word was ${state.wordHint}. Count those points.` : "Round reveal.";
    return;
  }

  const winner = [...state.players].sort((a, b) => b.score - a.score)[0];
  elements.overlayTitle.textContent = "Game finished";
  elements.overlayBody.textContent = winner ? `${winner.name} wins with ${winner.score} points.` : "Match complete.";
}

function tag(text) {
  const item = document.createElement("span");
  item.className = "tag";
  item.textContent = text;
  return item;
}

function labelPhase(phase) {
  return {
    lobby: "Lobby",
    choosing: "Word pick",
    drawing: "Drawing",
    reveal: "Reveal",
    roundEnd: "Round end",
    finished: "Finished"
  }[phase] || "Live";
}

function renderSwatches() {
  for (const color of colors) {
    const button = document.createElement("button");
    button.className = `swatch${color === selectedColor ? " active" : ""}`;
    button.type = "button";
    button.style.background = color;
    button.addEventListener("click", () => {
      selectedColor = color;
      elements.colorPicker.value = color;
      document.querySelectorAll(".swatch").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      setTool("brush");
    });
    elements.colors.append(button);
  }
}

function setTool(tool) {
  selectedTool = tool;
  elements.brushBtn.classList.toggle("active", tool === "brush");
  elements.fillBtn.classList.toggle("active", tool === "fill");
  elements.eraserBtn.classList.toggle("active", tool === "eraser");
}

function canDraw() {
  return state?.phase === "drawing" && state.me === state.drawerId;
}

function setupCanvas() {
  clearCanvas();
  elements.board.addEventListener("pointerdown", (event) => {
    if (!canDraw()) return;
    const point = pointerToPoint(event);

    if (selectedTool === "fill") {
      const drawEvent = makeDrawEvent("fill", point);
      history.push(drawEvent);
      applyDrawEvent(drawEvent);
      socket.emit("draw-event", drawEvent);
      playSound("fill");
      return;
    }

    elements.board.setPointerCapture(event.pointerId);
    drawing = true;
    lastPoint = point;
    const drawEvent = makeDrawEvent("begin", lastPoint);
    history.push(drawEvent);
    applyDrawEvent(drawEvent);
    socket.emit("draw-event", drawEvent);
  });

  elements.board.addEventListener("pointermove", (event) => {
    if (!drawing || !canDraw()) return;
    const point = pointerToPoint(event);
    lastPoint = point;
    const drawEvent = makeDrawEvent("move", point);
    history.push(drawEvent);
    applyDrawEvent(drawEvent);
    socket.emit("draw-event", drawEvent);
  });

  for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
    elements.board.addEventListener(eventName, () => {
      if (!drawing) return;
      drawing = false;
      lastPoint = null;
      const drawEvent = { type: "end" };
      history.push(drawEvent);
      applyDrawEvent(drawEvent);
      socket.emit("draw-event", drawEvent);
    });
  }
}

function makeDrawEvent(type, point) {
  return {
    type,
    point,
    color: selectedColor,
    size: Number(elements.brushSize.value),
    tool: selectedTool
  };
}

function pointerToPoint(event) {
  const rect = elements.board.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1)
  };
}

function applyDrawEvent(event) {
  if (event.type === "fill") {
    if (event.point && event.color) floodFill(event.point, event.color);
    return;
  }

  if (event.type === "end") {
    ctx.closePath();
    ctx.globalCompositeOperation = "source-over";
    return;
  }

  if (!event.point) return;
  const x = event.point.x * elements.board.width;
  const y = event.point.y * elements.board.height;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = event.size || 12;
  ctx.strokeStyle = event.color || "#24120d";
  ctx.globalCompositeOperation = event.tool === "eraser" ? "destination-out" : "source-over";

  if (event.type === "begin") {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    return;
  }

  ctx.lineTo(x, y);
  ctx.stroke();
}

function replayCanvas() {
  clearCanvas();
  for (const event of history) applyDrawEvent(event);
}

function floodFill(point, color) {
  const width = elements.board.width;
  const height = elements.board.height;
  const startX = Math.floor(clamp(point.x, 0, 1) * (width - 1));
  const startY = Math.floor(clamp(point.y, 0, 1) * (height - 1));
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const startIndex = (startY * width + startX) * 4;
  const target = [
    data[startIndex],
    data[startIndex + 1],
    data[startIndex + 2],
    data[startIndex + 3]
  ];
  const fill = hexToRgba(color);

  if (colorDistance(target, fill) < 12) return;

  const stack = [[startX, startY]];
  const visited = new Uint8Array(width * height);
  const tolerance = 32;
  let filled = 0;
  const maxPixels = width * height;

  while (stack.length && filled < maxPixels) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) continue;
    visited[pixelIndex] = 1;

    const index = pixelIndex * 4;
    const current = [data[index], data[index + 1], data[index + 2], data[index + 3]];
    if (colorDistance(current, target) > tolerance) continue;

    data[index] = fill[0];
    data[index + 1] = fill[1];
    data[index + 2] = fill[2];
    data[index + 3] = fill[3];
    filled += 1;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.putImageData(image, 0, 0);
}

function clearCanvas() {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, elements.board.width, elements.board.height);
  ctx.fillStyle = "#fffaf2";
  ctx.fillRect(0, 0, elements.board.width, elements.board.height);
}

function hexToRgba(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
    255
  ];
}

function colorDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]);
}

function updateSoundButton() {
  elements.soundBtn.textContent = soundEnabled ? "Sound On" : "Sound Off";
  elements.soundBtn.classList.toggle("active", soundEnabled);
}

function playSound(kind) {
  if (!soundEnabled) return;

  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    const patterns = {
      join: [[440, 0.08], [660, 0.1]],
      start: [[392, 0.08], [523, 0.08], [784, 0.14]],
      correct: [[660, 0.07], [880, 0.07], [1175, 0.12]],
      reveal: [[330, 0.1], [262, 0.18]],
      fill: [[220, 0.05], [330, 0.06]],
      win: [[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.22]],
      tick: [[180, 0.05]]
    };

    let offset = 0;
    for (const [frequency, duration] of patterns[kind] || patterns.tick) {
      playTone(frequency, duration, offset);
      offset += duration + 0.035;
    }
  } catch {
    soundEnabled = false;
    updateSoundButton();
  }
}

function playTone(frequency, duration, offset) {
  const startAt = audioContext.currentTime + offset;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.06, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

function randomAvatarColor(name) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const palette = ["#ff8fb4", "#5ed7ff", "#ffe66d", "#9cff8f", "#c9a6ff", "#ffb86b"];
  return palette[hash % palette.length];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
