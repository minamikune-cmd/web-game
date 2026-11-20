/* ============================================================
 * Billiards · physics.js
 * 物理系统：球桌几何、球体运动、碰撞、库边反弹、落袋判定。
 * 与 DOM 完全解耦，可在 Node 中直接运行以便自动化测试。
 * ============================================================ */
(function (global) {
  'use strict';
  const B = global.Billiards = global.Billiards || {};

  /* ---- 常量 ---- */
  const TABLE_W = 1000;          // 球桌逻辑宽度
  const TABLE_H = 500;           // 球桌逻辑高度
  const BALL_R = 12;             // 球半径
  const POCKET_R = 27;           // 角袋捕获半径
  const MID_POCKET_R = 24;       // 中袋捕获半径
  const FRICTION = 0.988;        // 每步滚动摩擦（速度保持率）
  const STOP_EPS = 0.045;        // 低于此速度视为静止
  const WALL_RESTITUTION = 0.82; // 库边恢复系数
  const BALL_RESTITUTION = 0.96; // 球碰撞恢复系数
  const MAX_SPEED = 26;          // 击球速度上限

  /* 袋口位置：mid 为中袋 */
  const POCKETS = [
    { x: 0, y: 0, mid: false },
    { x: TABLE_W / 2, y: 0, mid: true },
    { x: TABLE_W, y: 0, mid: false },
    { x: 0, y: TABLE_H, mid: false },
    { x: TABLE_W / 2, y: TABLE_H, mid: true },
    { x: TABLE_W, y: TABLE_H, mid: false },
  ];

  function pocketRadius(p) { return p.mid ? MID_POCKET_R : POCKET_R; }

  /* 袋口缓冲带：球进入该区域时不做库边反弹（模拟真实袋口的缺口），
   * 仅阻尼减速，由落袋判定捕获；未进袋的球停在袋口角上。 */
  const MOUTH_EXTRA = 30;
  function nearMouth(x, y) {
    for (const p of POCKETS) {
      const r = pocketRadius(p) + MOUTH_EXTRA;
      if (Math.hypot(x - p.x, y - p.y) < r) return true;
    }
    return false;
  }

  function makeBall(id, x, y) {
    return { id: id, x: x, y: y, vx: 0, vy: 0, r: BALL_R, active: true };
  }

  function speed(b) { return Math.hypot(b.vx, b.vy); }

  function anyMoving(balls) {
    for (const b of balls) if (b.active && speed(b) > STOP_EPS) return true;
    return false;
  }

  /* 点到线段距离（用于 AI 路径检测） */
  function distPointToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /* 两点间路径是否无阻挡（排除 ignoreIds 中的球） */
  function pathClear(x1, y1, x2, y2, balls, ignoreIds, clearance) {
    clearance = clearance || BALL_R * 2 - 1;
    for (const b of balls) {
      if (!b.active || ignoreIds.indexOf(b.id) !== -1) continue;
      if (distPointToSegment(b.x, b.y, x1, y1, x2, y2) < clearance) return false;
    }
    return true;
  }

  /* 新开一个事件收集器。事件按“物理步”分组，便于规则判定
   * （如“首次接触之后是否有球碰库”）。 */
  function newEvents() { return { steps: [], firstContact: undefined, firstContactStep: -1 }; }

  function _contact(events, otherId) {
    if (events.firstContact === undefined) events.firstContact = otherId;
  }

  /* 单个固定步长。events 传入时记录碰撞/碰库/落袋事件。 */
  function step(balls, events) {
    const ev = { collisions: [], rails: [], potted: [] };

    for (const b of balls) {
      if (!b.active) continue;
      b.x += b.vx; b.y += b.vy;
      b.vx *= FRICTION; b.vy *= FRICTION;
      if (Math.abs(b.vx) < STOP_EPS) b.vx = 0;
      if (Math.abs(b.vy) < STOP_EPS) b.vy = 0;

      const minX = b.r, maxX = TABLE_W - b.r;
      const minY = b.r, maxY = TABLE_H - b.r;
      const mouth = nearMouth(b.x, b.y);
      if (b.x < minX) { b.x = minX; if (b.vx < 0) { if (mouth) b.vx *= 0.85; else { b.vx = -b.vx * WALL_RESTITUTION; ev.rails.push({ ball: b.id, power: Math.abs(b.vx) }); } } }
      if (b.x > maxX) { b.x = maxX; if (b.vx > 0) { if (mouth) b.vx *= 0.85; else { b.vx = -b.vx * WALL_RESTITUTION; ev.rails.push({ ball: b.id, power: Math.abs(b.vx) }); } } }
      if (b.y < minY) { b.y = minY; if (b.vy < 0) { if (mouth) b.vy *= 0.85; else { b.vy = -b.vy * WALL_RESTITUTION; ev.rails.push({ ball: b.id, power: Math.abs(b.vy) }); } } }
      if (b.y > maxY) { b.y = maxY; if (b.vy > 0) { if (mouth) b.vy *= 0.85; else { b.vy = -b.vy * WALL_RESTITUTION; ev.rails.push({ ball: b.id, power: Math.abs(b.vy) }); } } }

      for (const p of POCKETS) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < pocketRadius(p)) {
          b.active = false; b.vx = 0; b.vy = 0;
          ev.potted.push({ ball: b.id, pocket: p });
          break;
        }
      }
    }

    /* 球-球碰撞：位置修正 + 冲量交换 */
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      if (!a.active) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const c = balls[j];
        if (!c.active) continue;
        const dx = c.x - a.x, dy = c.y - a.y;
        const d = Math.hypot(dx, dy), min = a.r + c.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d, overlap = (min - d) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap;
        c.x += nx * overlap; c.y += ny * overlap;
        const rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
        if (rel > 0) {
          const imp = rel * BALL_RESTITUTION;
          a.vx -= imp * nx; a.vy -= imp * ny;
          c.vx += imp * nx; c.vy += imp * ny;
          ev.collisions.push({ a: a.id, b: c.id, power: imp });
          if (events) {
            if (a.id === 0) _contact(events, c.id);
            else if (c.id === 0) _contact(events, a.id);
          }
        }
      }
    }

    if (events) {
      if (events.firstContact === undefined && ev.collisions.length) {
        /* firstContact 可能已在上面的双循环中记录 */
      }
      if (events.firstContact !== undefined && events.firstContactStep === -1) {
        events.firstContactStep = events.steps.length;
      }
      events.steps.push(ev);
    }
    return ev;
  }

  /* 持续模拟直到全部静止或达到步数上限。返回收集到的事件。 */
  function simulateUntilRest(balls, events, maxSteps) {
    events = events || newEvents();
    maxSteps = maxSteps || 60 * 60; // 上限 60 秒
    let n = 0;
    while (anyMoving(balls) && n < maxSteps) { step(balls, events); n++; }
    return events;
  }

  /* 击球：direction 弧度，power 速度 */
  function strike(ball, angle, power) {
    const p = Math.min(Math.max(power, 0), MAX_SPEED);
    ball.vx = Math.cos(angle) * p;
    ball.vy = Math.sin(angle) * p;
  }

  B.Physics = {
    TABLE_W: TABLE_W, TABLE_H: TABLE_H, BALL_R: BALL_R,
    POCKET_R: POCKET_R, POCKETS: POCKETS, MAX_SPEED: MAX_SPEED,
    makeBall: makeBall, speed: speed, anyMoving: anyMoving,
    distPointToSegment: distPointToSegment, pathClear: pathClear,
    newEvents: newEvents, step: step, simulateUntilRest: simulateUntilRest,
    strike: strike, pocketRadius: pocketRadius, nearMouth: nearMouth,
  };
})(typeof window !== 'undefined' ? window : globalThis);
