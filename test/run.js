/* ============================================================
 * 自动化测试：Node 环境直接加载物理/规则/AI 模块（无 DOM 依赖）。
 * 运行：node test/run.js
 * ============================================================ */
'use strict';
require('../js/physics.js');
require('../js/rules.js');
require('../js/ai.js');
const B = globalThis.Billiards;
const { Physics: Ph, Rules, AI } = B;

let passed = 0, failed = 0;
function ok(cond, name) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.error('  ✗ FAIL: ' + name); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* ---------- 物理 ---------- */
section('物理系统');
{
  // 对心碰撞：两个相同质量的球，A 停、B 走（近似，含恢复系数）
  const a = Ph.makeBall(0, 400, 250), b = Ph.makeBall(1, 400 + Ph.BALL_R * 2 + 1, 250);
  a.vx = 8;
  const balls = [a, b];
  for (let i = 0; i < 60; i++) Ph.step(balls);
  ok(Math.abs(a.vx) < 0.4 && b.vx > 3, '对心碰撞后白球减速、目标球获得速度');
  ok(b.x > 400 + Ph.BALL_R * 2, '碰撞后球体分离');
  const coincidentA = Ph.makeBall(0, 700, 250), coincidentB = Ph.makeBall(1, 700, 250);
  Ph.step([coincidentA, coincidentB]);
  ok(Math.hypot(coincidentB.x - coincidentA.x, coincidentB.y - coincidentA.y) >= Ph.BALL_R * 2 - 0.01,
    '完全重合的球也能确定性分离');
}
{
  // 库边反弹：保持在桌面内
  const b = Ph.makeBall(0, 100, 60); b.vx = 10; b.vy = -14;
  const balls = [b];
  for (let i = 0; i < 200; i++) Ph.step(balls);
  ok(b.x >= Ph.BALL_R - .01 && b.x <= Ph.TABLE_W - Ph.BALL_R + .01, '碰库后仍在桌界内(X)');
  ok(b.y >= Ph.BALL_R - .01 && b.y <= Ph.TABLE_H - Ph.BALL_R + .01, '碰库后仍在桌界内(Y)');
}
{
  // 摩擦停球
  const b = Ph.makeBall(0, 500, 250); b.vx = 6;
  Ph.simulateUntilRest([b]);
  ok(b.vx === 0 && b.vy === 0, '摩擦使球最终停止');
  ok(!Ph.anyMoving([b]), 'anyMoving 判定静止');
}
{
  // 落袋：向角袋滚动应被捕获
  const b = Ph.makeBall(1, 80, 60); b.vx = -4; b.vy = -4;
  const balls = [b];
  const ev = Ph.newEvents();
  Ph.simulateUntilRest(balls, ev);
  ok(!b.active, '球进袋后 inactive');
  ok(ev.steps.some(s => s.potted.length), '落袋事件被记录');
}
{
  // 事件：首次接触
  const cue = Ph.makeBall(0, 400, 250), t = Ph.makeBall(3, 430, 250);
  cue.vx = 8;
  const ev = Ph.newEvents();
  Ph.simulateUntilRest([cue, t], ev);
  ok(ev.firstContact === 3, 'firstContact 记录正确');
  ok(ev.firstContactStep >= 0, 'firstContactStep 记录');
}

/* ---------- 规则 ---------- */
section('规则：摆球');
{
  const balls = Rules.rackBalls();
  ok(balls.length === 16, '16 颗球');
  ok(balls[0].id === 0 && balls[0].active, '白球存在');
  let dup = false, seen = new Set();
  for (const b of balls) { if (seen.has(b.id)) dup = true; seen.add(b.id); }
  ok(!dup, '球号不重复');
  ok(balls[8] && balls[8].active, '8号球在场');
  // 8号在中心附近（三角框第3排中间 ≈ spots index 4）
  const eight = balls[8];
  ok(Math.abs(eight.x - Ph.TABLE_W * .705 - Ph.BALL_R * 4 * Math.cos(Math.PI / 6)) < 2 &&
     Math.abs(eight.y - Ph.TABLE_H / 2) < 2, '8号位于球堆中心');
  // 不重叠
  let overlap = false;
  for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
    const d = Math.hypot(balls[i].x - balls[j].x, balls[i].y - balls[j].y);
    if (d < Ph.BALL_R * 2 - 0.01) overlap = true;
  }
  ok(!overlap, '摆球不重叠');
}

