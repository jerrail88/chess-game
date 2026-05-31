const startingPosition = [
  ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
  ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
  ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
];

const PIECE_VALUES = {
  "♙": 1, "♟": 1,
  "♘": 3, "♞": 3,
  "♗": 3, "♝": 3,
  "♖": 5, "♜": 5,
  "♕": 9, "♛": 9,
  "♔": 0, "♚": 0,
};

const PIECE_INTENSITY = {
  "♙": 1.0, "♟": 1.0,
  "♘": 1.3, "♞": 1.3,
  "♗": 1.3, "♝": 1.3,
  "♖": 1.6, "♜": 1.6,
  "♕": 2.0, "♛": 2.0,
  "♔": 1.5, "♚": 1.5,
};

const DIAGONAL_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const STRAIGHT_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const ALL_DIRS = [...DIAGONAL_DIRS, ...STRAIGHT_DIRS];
const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

const WHITE_PIECES = new Set(["♔", "♕", "♖", "♗", "♘", "♙"]);

// Both sides rendered with the SOLID silhouette shape so they look identical
// in form; CSS colors them by side. Game state still uses ♔ vs ♚ to know which
// piece belongs to which side.
const PIECE_SHAPES = {
  "♔": "♚", "♕": "♛", "♖": "♜", "♗": "♝", "♘": "♞", "♙": "♟",
  "♚": "♚", "♛": "♛", "♜": "♜", "♝": "♝", "♞": "♞", "♟": "♟",
};

let boardState = startingPosition.map((row) => [...row]);
let selectedSquare = null;
let legalMoves = [];
let currentTurn = "white";
let capturedByWhite = [];
let capturedByBlack = [];
let isAnimating = false;

const ANIM_DURATION_MS = 400;
const SQUARE_SIZE_PX = 60;

const board = document.getElementById("board");
const turnIndicator = document.getElementById("turn-indicator");
const whiteCaptures = document.getElementById("white-captures");
const blackCaptures = document.getElementById("black-captures");
const whiteScore = document.getElementById("white-score");
const blackScore = document.getElementById("black-score");

function isWhite(piece) {
  return WHITE_PIECES.has(piece);
}

function sideOf(piece) {
  if (!piece) return null;
  return isWhite(piece) ? "white" : "black";
}

function renderBoard() {
  board.innerHTML = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.classList.add("square");
      const isLight = (row + col) % 2 === 0;
      square.classList.add(isLight ? "light" : "dark");

      if (
        selectedSquare &&
        selectedSquare.row === row &&
        selectedSquare.col === col
      ) {
        square.classList.add("selected");
      }

      if (legalMoves.some((m) => m.row === row && m.col === col)) {
        const isCapture = !!boardState[row][col];
        square.classList.add(isCapture ? "legal-capture" : "legal-move");
      }

      const pieceChar = boardState[row][col];
      if (pieceChar) {
        const piece = document.createElement("span");
        piece.classList.add("piece");
        piece.classList.add(isWhite(pieceChar) ? "white" : "black");
        piece.textContent = PIECE_SHAPES[pieceChar];
        square.appendChild(piece);
      }

      square.addEventListener("click", () => handleSquareClick(row, col));
      board.appendChild(square);
    }
  }
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getLegalMoves(row, col) {
  const piece = boardState[row][col];
  if (!piece) return [];
  const side = sideOf(piece);
  const moves = [];

  if (piece === "♙" || piece === "♟") {
    addPawnMoves(moves, row, col, side);
  } else if (piece === "♘" || piece === "♞") {
    addKnightMoves(moves, row, col, side);
  } else if (piece === "♗" || piece === "♝") {
    addSlidingMoves(moves, row, col, side, DIAGONAL_DIRS);
  } else if (piece === "♖" || piece === "♜") {
    addSlidingMoves(moves, row, col, side, STRAIGHT_DIRS);
  } else if (piece === "♕" || piece === "♛") {
    addSlidingMoves(moves, row, col, side, ALL_DIRS);
  } else if (piece === "♔" || piece === "♚") {
    addKingMoves(moves, row, col, side);
  }

  return moves;
}

