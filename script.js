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

let boardState = startingPosition.map((row) => [...row]);
let selectedSquare = null;
let currentTurn = "white";
let capturedByWhite = [];
let capturedByBlack = [];

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
        piece.textContent = pieceChar;
        square.appendChild(piece);
      }

      square.addEventListener("click", () => handleSquareClick(row, col));
      board.appendChild(square);
    }
  }
}

function handleSquareClick(row, col) {
  const clickedPiece = boardState[row][col];
  const clickedSide = sideOf(clickedPiece);

  if (selectedSquare) {
    const from = selectedSquare;
    const fromPiece = boardState[from.row][from.col];

    if (from.row === row && from.col === col) {
      selectedSquare = null;
    } else if (clickedSide === currentTurn) {
      selectedSquare = { row, col };
    } else {
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
    }
  } else {
    if (clickedSide === currentTurn) {
      selectedSquare = { row, col };
    }
  }

  renderBoard();
  updateTurnIndicator();
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
    .map((p) => `<span class="captured-piece">${p}</span>`)
    .join("");
  blackCaptures.innerHTML = capturedByBlack
    .map((p) => `<span class="captured-piece">${p}</span>`)
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