section('规则：犯规判定');
function scriptedMatch() {
  const balls = Rules.rackBalls();
  const match = Rules.createMatch({ playerName: 'P', aiName: 'C' });
  match.breakDone = true; match.ballInHand = false; match.openTable = true;
  return { balls, match };
}
{
  // 白球未碰任何球
  const { balls, match } = scriptedMatch();
  balls[0].x = 300; balls[0].y = 250; balls[0].vx = 0; balls[0].vy = 0;
  const ev = Ph.newEvents(); Ph.strike(balls[0], 0, 3);
  Ph.simulateUntilRest(balls, ev);
  const r = Rules.resolveShot(match, balls, ev);
  ok(!!r.foul, '未碰球 → 犯规');
  ok(match.ballInHand, '犯规后对方手中球');
  ok(match.current === 1, '犯规后换边');
}
{
  // 空杆（无落袋无碰库）：直线打向库边方向但先碰球再停
  const { balls, match } = scriptedMatch();
  for (const b of balls) if (b.id !== 0) b.active = false; // 只留白球
  balls[1].active = true; balls[1].x = 600; balls[1].y = 250;
  balls[0].x = 400; balls[0].y = 250;
  const ev = Ph.newEvents(); Ph.strike(balls[0], 0, 2.2);
  Ph.simulateUntilRest(balls, ev);
  const r = Rules.resolveShot(match, balls, ev);
  ok(!!r.foul, '无落袋且碰库不足 → 犯规');
}
{
  // 白球落袋 → 犯规 + 手中球（白球直线入角袋，无其他球）
  const { balls, match } = scriptedMatch();
  for (const b of balls) if (b.id !== 0) b.active = false;
  balls[0].x = 300; balls[0].y = 200;
  const ev = Ph.newEvents(); Ph.strike(balls[0], Math.atan2(0 - 200, 0 - 300), 12);
  Ph.simulateUntilRest(balls, ev);
  const r = Rules.resolveShot(match, balls, ev);
  ok(r.foul === '白球落袋', '白球落袋 → 犯规(白球落袋)');
  ok(match.ballInHand, '手中球标记');
}
{
  // 合法进球（直球进中袋）→ 继续击球
  const { balls, match } = scriptedMatch();
  for (const b of balls) if (b.id !== 0) b.active = false;
  balls[1].active = true; balls[1].x = 500; balls[1].y = 120;
  balls[0].x = 500; balls[0].y = 380;
  const ev = Ph.newEvents(); Ph.strike(balls[0], -Math.PI / 2, 8);
  Ph.simulateUntilRest(balls, ev);
  const r = Rules.resolveShot(match, balls, ev);
  ok(!r.foul, '合法进球无犯规');
  ok(r.turnContinues, '进球后继续击球');
  ok(match.players[0].group === 'solid' && match.players[1].group === 'stripe', '分组自动分配');
}