function addPawnMoves(moves, row, col, side) {
  const dir = side === "white" ? -1 : 1;
  const startRow = side === "white" ? 6 : 1;
  const r1 = row + dir;

  if (inBounds(r1, col) && !boardState[r1][col]) {
    moves.push({ row: r1, col });
    if (row === startRow) {
      const r2 = row + 2 * dir;
      if (inBounds(r2, col) && !boardState[r2][col]) {
        moves.push({ row: r2, col });
      }
    }
  }

  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (
      inBounds(r1, c) &&
      boardState[r1][c] &&
      sideOf(boardState[r1][c]) !== side
    ) {
      moves.push({ row: r1, col: c });
    }
  }
}

function addKnightMoves(moves, row, col, side) {
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && sideOf(boardState[r][c]) !== side) {
      moves.push({ row: r, col: c });
    }
  }
}

function addSlidingMoves(moves, row, col, side, dirs) {
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const target = boardState[r][c];
      if (!target) {
        moves.push({ row: r, col: c });
      } else {
        if (sideOf(target) !== side) {
          moves.push({ row: r, col: c });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function addKingMoves(moves, row, col, side) {
  for (const [dr, dc] of ALL_DIRS) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c) && sideOf(boardState[r][c]) !== side) {
      moves.push({ row: r, col: c });
    }
  }
}

function getSquareElement(row, col) {
  return board.children[row * 8 + col];
}

