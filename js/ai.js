/* ============================================================
 * Billiards · ai.js
 * 电脑 AI：目标球选择、进球线路评估（假想球/袋口角度）、
 * 击球力度计算、安全球 fallback、难度等级（噪声模拟失误）。
 * AI 只读取公开的球桌状态，与玩家信息完全对称，不作弊。
 * ============================================================ */
(function (global) {
  'use strict';
  const B = global.Billiards = global.Billiards || {};

  /* 难度配置：aimErr 为角度高斯噪声标准差（弧度），powErr 力度噪声，
   * slip 为“选次优解”的概率，thinkMs 为思考停顿（拟人节奏）。 */
  const DIFFICULTY = {
    easy: { aimErr: 0.055, powErr: 0.20, slip: 0.35, thinkMs: 700, label: '简单' },
    normal: { aimErr: 0.024, powErr: 0.10, slip: 0.12, thinkMs: 1100, label: '普通' },
    hard: { aimErr: 0.008, powErr: 0.04, slip: 0.0, thinkMs: 1500, label: '困难' },
  };

  let seed = 123456789;
  function rand() { // 可复现的 LCG（测试中稳定）
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function gauss() { return (rand() + rand() + rand() - 1.5) * 0.82; }

  function norm(dx, dy) { const l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l, len: l }; }

  /* 评估一杆进球：返回 { angle, power, score } 或 null（线路不可行） */
  function evalShot(cue, target, pocket, balls, Ph) {
    const R = Ph.BALL_R * 2;
    const toPocket = norm(pocket.x - target.x, pocket.y - target.y);
    if (toPocket.len < Ph.BALL_R * 2.2) return null; // 目标球几乎压袋口，忽略
    // 假想球（ghost ball）位置：目标球后方一个直径处
    const gx = target.x - toPocket.x * R, gy = target.y - toPocket.y * R;
    const m = Ph.BALL_R + 1;
    if (gx < m || gx > Ph.TABLE_W - m || gy < m || gy > Ph.TABLE_H - m) return null;
    // 白球→假想球 线路畅通
    if (!Ph.pathClear(cue.x, cue.y, gx, gy, balls, [0, target.id])) return null;
    // 目标球→袋口 线路畅通
    if (!Ph.pathClear(target.x, target.y, pocket.x, pocket.y, balls, [target.id])) return null;

    const toGhost = norm(gx - cue.x, gy - cue.y);
    // 切入角：cos 越大球越正；< 0.12（约 83°）视为薄边不可行
    const cut = toGhost.x * toPocket.x + toGhost.y * toPocket.y;
    if (cut < 0.12) return null;

    const distTotal = toGhost.len + toPocket.len;
    // 袋口角：进球方向与袋口中心方向夹角越小越好
    const pocketScore = pocket.mid ? 0.02 : 0.05;
    const score = cut * 2.2 - distTotal / 850 + pocketScore;
    // 力度：距离越远、切入越薄，需要越大力度
    const power = Math.min(Ph.MAX_SPEED, Math.max(4.5, distTotal * 0.052 + (1 - cut) * 7));
    return { angle: Math.atan2(toGhost.y, toGhost.x), power: power, score: score, targetId: target.id, kind: 'pot' };
  }

  /* 无进球线路时的安全球：轻贴己方球，白球回中台 */
  function safeShot(cue, targets, balls, Ph) {
    let best = null;
    for (const id of targets) {
      const t = balls[id];
      if (!t || !t.active) continue;
      const toT = norm(t.x - cue.x, t.y - cue.y);
      if (!Ph.pathClear(cue.x, cue.y, t.x - toT.x * Ph.BALL_R * 2, t.y - toT.y * Ph.BALL_R * 2, balls, [0, id])) continue;
      // 薄切方向，让白球吃库后回中台
      const tangent = { x: -toT.y, y: toT.x };
      const sign = (cue.x + cue.y) % 2 < 1 ? 1 : -1;
      const dir = norm(tangent.x * sign * 0.9 + toT.x * 0.35, tangent.y * sign * 0.9 + toT.y * 0.35);
      const cand = {
        angle: Math.atan2(dir.y, dir.x), power: 9 + rand() * 3,
        score: -1, targetId: id, kind: 'safe',
      };
      if (!best || cand.power < best.power) best = cand;
    }
    if (best) return best;
    // 极端情况：随便朝最近球打（可能犯规，但不死局）
    for (const id of targets) {
      const t = balls[id];
      if (t && t.active) {
        const d = norm(t.x - cue.x, t.y - cue.y);
        return { angle: Math.atan2(d.y, d.x), power: 8, score: -2, targetId: id, kind: 'desperate' };
      }
    }
    return { angle: 0, power: 8, score: -3, targetId: null, kind: 'none' };
  }

  /* 出杆前验证：快速仿真一杆，返回是否犯规。
   * 使用快照/还原，不影响真实球局；仅利用公开物理规律，不读取隐藏信息。 */
  function previewFoul(balls, match, idx, shot) {
    const Ph = B.Physics, Rules = B.Rules;
    const snap = balls.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, active: b.active }));
    const matchCopy = JSON.parse(JSON.stringify(match));
    try {
      Ph.strike(balls[0], shot.angle, shot.power);
      const ev = Ph.newEvents();
      Ph.simulateUntilRest(balls, ev, 2400);
      return Rules.resolveShot(matchCopy, balls, ev).foul;
    } finally {
      // Preview simulation must never leak temporary motion into the live match.
      balls.forEach((b, i) => Object.assign(b, snap[i]));
    }
  }

  /* 无噪声地枚举全部可行进球线路（AI 摆球与测试也复用） */
  function analyze(balls, match, idx) {
    const Ph = B.Physics, Rules = B.Rules;
    const cue = balls[0];
    const targets = Rules.legalTargets(balls, match, idx);
    const candidates = [];
    for (const id of targets) {
      const t = balls[id];
      if (!t || !t.active) continue;
      for (const p of Ph.POCKETS) {
        const s = evalShot(cue, t, p, balls, Ph);
        if (s) candidates.push(s);
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /* 主入口：为一局比赛中的 idx 号球员规划一杆。
   * 返回 { angle, power, kind, targetId } */
  function planShot(balls, match, idx, difficulty) {
    const Ph = B.Physics, Rules = B.Rules;
    const cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    const cue = balls[0];
    const targets = Rules.legalTargets(balls, match, idx);
    const candidates = analyze(balls, match, idx);

    let pick = null;
    if (candidates.length) {
      // 出杆前验证：逐个仿真候选杆法，剔除会导致犯规的（仅 easy 偶尔不验证，保留失误空间）
      const maxTry = difficulty === 'hard' ? 4 : difficulty === 'normal' ? 3 : 1;
      const validated = [];
      for (const c of candidates) {
        if (validated.length >= maxTry) break;
        if (!previewFoul(balls, match, idx, c)) validated.push(c);
      }
      if (validated.length) {
        pick = (validated.length > 1 && rand() < cfg.slip) ? validated[1] : validated[0];
      } else {
        // 所有进球线路验证都犯规（罕见），改打验证过的安全球
        const safe = safeShot(cue, targets, balls, Ph);
        pick = previewFoul(balls, match, idx, safe) ? (candidates[0] || safe) : safe;
      }
    } else {
      pick = safeShot(cue, targets, balls, Ph);
    }

    // 难度噪声：角度偏差 + 力度偏差（AI 也会打丢，尤其高难度下才精准）
    pick.angle += gauss() * cfg.aimErr;
    pick.power *= 1 + gauss() * cfg.powErr;
    pick.power = Math.min(Math.max(pick.power, 2), Ph.MAX_SPEED);
    pick.thinkMs = cfg.thinkMs + rand() * 500;
    return pick;
  }

  B.AI = { DIFFICULTY: DIFFICULTY, planShot: planShot, analyze: analyze, safeShot: safeShot, previewFoul: previewFoul, _rand: rand, _setSeed: s => { seed = s >>> 0; } };
})(typeof window !== 'undefined' ? window : globalThis);