section('规则：黑8胜负');
{
  // 过早打黑8 → 判负（用合成事件精确构造：白球首碰8号且8号落袋，本组球未清）
  const { balls, match } = scriptedMatch();
  match.players[0].group = 'solid'; match.players[1].group = 'stripe';
  const ev = Ph.newEvents();
  ev.steps.push({ collisions: [{ a: 0, b: 8, power: 5 }], rails: [{ ball: 8, power: 1 }], potted: [{ ball: 8 }] });
  ev.firstContact = 8; ev.firstContactStep = 0;
  balls[8].active = false;
  const r = Rules.resolveShot(match, balls, ev);
  ok(r.gameOver && match.winner === 1, '未清组打进黑8 → 对方获胜');
}
{
  // 清组后合法黑8 → 获胜
  const { balls, match } = scriptedMatch();
  match.players[0].group = 'solid'; match.players[1].group = 'stripe';
  for (const b of balls) if (b.id !== 0 && b.id !== 8) b.active = false;
  balls[8].active = true; balls[8].x = 500; balls[8].y = 120;
  balls[0].x = 500; balls[0].y = 380;
  const ev = Ph.newEvents(); Ph.strike(balls[0], -Math.PI / 2, 8);
  Ph.simulateUntilRest(balls, ev);
  const r = Rules.resolveShot(match, balls, ev);
  ok(r.gameOver && match.winner === 0, '清组后合法黑8 → 获胜');
}
{
  // 黑8 + 白球同落 → 判负（合成事件：本组已清，黑8落袋但白球也落袋）
  const { balls, match } = scriptedMatch();
  match.players[0].group = 'solid'; match.players[1].group = 'stripe';
  for (const b of balls) if (b.id !== 0 && b.id !== 8) b.active = false;
  const ev = Ph.newEvents();
  ev.steps.push({ collisions: [{ a: 0, b: 8, power: 5 }], rails: [], potted: [{ ball: 8 }, { ball: 0 }] });
  ev.firstContact = 8; ev.firstContactStep = 0;
  balls[8].active = false; balls[0].active = false;
  const r = Rules.resolveShot(match, balls, ev);
  ok(r.gameOver && match.winner === 1, '黑8+白球同落 → 判负');
}
{
  // 开球黑8 → 直接获胜
  const balls = Rules.rackBalls();
  const match = Rules.createMatch();
  const ev = Ph.newEvents();
  ev.steps.push({ collisions: [{ a: 0, b: 8, power: 5 }], rails: [], potted: [{ ball: 8 }] });
  ev.firstContact = 8; ev.firstContactStep = 0;
  balls[8].active = false;
  const r = Rules.resolveShot(match, balls, ev);
  ok(r.gameOver && match.winner === 0, '开球进黑8 → 获胜');
}
{
  // canPlaceCue
  const balls = Rules.rackBalls();
  ok(!Rules.canPlaceCue(balls, balls[1].x, balls[1].y), '压球位置不可摆放');
  ok(!Rules.canPlaceCue(balls, 5, 5), '界外不可摆放');
  ok(Rules.canPlaceCue(balls, 300, 400), '空位可摆放');
}

/* ---------- AI ---------- */
section('AI：选杆与对局');
{
  // 简单局面：AI 应找到进球线路
  const balls = [];
  for (let i = 0; i < 16; i++) balls.push(Ph.makeBall(i, 100 + i * 40, 250));
  for (const b of balls) if (b.id !== 0 && b.id !== 1) b.active = false;
  balls[0].x = 300; balls[0].y = 250;
  balls[1].x = 500; balls[1].y = 250; balls[1].active = true;
  const match = Rules.createMatch();
  match.breakDone = true; match.openTable = true; match.ballInHand = false;
  const cands = AI.analyze(balls, match, 0);
  ok(cands.length > 0, 'AI 找到进球线路 (候选 ' + cands.length + ' 条)');
  const plan = AI.planShot(balls, match, 0, 'hard');
  ok(typeof plan.angle === 'number' && plan.power > 0, 'planShot 返回角度与力度');
}
{
  // AI 不作弊：只依赖公开状态（静态检查 planShot 不读取隐藏变量由架构保证）
  // 此处验证不同难度噪声不同
  AI._setSeed(42);
  const mk = () => {
    const balls = [];
    for (let i = 0; i < 16; i++) balls.push(Ph.makeBall(i, 100 + i * 40, 250));
    for (const b of balls) if (b.id !== 0 && b.id !== 1) b.active = false;
    balls[0].x = 300; balls[0].y = 250; balls[1].x = 500; balls[1].y = 250; balls[1].active = true;
    const match = Rules.createMatch(); match.breakDone = true; match.openTable = true; match.ballInHand = false;
    return { balls, match };
  };
  let errSum = { easy: 0, normal: 0, hard: 0 };
  for (const d of ['easy', 'normal', 'hard']) {
    for (let k = 0; k < 40; k++) {
      const { balls, match } = mk();
      AI._setSeed(k + 1);
      const idealCand = AI.analyze(balls, match, 0)[0];
      const ideal = idealCand ? idealCand.angle : 0; // 与 AI 枚举的最佳理想角度比
      const p = AI.planShot(balls, match, 0, d);
      errSum[d] += Math.abs(p.angle - ideal);
    }
  }
  ok(errSum.easy > errSum.normal && errSum.normal > errSum.hard,
    `难度噪声递减 (easy=${errSum.easy.toFixed(2)} normal=${errSum.normal.toFixed(2)} hard=${errSum.hard.toFixed(2)})`);
}