function animateMove(from, to, onComplete) {
  const fromSquare = getSquareElement(from.row, from.col);
  const toSquare = getSquareElement(to.row, to.col);
  const movingPiece = fromSquare.querySelector(".piece");
  const capturedPiece = toSquare.querySelector(".piece");

  if (!movingPiece) {
    onComplete();
    return;
  }

  const movingSide = sideOf(boardState[from.row][from.col]);
  const dx = (to.col - from.col) * SQUARE_SIZE_PX;
  const dy = (to.row - from.row) * SQUARE_SIZE_PX;

  movingPiece.style.transition = `transform ${ANIM_DURATION_MS}ms ease`;
  movingPiece.style.zIndex = "10";
  requestAnimationFrame(() => {
    movingPiece.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  if (capturedPiece) {
    capturedPiece.classList.add("fading-out");
  }

  const intensity = PIECE_INTENSITY[boardState[from.row][from.col]] || 1.0;

  if (movingSide === "black") {
    spawnSmokeTrail(movingPiece, intensity);
    if (capturedPiece) {
      setTimeout(() => spawnSmokeExplosion(toSquare, intensity), ANIM_DURATION_MS * 0.6);
    }
  } else if (movingSide === "white") {
    const effect = WHITE_THEME_EFFECTS[getCurrentTheme()];
    if (effect) {
      effect.trail(movingPiece, intensity);
      if (capturedPiece) {
        setTimeout(() => effect.burst(toSquare, intensity), ANIM_DURATION_MS * 0.6);
      }
    }
  }

  setTimeout(onComplete, ANIM_DURATION_MS);
}

function scaled(base, intensity) {
  return Math.round(base * intensity);
}

const WHITE_THEME_EFFECTS = {
  glass: { trail: spawnWindTrail, burst: spawnWindExplosion },
  fire: { trail: spawnFireTrail, burst: spawnFireExplosion },
  ice: { trail: spawnIceTrail, burst: spawnIceExplosion },
  thunder: { trail: spawnThunderTrail, burst: spawnThunderExplosion },
  earth: { trail: spawnEarthTrail, burst: spawnEarthExplosion },
};

function getCurrentTheme() {
  const cls = document.body.className;
  if (cls.startsWith("theme-")) return cls.replace("theme-", "");
  return "glass";
}

function spawnSmokeTrail(pieceEl, intensity = 1) {
  const puffCount = scaled(8, intensity);
  const interval = ANIM_DURATION_MS / puffCount;
  for (let i = 0; i < puffCount; i++) {
    setTimeout(() => {
      const rect = pieceEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const puff = document.createElement("div");
      puff.className = "smoke-puff";
      puff.style.left = rect.left + rect.width / 2 + "px";
      puff.style.top = rect.top + rect.height / 2 + "px";
      puff.style.setProperty("--scale", intensity);
      document.body.appendChild(puff);
      setTimeout(() => puff.remove(), 1200);
    }, i * interval);
  }
}

function spawnSmokeExplosion(squareEl, intensity = 1) {
  const rect = squareEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const puffCount = scaled(14, intensity);
  const distScale = 1 + (intensity - 1) * 0.6;
  for (let i = 0; i < puffCount; i++) {
    const angle = (i / puffCount) * Math.PI * 2 + Math.random() * 0.3;
    const distance = (30 + Math.random() * 35) * distScale;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const puff = document.createElement("div");
    puff.className = "smoke-burst";
    puff.style.left = cx + "px";
    puff.style.top = cy + "px";
    puff.style.setProperty("--dx", dx + "px");
    puff.style.setProperty("--dy", dy + "px");
    puff.style.setProperty("--scale", intensity);
    document.body.appendChild(puff);
    setTimeout(() => puff.remove(), 1100);
  }
}

function spawnWindTrail(pieceEl, intensity = 1) {
  const wispCount = scaled(8, intensity);
  const interval = ANIM_DURATION_MS / wispCount;
  for (let i = 0; i < wispCount; i++) {
    setTimeout(() => {
      const rect = pieceEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const wisp = document.createElement("div");
      wisp.className = "wind-wisp";
      const angle = Math.random() * 360;
      const driftAngle = Math.random() * Math.PI * 2;
      const driftDist = (25 + Math.random() * 25) * intensity;
      const driftX = Math.cos(driftAngle) * driftDist;
      const driftY = Math.sin(driftAngle) * driftDist - 10;
      wisp.style.left = rect.left + rect.width / 2 + "px";
      wisp.style.top = rect.top + rect.height / 2 + "px";
      wisp.style.setProperty("--angle", angle + "deg");
      wisp.style.setProperty("--drift-x", driftX + "px");
      wisp.style.setProperty("--drift-y", driftY + "px");
      wisp.style.setProperty("--scale", intensity);
      document.body.appendChild(wisp);
      setTimeout(() => wisp.remove(), 1100);
    }, i * interval);
  }
}

function spawnWindExplosion(squareEl, intensity = 1) {
  const rect = squareEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const wispCount = scaled(16, intensity);
  const distScale = 1 + (intensity - 1) * 0.6;
  for (let i = 0; i < wispCount; i++) {
    const angle = (i / wispCount) * 360;
    const radius = (35 + Math.random() * 25) * distScale;
    const angleRad = (angle * Math.PI) / 180;
    const dx = Math.cos(angleRad) * radius;
    const dy = Math.sin(angleRad) * radius;
    const wisp = document.createElement("div");
    wisp.className = "wind-burst";
    wisp.style.left = cx + "px";
    wisp.style.top = cy + "px";
    wisp.style.setProperty("--angle", angle + "deg");
    wisp.style.setProperty("--dx", dx + "px");
    wisp.style.setProperty("--dy", dy + "px");
    wisp.style.setProperty("--scale", intensity);
    document.body.appendChild(wisp);
    setTimeout(() => wisp.remove(), 1300);
  }
}

function spawnFireTrail(pieceEl, intensity = 1) {
  const count = scaled(11, intensity);
  const interval = ANIM_DURATION_MS / count;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const rect = pieceEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const flame = document.createElement("div");
      flame.className = "fire-flame";
      const driftX = (Math.random() - 0.5) * 30;
      flame.style.left = rect.left + rect.width / 2 + "px";
      flame.style.top = rect.top + rect.height / 2 + "px";
      flame.style.setProperty("--drift-x", driftX + "px");
      flame.style.setProperty("--scale", intensity);
      document.body.appendChild(flame);
      setTimeout(() => flame.remove(), 1000);
    }, i * interval);
  }
}

