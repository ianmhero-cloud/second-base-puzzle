
// ------------------------------
// GLOBAL STATE
// ------------------------------
let currentPuzzle = null;
let ROWS = 0;
let COLS = 0;

let activeDirection = null;
let activeClueNum = null;
let checkMode = false;

const mobileClueBar = document.getElementById("mobile-clue-bar");
const puzzleContainer = document.getElementById("puzzle");

let cellToClues = {};

// ------------------------------
// LOAD PUZZLE FROM JSON FILE
// ------------------------------
function loadPuzzleFromFile(path) {
  fetch(path)
    .then(res => res.json())
    .then(data => {
      loadPuzzle(data);
    })
    .catch(err => {
      console.error("Error loading puzzle:", err);
    });
}

// ------------------------------
// CORE LOADER
// ------------------------------
function loadPuzzle(puzzleData) {
  currentPuzzle = puzzleData;
  ROWS = currentPuzzle.layout.length;
  COLS = currentPuzzle.layout[0].length;

  // Reset state
  activeDirection = null;
  activeClueNum = null;
  checkMode = false;
  cellToClues = {};
  mobileClueBar.textContent = "";
  document.getElementById("check-btn").textContent = "Check";

  // Clear UI
  puzzleContainer.innerHTML = "";
  document.getElementById("across-list").innerHTML = "";
  document.getElementById("down-list").innerHTML = "";

  buildCellToCluesMap();
  createGrid();
  addClueNumbers();
  renderClues();
  setActiveClue("across", Number(Object.keys(currentPuzzle.clues.across)[0]), true);
}

// ------------------------------
// BUILD cellToClues MAP
// ------------------------------
function buildCellToCluesMap() {
  for (const dir of ["across", "down"]) {
    const group = currentPuzzle.clueCells[dir];
    for (const num in group) {
      group[num].forEach(([r, c]) => {
        const key = `${r},${c}`;
        if (!cellToClues[key]) {
          cellToClues[key] = { across: null, down: null };
        }
        cellToClues[key][dir] = Number(num);
      });
    }
  }
}

// ------------------------------
// RENDER CLUES
// ------------------------------
function renderClues() {
  const acrossList = document.getElementById("across-list");
  const downList = document.getElementById("down-list");

  for (const num in currentPuzzle.clues.across) {
    const li = document.createElement("li");
    li.id = `across-${num}`;
    li.innerHTML = `
      <span class="clue-num">${num}.</span>
      <span class="clue-text">${currentPuzzle.clues.across[num]}</span>
    `;
    li.addEventListener("click", () => setActiveClue("across", Number(num), true));
    acrossList.appendChild(li);
  }

  for (const num in currentPuzzle.clues.down) {
    const li = document.createElement("li");
    li.id = `down-${num}`;
    li.innerHTML = `
      <span class="clue-num">${num}.</span>
      <span class="clue-text">${currentPuzzle.clues.down[num]}</span>
    `;
    li.addEventListener("click", () => setActiveClue("down", Number(num), true));
    downList.appendChild(li);
  }
}

// ------------------------------
// CREATE GRID (DYNAMIC SIZE)
// ------------------------------
function createGrid() {
  puzzleContainer.style.gridTemplateColumns = `repeat(${COLS}, 40px)`;
  puzzleContainer.style.gridTemplateRows = `repeat(${ROWS}, 40px)`;

  currentPuzzle.layout.forEach((row, r) => {
    [...row].forEach((cell, c) => {
      const div = document.createElement("div");
      div.classList.add("cell");

      if (cell === "#") {
        div.classList.add("blocked");
      } else {
        const input = document.createElement("input");

        input.type = "tel";
        input.inputMode = "numeric";
        input.pattern = "[0-9]*";
        input.maxLength = 1;

        input.addEventListener("input", (e) => {
          const v = e.target.value.replace(/[^0-9]/g, "");
          e.target.value = v.slice(-1);
          if (e.target.value !== "") moveToNextCellInActiveClue(r, c);
        });

        input.addEventListener("focus", (e) => e.target.select());

        input.addEventListener("keydown", (e) => {
          if (e.key >= "0" && e.key <= "9") {
            e.preventDefault();
            e.target.value = e.key;
            moveToNextCellInActiveClue(r, c);
            return;
          }
          if (e.key === "Backspace") {
            e.preventDefault();
            if (e.target.value === "") {
              moveToPreviousCellInActiveClue(r, c);
            } else {
              e.target.value = "";
            }
            return;
          }
          handleKeyDown(e, r, c);
        });

        div.addEventListener("click", () => handleCellClick(r, c));
        div.appendChild(input);
      }

      puzzleContainer.appendChild(div);
    });
  });
}