section('AI vs AI 完整对局仿真');
function simulateGame(difficulty, seed) {
  AI._setSeed(seed);
  const balls = Rules.rackBalls();
  const match = Rules.createMatch({ playerName: 'A', aiName: 'B' });
  match.current = 0;
  // 摆白球
  balls[0].x = 240; balls[0].y = 250; balls[0].active = true;
  let shots = 0, maxShots = 400;
  while (match.winner === null && shots < maxShots) {
    const idx = match.current;
    if (match.ballInHand || !balls[0].active) {
      balls[0].active = true;
      // 仿真摆球：找最优分析点（复用 AI 摆球策略）
      let best = null, bestScore = -1;
      for (let x = 90; x <= Ph.TABLE_W - 90; x += 45) for (let y = 70; y <= Ph.TABLE_H - 70; y += 45) {
        if (!Rules.canPlaceCue(balls, x, y)) continue;
        balls[0].x = x; balls[0].y = y;
        const cands = AI.analyze(balls, match, idx);
        const sc = cands.length ? cands[0].score + cands.length * .05 : -1;
        if (sc > bestScore) { bestScore = sc; best = { x, y }; }
      }
      if (best) { balls[0].x = best.x; balls[0].y = best.y; }
      match.ballInHand = false;
    }
    const plan = AI.planShot(balls, match, idx, difficulty);
    Ph.strike(balls[0], plan.angle, plan.power);
    const ev = Ph.newEvents();
    Ph.simulateUntilRest(balls, ev);
    Rules.resolveShot(match, balls, ev);
    shots++;
  }
  return { winner: match.winner, shots, reason: match.winReason, fouls: match.players.map(p => p.fouls) };
}
{
  let wins = [0, 0], incomplete = 0, totalShots = 0, totalFouls = 0;
  const N = 12;
  for (let s = 1; s <= N; s++) {
    const g = simulateGame(['easy', 'normal', 'hard'][s % 3], s * 7919);
    if (g.winner === null) incomplete++;
    else wins[g.winner]++;
    totalShots += g.shots;
    totalFouls += g.fouls[0] + g.fouls[1];
  }
  ok(incomplete === 0, `全部对局分出胜负 (未完成 ${incomplete}/${N})`);
  ok(wins[0] > 0 && wins[1] > 0, `双方均有获胜 (A=${wins[0]} B=${wins[1]})`);
  console.log(`    平均杆数 ${(totalShots / N).toFixed(1)}，平均犯规 ${(totalFouls / N).toFixed(2)}`);
  ok(totalShots / N < 120, '平均杆数合理（<120）');
}

/* ---------- 汇总 ---------- */
console.log(`\n========== 结果: ${passed} 通过, ${failed} 失败 ==========`);
process.exit(failed ? 1 : 0);