function spawnFireExplosion(squareEl, intensity = 1) {
  const rect = squareEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = scaled(18, intensity);
  const distScale = 1 + (intensity - 1) * 0.6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = (30 + Math.random() * 35) * distScale;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const ember = document.createElement("div");
    ember.className = "fire-burst";
    ember.style.left = cx + "px";
    ember.style.top = cy + "px";
    ember.style.setProperty("--dx", dx + "px");
    ember.style.setProperty("--dy", dy + "px");
    ember.style.setProperty("--scale", intensity);
    document.body.appendChild(ember);
    setTimeout(() => ember.remove(), 1100);
  }
}

function spawnIceTrail(pieceEl, intensity = 1) {
  const count = scaled(7, intensity);
  const interval = ANIM_DURATION_MS / count;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const rect = pieceEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const shard = document.createElement("div");
      shard.className = "ice-shard";
      const angle = Math.random() * 360;
      const driftAngle = Math.random() * Math.PI * 2;
      const driftDist = (15 + Math.random() * 15) * intensity;
      shard.style.left = rect.left + rect.width / 2 + "px";
      shard.style.top = rect.top + rect.height / 2 + "px";
      shard.style.setProperty("--angle", angle + "deg");
      shard.style.setProperty("--drift-x", Math.cos(driftAngle) * driftDist + "px");
      shard.style.setProperty("--drift-y", Math.sin(driftAngle) * driftDist + "px");
      shard.style.setProperty("--scale", intensity);
      document.body.appendChild(shard);
      setTimeout(() => shard.remove(), 1100);
    }, i * interval);
  }
}

function spawnIceExplosion(squareEl, intensity = 1) {
  const rect = squareEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = scaled(14, intensity);
  const distScale = 1 + (intensity - 1) * 0.6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360;
    const radius = (35 + Math.random() * 20) * distScale;
    const angleRad = (angle * Math.PI) / 180;
    const dx = Math.cos(angleRad) * radius;
    const dy = Math.sin(angleRad) * radius;
    const spike = document.createElement("div");
    spike.className = "ice-spike-burst";
    spike.style.left = cx + "px";
    spike.style.top = cy + "px";
    spike.style.setProperty("--angle", angle + 90 + "deg");
    spike.style.setProperty("--dx", dx + "px");
    spike.style.setProperty("--dy", dy + "px");
    spike.style.setProperty("--scale", intensity);
    document.body.appendChild(spike);
    setTimeout(() => spike.remove(), 1200);
  }
}

function spawnThunderTrail(pieceEl, intensity = 1) {
  const count = scaled(7, intensity);
  const interval = ANIM_DURATION_MS / count;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const rect = pieceEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const bolt = document.createElement("div");
      bolt.className = "thunder-bolt";
      const angle = -30 + Math.random() * 60;
      bolt.style.left = rect.left + rect.width / 2 + "px";
      bolt.style.top = rect.top + rect.height / 2 + "px";
      bolt.style.setProperty("--angle", angle + "deg");
      bolt.style.setProperty("--scale", intensity);
      document.body.appendChild(bolt);
      setTimeout(() => bolt.remove(), 800);
    }, i * interval);
  }
}

function spawnThunderExplosion(squareEl, intensity = 1) {
  const rect = squareEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = scaled(12, intensity);
  const radiusBase = 25 + (intensity - 1) * 18;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360;
    const angleRad = (angle * Math.PI) / 180;
    const dx = Math.cos(angleRad) * radiusBase;
    const dy = Math.sin(angleRad) * radiusBase;
    const strike = document.createElement("div");
    strike.className = "thunder-strike";
    strike.style.left = cx + "px";
    strike.style.top = cy + "px";
    strike.style.setProperty("--angle", angle + "deg");
    strike.style.setProperty("--dx", dx + "px");
    strike.style.setProperty("--dy", dy + "px");
    strike.style.setProperty("--scale", intensity);
    document.body.appendChild(strike);
    setTimeout(() => strike.remove(), 900);
  }
}

