import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// ─── Static files ───────────────────────────────────────────
app.use('/static/*', serveStatic({ root: './public' }))

// ─── API: 빙고 보드 조회 ────────────────────────────────────
app.get('/api/bingo/:teamId', async (c) => {
  const teamId = parseInt(c.req.param('teamId'))
  if (isNaN(teamId) || teamId < 1 || teamId > 5) {
    return c.json({ error: 'Invalid team ID' }, 400)
  }

  try {
    const board = await c.env.DB.prepare(
      'SELECT * FROM bingo_boards WHERE team_id = ?'
    ).bind(teamId).first()

    if (!board) {
      return c.json({ teamId, cells: [] })
    }

    const cells = await c.env.DB.prepare(
      'SELECT cell_id, mission, photo FROM bingo_cells WHERE board_id = ? ORDER BY cell_id'
    ).bind(board.id).all()

    return c.json({ teamId, boardId: board.id, cells: cells.results })
  } catch (error) {
    console.error('Failed to get board:', error)
    return c.json({ error: 'Failed to fetch bingo board' }, 500)
  }
})

// ─── API: 모든 보드 조회 ────────────────────────────────────
app.get('/api/bingo', async (c) => {
  try {
    const boards = await c.env.DB.prepare(
      'SELECT * FROM bingo_boards ORDER BY team_id'
    ).all()

    const result = []
    for (const board of boards.results) {
      const cells = await c.env.DB.prepare(
        'SELECT cell_id, mission, photo FROM bingo_cells WHERE board_id = ? ORDER BY cell_id'
      ).bind(board.id).all()
      result.push({ ...board, cells: cells.results })
    }

    return c.json(result)
  } catch (error) {
    console.error('Failed to get all boards:', error)
    return c.json({ error: 'Failed to fetch boards' }, 500)
  }
})

// ─── API: 빙고 보드 저장/업데이트 ─────────────────────────
app.post('/api/bingo/:teamId', async (c) => {
  const teamId = parseInt(c.req.param('teamId'))
  if (isNaN(teamId) || teamId < 1 || teamId > 5) {
    return c.json({ error: 'Invalid team ID' }, 400)
  }

  const body = await c.req.json()
  const { teamName, cells } = body

  if (!Array.isArray(cells) || cells.length !== 25) {
    return c.json({ error: 'Invalid cells data: must have exactly 25 cells' }, 400)
  }

  try {
    // upsert board
    await c.env.DB.prepare(`
      INSERT INTO bingo_boards (team_id, team_name, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(team_id) DO UPDATE SET
        team_name = excluded.team_name,
        updated_at = CURRENT_TIMESTAMP
    `).bind(teamId, teamName || `${teamId}조`).run()

    const board = await c.env.DB.prepare(
      'SELECT id FROM bingo_boards WHERE team_id = ?'
    ).bind(teamId).first<{ id: number }>()

    if (!board) {
      return c.json({ error: 'Board creation failed' }, 500)
    }

    // upsert cells
    const stmts = cells.map((cell: { id: number; mission: string; photo: string | null }) =>
      c.env.DB.prepare(`
        INSERT INTO bingo_cells (board_id, cell_id, mission, photo)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(board_id, cell_id) DO UPDATE SET
          mission = excluded.mission,
          photo = excluded.photo
      `).bind(board.id, cell.id, cell.mission, cell.photo ?? null)
    )

    await c.env.DB.batch(stmts)

    return c.json({ success: true, teamId, boardId: board.id })
  } catch (error) {
    console.error('Failed to update board:', error)
    return c.json({ error: 'Failed to update bingo board' }, 500)
  }
})

// ─── SPA fallback ────────────────────────────────────────────
app.get('*', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>쎄선쎄후 빙고</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="/static/style.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/static/app.js"></script>
</body>
</html>`)
})

export default app