// ------------------------------
// ADD CLUE NUMBERS (FROM JSON)
// ------------------------------
function addClueNumbers() {
  const cells = document.querySelectorAll("#puzzle .cell");
  const numbering = currentPuzzle.numbering || {};

  Object.keys(numbering).forEach(key => {
    const [r, c] = key.split(",").map(Number);
    const index = r * COLS + c;
    const cell = cells[index];

    if (cell && !cell.classList.contains("blocked")) {
      const num = document.createElement("div");
      num.className = "clue-number";
      num.textContent = numbering[key];
      cell.appendChild(num);
    }
  });
}

// ------------------------------
// ACTIVE CLUE HANDLING
// ------------------------------
function setActiveClue(direction, num, focusFirstCell = false) {
  activeDirection = direction;
  activeClueNum = num;

  clearHighlights();
  highlightActiveClue();

  if (focusFirstCell) {
    const coords = currentPuzzle.clueCells[direction][num];
    if (coords && coords.length > 0) {
      const [r, c] = coords[0];
      focusCell(r, c);
    }
  }

  updateMobileClueBar();
}

function clearHighlights() {
  document.querySelectorAll("#puzzle .cell")
    .forEach(cell => cell.classList.remove("active-clue-cell", "active-cell"));

  document.querySelectorAll(".clue-list li")
    .forEach(li => li.classList.remove("active-clue"));
}

function highlightActiveClue() {
  if (!activeDirection || !activeClueNum) return;

  const cells = document.querySelectorAll("#puzzle .cell");
  const coords = currentPuzzle.clueCells[activeDirection][activeClueNum];

  coords.forEach(([r, c]) => {
    const index = r * COLS + c;
    cells[index]?.classList.add("active-clue-cell");
  });

  const li = document.getElementById(`${activeDirection}-${activeClueNum}`);
  li?.classList.add("active-clue");
}

function updateMobileClueBar() {
  if (!activeDirection || !activeClueNum) {
    mobileClueBar.textContent = "";
    return;
  }

  const clueText = currentPuzzle.clues[activeDirection][activeClueNum];
  const letter = activeDirection === "across" ? "A" : "D";

  mobileClueBar.textContent = `${activeClueNum}${letter}: ${clueText}`;
}

function focusCell(r, c) {
  const index = r * COLS + c;
  const cell = document.querySelectorAll("#puzzle .cell")[index];
  if (!cell || cell.classList.contains("blocked")) return;

  const input = cell.querySelector("input");
  if (input) input.focus();

  clearHighlights();
  highlightActiveClue();
  cell.classList.add("active-cell");
}

// ------------------------------
// CELL CLICK
// ------------------------------
function handleCellClick(r, c) {
  const key = `${r},${c}`;
  const info = cellToClues[key];
  if (!info) return;

  if (info.across) {
    setActiveClue("across", info.across);
  } else if (info.down) {
    setActiveClue("down", info.down);
  }

  focusCell(r, c);
}

// ------------------------------
// KEYBOARD NAVIGATION
// ------------------------------
function handleKeyDown(e, r, c) {
  const key = e.key;

  if (key === "ArrowRight") { e.preventDefault(); moveCursor(r, c, "right"); }
  else if (key === "ArrowLeft") { e.preventDefault(); moveCursor(r, c, "left"); }
  else if (key === "ArrowDown") { e.preventDefault(); moveCursor(r, c, "down"); }
  else if (key === "ArrowUp") { e.preventDefault(); moveCursor(r, c, "up"); }
  else if (key === "Enter") {
    e.preventDefault();
    toggleDirectionAtCell(r, c);
  }
}