function spawnEarthTrail(pieceEl, intensity = 1) {
  const count = scaled(9, intensity);
  const interval = ANIM_DURATION_MS / count;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const rect = pieceEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const vine = document.createElement("div");
      vine.className = "earth-vine";
      const angle = -20 + Math.random() * 40;
      const offsetX = (Math.random() - 0.5) * 20;
      vine.style.left = rect.left + rect.width / 2 + offsetX + "px";
      vine.style.top = rect.top + rect.height / 2 + "px";
      vine.style.setProperty("--angle", angle + "deg");
      vine.style.setProperty("--scale", intensity);
      document.body.appendChild(vine);
      setTimeout(() => vine.remove(), 1100);
    }, i * interval);
  }
}

function spawnEarthExplosion(squareEl, intensity = 1) {
  const rect = squareEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = scaled(16, intensity);
  const distScale = 1 + (intensity - 1) * 0.6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const distance = (35 + Math.random() * 30) * distScale;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const leaf = document.createElement("div");
    leaf.className = "earth-leaf";
    leaf.style.left = cx + "px";
    leaf.style.top = cy + "px";
    leaf.style.setProperty("--dx", dx + "px");
    leaf.style.setProperty("--dy", dy + "px");
    leaf.style.setProperty("--scale", intensity);
    document.body.appendChild(leaf);
    setTimeout(() => leaf.remove(), 1300);
  }
}

function handleSquareClick(row, col) {
  if (isAnimating) return;

  const clickedPiece = boardState[row][col];
  const clickedSide = sideOf(clickedPiece);

  if (selectedSquare) {
    const from = selectedSquare;
    const fromPiece = boardState[from.row][from.col];

    if (from.row === row && from.col === col) {
      selectedSquare = null;
      legalMoves = [];
      renderBoard();
      return;
    }

    if (clickedSide === currentTurn) {
      selectedSquare = { row, col };
      legalMoves = getLegalMoves(row, col);
      renderBoard();
      return;
    }

    const isLegal = legalMoves.some((m) => m.row === row && m.col === col);
    if (!isLegal) {
      selectedSquare = null;
      legalMoves = [];
      renderBoard();
      return;
    }

    isAnimating = true;
    animateMove(from, { row, col }, () => {
      if (clickedPiece) {
        if (currentTurn === "white") {
          capturedByWhite.push(clickedPiece);
        } else {
          capturedByBlack.push(clickedPiece);
        }
      }
      boardState[row][col] = fromPiece;
      boardState[from.row][from.col] = "";
      selectedSquare = null;
      legalMoves = [];
      currentTurn = currentTurn === "white" ? "black" : "white";

      updateScoreboard();
      renderBoard();
      updateTurnIndicator();
      isAnimating = false;
    });
  } else {
    if (clickedSide === currentTurn) {
      selectedSquare = { row, col };
      legalMoves = getLegalMoves(row, col);
      renderBoard();
    }
  }
}

function updateTurnIndicator() {
  const label = currentTurn === "white" ? "White" : "Black";
  turnIndicator.textContent = label + "'s turn";
  turnIndicator.className = "turn-" + currentTurn;
}

function calculateScore(pieces) {
  return pieces.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);
}

function updateScoreboard() {
  whiteCaptures.innerHTML = capturedByWhite
    .map((p) => `<span class="captured-piece ${sideOf(p)}">${PIECE_SHAPES[p]}</span>`)
    .join("");
  blackCaptures.innerHTML = capturedByBlack
    .map((p) => `<span class="captured-piece ${sideOf(p)}">${PIECE_SHAPES[p]}</span>`)
    .join("");
  whiteScore.textContent = calculateScore(capturedByWhite);
  blackScore.textContent = calculateScore(capturedByBlack);
}

renderBoard();
updateTurnIndicator();
updateScoreboard();

const themeButtons = document.querySelectorAll(".theme-btn");
themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    themeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const theme = btn.dataset.theme;
    document.body.className = "theme-" + theme;
  });
});
