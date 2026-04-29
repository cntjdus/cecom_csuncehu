-- 빙고 보드 테이블
CREATE TABLE IF NOT EXISTS bingo_boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 빙고 셀 데이터 테이블
CREATE TABLE IF NOT EXISTS bingo_cells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  cell_id INTEGER NOT NULL,
  mission TEXT NOT NULL,
  photo TEXT,
  FOREIGN KEY (board_id) REFERENCES bingo_boards(id) ON DELETE CASCADE,
  UNIQUE(board_id, cell_id)
);

CREATE INDEX IF NOT EXISTS idx_bingo_cells_board_id ON bingo_cells(board_id);
CREATE INDEX IF NOT EXISTS idx_bingo_boards_team_id ON bingo_boards(team_id);