function moveCursor(r, c, dir) {
  let nr = r, nc = c;
  if (dir === "right") nc++;
  if (dir === "left") nc--;
  if (dir === "down") nr++;
  if (dir === "up") nr--;

  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;

  const index = nr * COLS + nc;
  const cell = document.querySelectorAll("#puzzle .cell")[index];
  if (!cell || cell.classList.contains("blocked")) return;

  handleCellClick(nr, nc);
}

function toggleDirectionAtCell(r, c) {
  const key = `${r},${c}`;
  const info = cellToClues[key];
  if (!info) return;

  if (activeDirection === "across" && info.down) {
    setActiveClue("down", info.down);
  } else if (activeDirection === "down" && info.across) {
    setActiveClue("across", info.across);
  } else if (info.across) {
    setActiveClue("across", info.across);
  } else if (info.down) {
    setActiveClue("down", info.down);
  }

  focusCell(r, c);
}

function moveToNextCellInActiveClue(r, c) {
  if (!activeDirection || !activeClueNum) return;
  const coords = currentPuzzle.clueCells[activeDirection][activeClueNum];
  const idx = coords.findIndex(([rr, cc]) => rr === r && cc === c);
  if (idx >= 0 && idx < coords.length - 1) {
    const [nr, nc] = coords[idx + 1];
    focusCell(nr, nc);
  }
}

function moveToPreviousCellInActiveClue(r, c) {
  if (!activeDirection || !activeClueNum) return;
  const coords = currentPuzzle.clueCells[activeDirection][activeClueNum];
  const idx = coords.findIndex(([rr, cc]) => rr === r && cc === c);
  if (idx > 0) {
    const [nr, nc] = coords[idx - 1];
    focusCell(nr, nc);
  }
}

// ------------------------------
// VALIDATION
// ------------------------------
function checkPuzzle() {
  const cells = document.querySelectorAll("#puzzle .cell");
  cells.forEach(cell => cell.classList.remove("correct", "incorrect"));

  // Across
  for (const num in currentPuzzle.clueCells.across) {
    const coords = currentPuzzle.clueCells.across[num];
    const expected = currentPuzzle.solutions.across[num];

    coords.forEach(([r, c], i) => {
      const index = r * COLS + c;
      const cell = cells[index];
      if (!cell || cell.classList.contains("blocked")) return;

      const digit = cell.querySelector("input")?.value || "";
      if (digit === "") return;

      if (digit === expected[i]) {
        cell.classList.add("correct");
      } else {
        cell.classList.add("incorrect");
      }
    });
  }

  // Down
  for (const num in currentPuzzle.clueCells.down) {
    const coords = currentPuzzle.clueCells.down[num];
    const expected = currentPuzzle.solutions.down[num];

    coords.forEach(([r, c], i) => {
      const index = r * COLS + c;
      const cell = cells[index];
      if (!cell || cell.classList.contains("blocked")) return;

      const digit = cell.querySelector("input")?.value || "";
      if (digit === "") return;

      if (digit === expected[i]) {
        cell.classList.add("correct");
      } else {
        cell.classList.add("incorrect");
      }
    });
  }
}

function clearAllErrors() {
  document.querySelectorAll("#puzzle .cell")
    .forEach(cell => cell.classList.remove("correct", "incorrect"));
}

// ------------------------------
// CHECK / CLEAR BUTTON
// ------------------------------
document.getElementById("check-btn").addEventListener("click", () => {
  const btn = document.getElementById("check-btn");

  if (!checkMode) {
    checkPuzzle();
    btn.textContent = "Clear";
    checkMode = true;
  } else {
    clearAllErrors();
    btn.textContent = "Check";
    checkMode = false;
  }
});

// ------------------------------
// INITIALISE v2
// ------------------------------
loadPuzzleFromFile("./puzzles/puzzle-001.json");

