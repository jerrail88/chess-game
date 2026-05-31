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

  if (movingSide === "black") {
    spawnSmokeTrail(movingPiece);
    if (capturedPiece) {
      setTimeout(() => spawnSmokeExplosion(toSquare), ANIM_DURATION_MS * 0.6);
    }
  } else if (movingSide === "white") {
    const theme = getCurrentTheme();
    if (theme === "glass") {
      spawnWindTrail(movingPiece);
      if (capturedPiece) {
        setTimeout(() => spawnWindExplosion(toSquare), ANIM_DURATION_MS * 0.6);
      }
    }
  }

  setTimeout(onComplete, ANIM_DURATION_MS);
}

function getCurrentTheme() {
  const cls = document.body.className;
  if (cls.startsWith("theme-")) return cls.replace("theme-", "");
  return "glass";
}

function spawnSmokeTrail(pieceEl) {
  const puffCount = 6;
  const interval = ANIM_DURATION_MS / puffCount;
  for (let i = 0; i < puffCount; i++) {
    setTimeout(() => {
      const rect = pieceEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const puff = document.createElement("div");
      puff.className = "smoke-puff";
      puff.style.left = rect.left + rect.width / 2 + "px";
      puff.style.top = rect.top + rect.height / 2 + "px";
      document.body.appendChild(puff);
      setTimeout(() => puff.remove(), 1200);
    }, i * interval);
  }
}

function spawnSmokeExplosion(squareEl) {
  const rect = squareEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const puffCount = 10;
  for (let i = 0; i < puffCount; i++) {
    const angle = (i / puffCount) * Math.PI * 2 + Math.random() * 0.3;
    const distance = 30 + Math.random() * 30;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const puff = document.createElement("div");
    puff.className = "smoke-burst";
    puff.style.left = cx + "px";
    puff.style.top = cy + "px";
    puff.style.setProperty("--dx", dx + "px");
    puff.style.setProperty("--dy", dy + "px");
    document.body.appendChild(puff);
    setTimeout(() => puff.remove(), 1100);
  }
}

function spawnWindTrail(pieceEl) {
  const wispCount = 6;
  const interval = ANIM_DURATION_MS / wispCount;
  for (let i = 0; i < wispCount; i++) {
    setTimeout(() => {
      const rect = pieceEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const wisp = document.createElement("div");
      wisp.className = "wind-wisp";
      const angle = Math.random() * 360;
      const driftAngle = Math.random() * Math.PI * 2;
      const driftDist = 25 + Math.random() * 25;
      const driftX = Math.cos(driftAngle) * driftDist;
      const driftY = Math.sin(driftAngle) * driftDist - 10;
      wisp.style.left = rect.left + rect.width / 2 + "px";
      wisp.style.top = rect.top + rect.height / 2 + "px";
      wisp.style.setProperty("--angle", angle + "deg");
      wisp.style.setProperty("--drift-x", driftX + "px");
      wisp.style.setProperty("--drift-y", driftY + "px");
      document.body.appendChild(wisp);
      setTimeout(() => wisp.remove(), 1100);
    }, i * interval);
  }
}

function spawnWindExplosion(squareEl) {
  const rect = squareEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const wispCount = 12;
  for (let i = 0; i < wispCount; i++) {
    const angle = (i / wispCount) * 360;
    const radius = 35 + Math.random() * 25;
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
    document.body.appendChild(wisp);
    setTimeout(() => wisp.remove(), 1300);
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
      renderBoard();
      return;
    }

    if (clickedSide === currentTurn) {
      selectedSquare = { row, col };
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
      currentTurn = currentTurn === "white" ? "black" : "white";

      updateScoreboard();
      renderBoard();
      updateTurnIndicator();
      isAnimating = false;
    });
  } else {
    if (clickedSide === currentTurn) {
      selectedSquare = { row, col };
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
