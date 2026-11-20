/* ============================================================
 * Billiards · game.js
 * 游戏控制器：状态机 + 输入 + 主循环。
 * 流程：menu → placing(摆放白球/手中球) → aiming → moving →
 *       resolve → (继续 / 交换 / placing) → over
 * ============================================================ */
(function (global) {
  'use strict';
  const B = global.Billiards = global.Billiards || {};
  const doc = global.document;

  const Ph = () => B.Physics;
  const Rules = () => B.Rules;

  const G = {
    phase: 'boot',     // menu|placing|aiming|moving|aiThink|aiAim|over
    balls: [],
    match: null,
    difficulty: 'normal',
    human: 0, ai: 1,
    aimAngle: 0,
    power: 0,
    dragging: false,
    pointer: null,
    ghost: null,
    shotEvents: null,
    canvas: null, ctx: null,
    breakPlace: true,  // 是否受开球线限制
  };

  /* ---------- 画布尺寸 ---------- */
  function resize() {
    const canvas = G.canvas, Phx = Ph();
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    G.ctx.setTransform(canvas.width / Phx.TABLE_W, 0, 0, canvas.height / Phx.TABLE_H, 0, 0);
    render();
  }

  function toTable(e) {
    const r = G.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * Ph().TABLE_W,
      y: (e.clientY - r.top) / r.height * Ph().TABLE_H,
    };
  }

  /* ---------- 渲染 ---------- */
  function render() {
    const aim = (G.phase === 'aiming' || G.phase === 'aiAim')
      ? { angle: G.aimAngle, power: G.power } : null;
    B.Renderer.draw(G.ctx, {
      Ph: Ph(), balls: G.balls, aim: aim,
      placing: G.phase === 'placing', pointer: G.pointer, ghost: G.ghost,
    });
  }

  /* ---------- 对局流程 ---------- */
  function startGame(difficulty) {
    G.difficulty = difficulty || 'normal';
    G.balls = Rules().rackBalls();
    G.match = Rules().createMatch({ playerName: '你', aiName: '电脑' });
    G.human = 0; G.ai = 1;
    G.match.current = 0;
    G.breakPlace = true;
    G.phase = 'placing';
    G.aimAngle = 0; G.power = 0; G.dragging = false; G.pointer = null; G.ghost = null;
    B.UI.hideEnd(); B.UI.showMenu(false);
    B.UI.setStatus('对局进行中');
    B.UI.setMessage('点击球桌摆放白球（开球线后方），然后瞄准击球');
    syncHud();
  }

  function syncHud() {
    B.UI.updateScoreboard(G.match, G.balls);
    B.UI.setPower(G.dragging ? G.power / Ph().MAX_SPEED : 0);
  }

  /* 摆球：开球限开球线后，手中球不限 */
  function placeLegal(x, y) {
    if (G.breakPlace && x > Ph().TABLE_W * 0.25 - Ph().BALL_R) return false;
    return Rules().canPlaceCue(G.balls, x, y);
  }

  function tryPlace(x, y) {
    if (!placeLegal(x, y)) { B.UI.setMessage(G.breakPlace ? '需摆放在开球线后方且不压球' : '此处不能摆放白球'); return false; }
    const cue = G.balls[0];
    cue.x = x; cue.y = y; cue.vx = cue.vy = 0; cue.active = true;
    G.breakPlace = false;
    G.match.ballInHand = false;
    G.phase = G.match.current === G.human ? 'aiming' : 'aiThink';
    B.Audio.play('place');
    B.UI.setMessage(G.match.current === G.human ? '拖动瞄准，松开出杆' : '电脑思考中…');
    G.pointer = null; G.ghost = null;
    syncHud();
    if (G.phase === 'aiThink') scheduleAI();
    return true;
  }

  /* ---------- 击球 ---------- */
  function shoot(angle, power) {
    const cue = G.balls[0];
    if (!cue.active) return;
    Ph().strike(cue, angle, power);
    G.shotEvents = Ph().newEvents();
    G.phase = 'moving';
    G.dragging = false; G.power = 0; G.ghost = null;
    B.Audio.hit(power);
    B.UI.setMessage('球进行中…');
    B.UI.setPower(0);
  }

  /* 球停后结算 */
  function settle() {
    const res = Rules().resolveShot(G.match, G.balls, G.shotEvents);
    const cue = G.balls[0];
    if (G.match.winner !== null) {
      G.phase = 'over';
      cue.active = true; // 展示用
      B.UI.setMessage(res.message);
      syncHud();
      render();
      B.Audio.play(G.match.winner === G.human ? 'win' : 'lose');
      setTimeout(() => B.UI.showEnd(G.match, G.human), 900);
      return;
    }
    if (res.turnContinues) {
      B.UI.setMessage(res.message);
      if (G.match.current === G.human) { G.phase = 'aiming'; }
      else { G.phase = 'aiThink'; }
    } else {
      // 换边：若白球落袋则进入摆球阶段
      B.UI.setMessage(res.message);
      if (!cue.active || G.match.ballInHand) {
        cue.active = true; cue.vx = cue.vy = 0;
        G.breakPlace = false;
        if (G.match.current === G.ai) { aiPlace(); }
        else G.phase = 'placing';
      } else {
        G.phase = G.match.current === G.human ? 'aiming' : 'aiThink';
      }
    }
    syncHud();
    if (G.phase === 'aiThink') scheduleAI();
  }

  /* ---------- AI ---------- */
  function scheduleAI() {
    G.phase = 'aiThink';
    B.UI.setMessage('电脑思考中…');
    const plan = B.AI.planShot(G.balls, G.match, G.ai, G.difficulty);
    G.pendingPlan = plan;
    setTimeout(() => {
      if (G.phase !== 'aiThink') return;
      G.aimAngle = plan.angle; G.power = plan.power;
      G.phase = 'aiAim';
      B.UI.setPower(plan.power / Ph().MAX_SPEED);
      render();
      setTimeout(() => {
        if (G.phase !== 'aiAim') return;
        shoot(plan.angle, plan.power);
      }, 620);
    }, plan.thinkMs);
  }

  /* AI 手中球摆球：扫描若干候选点，选进球线路最多且最优的位置 */
  function aiPlace() {
    const W = Ph().TABLE_W, H = Ph().TABLE_H, R = Ph().BALL_R;
    let best = null, bestScore = -1;
    for (let x = 90; x <= W - 90; x += 45) {
      for (let y = 70; y <= H - 70; y += 45) {
        if (!Rules().canPlaceCue(G.balls, x, y)) continue;
        G.balls[0].x = x; G.balls[0].y = y; G.balls[0].active = true;
        const cands = B.AI.analyze(G.balls, G.match, G.ai);
        const sc = cands.length ? cands[0].score + cands.length * 0.05 : -1;
        if (sc > bestScore) { bestScore = sc; best = { x, y }; }
      }
    }
    const fallback = { x: W * 0.25, y: H / 2 };
    const pos = best || fallback;
    if (!Rules().canPlaceCue(G.balls, pos.x, pos.y)) {
      // 兜底：找任意空位
      outer:
      for (let x = 60; x <= W - 60; x += 30) for (let y = 60; y <= H - 60; y += 30)
        if (Rules().canPlaceCue(G.balls, x, y)) { pos.x = x; pos.y = y; break outer; }
    }
    G.balls[0].x = pos.x; G.balls[0].y = pos.y; G.balls[0].active = true;
    G.match.ballInHand = false;
    B.UI.setMessage('电脑摆球后准备击球');
    G.phase = 'aiThink'; // 由 settle 尾部统一调度
    syncHud();
  }

  /* ---------- 输入 ---------- */
  function bindInput() {
    const cv = G.canvas;
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = toTable(e);
      G.pointer = p;
      if (G.phase === 'placing') { tryPlace(p.x, p.y); return; }
      if (G.phase !== 'aiming') return;
      if (!G.balls[0].active) return;
      G.dragging = true;
      G.aimAngle = Math.atan2(G.balls[0].y - p.y, G.balls[0].x - p.x);
      G.power = 0;
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      const p = toTable(e);
      G.pointer = p;
      if (G.phase === 'placing') { render(); return; }
      if (G.phase === 'aiming' && G.balls[0].active) {
        if (G.dragging) {
          const cue = G.balls[0];
          const d = Math.hypot(p.x - cue.x, p.y - cue.y);
          G.aimAngle = Math.atan2(cue.y - p.y, cue.x - p.x);
          G.power = Math.min(d / 150, 1) * Ph().MAX_SPEED;
          B.UI.setPower(G.power / Ph().MAX_SPEED);
          updateGhost();
        } else {
          G.aimAngle = Math.atan2(p.y - G.balls[0].y, p.x - G.balls[0].x);
          updateGhost();
        }
      }
    });
    cv.addEventListener('pointerup', e => {
      if (G.phase !== 'aiming' || !G.dragging) { G.dragging = false; return; }
      G.dragging = false;
      if (G.power >= 2.2) shoot(G.aimAngle, G.power);
      else { G.power = 0; B.UI.setPower(0); B.UI.setMessage('力度太小，再往后拉一点'); }
      G.ghost = null;
      render();
    });
    cv.addEventListener('pointercancel', () => { G.dragging = false; G.power = 0; B.UI.setPower(0); });
    cv.addEventListener('pointerleave', () => { G.pointer = null; });
  }

  /* 瞄准时的假想球提示 */
  function updateGhost() {
    G.ghost = null;
  }

  /* ---------- 主循环 ---------- */
  let last = 0;
  function loop(t) {
    const dt = Math.min((t - last) / 16.67 || 1, 2.2);
    last = t;
    if (G.phase === 'moving') {
      let steps = Math.round(dt);
      while (steps-- > 0 && G.phase === 'moving') {
        const ev = Ph().step(G.balls, G.shotEvents);
        for (const c of ev.collisions) B.Audio.play('ball');
        for (const r of ev.rails) B.Audio.play('rail');
        for (const p of ev.potted) B.Audio.play('pocket');
        if (!Ph().anyMoving(G.balls)) { settle(); break; }
      }
      syncHud();
    }
    render();
    global.requestAnimationFrame(loop);
  }

  /* ---------- 启动 ---------- */
  function boot() {
    B.UI.init();
    G.canvas = B.UI.$('game');
    G.ctx = G.canvas.getContext('2d');
    B.Audio.setEnabled(false);
    B.UI.setSoundLabel(false);
    bindInput();
    B.UI.$('btnSound').addEventListener('click', () => {
      const on = !B.Audio.isEnabled();
      B.Audio.setEnabled(on);
      B.UI.setSoundLabel(on);
      B.Audio.play('ui');
    });
    B.UI.$('btnRestart').addEventListener('click', () => { B.Audio.play('ui'); startGame(G.difficulty); });
    B.UI.$('btnMenu').addEventListener('click', () => { B.Audio.play('ui'); B.UI.showEnd(false); B.UI.showMenu(true); G.phase = 'menu'; B.UI.setStatus('就绪'); });
    doc.querySelectorAll('#menuOverlay [data-diff]').forEach(btn => {
      btn.addEventListener('click', () => { B.Audio.play('ui'); startGame(btn.getAttribute('data-diff')); });
    });
    B.UI.$('btnAgain').addEventListener('click', () => { B.Audio.play('ui'); startGame(G.difficulty); });
    B.UI.$('btnToMenu').addEventListener('click', () => { B.Audio.play('ui'); B.UI.showEnd(false); B.UI.showMenu(true); G.phase = 'menu'; B.UI.setStatus('就绪'); });
    global.addEventListener('resize', resize);
    G.phase = 'menu';
    resize();
    global.requestAnimationFrame(loop);
  }

  B.Game = {
    boot: boot, startGame: startGame, _state: G,
    _settle: settle, _tryPlace: tryPlace, _shoot: shoot, _aiPlace: aiPlace,
  };
})(typeof window !== 'undefined' ? window : globalThis);
