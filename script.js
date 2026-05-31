const board = document.getElementById("board");

for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    const square = document.createElement("div");
    square.classList.add("square");
    const isLight = (row + col) % 2 === 0;
    square.classList.add(isLight ? "light" : "dark");
    board.appendChild(square);
  }
}

const themeButtons = document.querySelectorAll(".theme-btn");
themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    themeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const theme = btn.dataset.theme;
    console.log("Selected theme:", theme);
  });
});
