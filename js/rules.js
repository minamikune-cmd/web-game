/* ============================================================
 * Billiards · rules.js
 * 美式 8 球规则引擎：摆球、分组、轮流击球、犯规判定、
 * 手中球、胜负判定。与物理、DOM 解耦，可在 Node 中测试。
 * ============================================================ */
(function (global) {
  'use strict';
  const B = global.Billiards = global.Billiards || {};
  const P = () => B.Physics;

  /* 球定义：1-7 全色，8 黑球，9-15 花色 */
  const BALL_DEFS = {
    1: { color: '#e7b84f', name: '1号' },
    2: { color: '#3477b9', name: '2号' },
    3: { color: '#b94a45', name: '3号' },
    4: { color: '#8b58a7', name: '4号' },
    5: { color: '#e57d37', name: '5号' },
    6: { color: '#2f8f6b', name: '6号' },
    7: { color: '#8f4a2f', name: '7号' },
    8: { color: '#23252a', name: '8号' },
    9: { color: '#e7b84f', stripe: true, name: '9号' },
    10: { color: '#3477b9', stripe: true, name: '10号' },
    11: { color: '#b94a45', stripe: true, name: '11号' },
    12: { color: '#8b58a7', stripe: true, name: '12号' },
    13: { color: '#e57d37', stripe: true, name: '13号' },
    14: { color: '#2f8f6b', stripe: true, name: '14号' },
    15: { color: '#8f4a2f', stripe: true, name: '15号' },
  };

  function groupOf(id) {
    if (id >= 1 && id <= 7) return 'solid';
    if (id >= 9 && id <= 15) return 'stripe';
    return null; // 0 = 白球，8 = 黑8
  }

  function groupName(g) { return g === 'solid' ? '全色球' : g === 'stripe' ? '花色球' : '未定'; }

  /* 摆球：白球在开球线后随机，目标球三角框，8号居中，底角一全一花 */
  function rackBalls() {
    const Ph = P();
    const W = Ph.TABLE_W, H = Ph.TABLE_H;
    const balls = [];
    const cue = Ph.makeBall(0, 232 + Math.random() * 30, H / 2 + (Math.random() * 80 - 40));
    balls.push(cue);

    const apexX = W * 0.705, footY = H / 2, dx = Ph.BALL_R * 2 * Math.cos(Math.PI / 6), dy = Ph.BALL_R * 2;
    const spots = [];
    for (let row = 0; row < 5; row++)
      for (let j = 0; j <= row; j++)
        spots.push({ x: apexX + row * dx, y: footY + (j - row / 2) * dy });

    const solids = [1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - .5);
    const stripes = [9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - .5);
    const rest = solids.concat(stripes).sort(() => Math.random() - .5);
    const order = new Array(15);
    order[4] = 8;                       // 三角框中心
    order[10] = rest.pop();             // 底角
    order[14] = rest.pop();             // 另一底角
    for (let i = 0; i < 15; i++) if (order[i] === undefined) order[i] = rest.pop();

    for (let i = 0; i < 15; i++) balls.push(Ph.makeBall(order[i], spots[i].x, spots[i].y));
    balls.sort((a, b) => a.id - b.id);  // 让 balls[id] 可按 id 索引（0..15）
    return balls;
  }

  /* 创建一局比赛 */
  function createMatch(cfg) {
    cfg = cfg || {};
    return {
      players: [
        { name: cfg.playerName || '玩家', group: null, isAI: false, shots: 0, fouls: 0 },
        { name: cfg.aiName || '电脑', group: null, isAI: true, shots: 0, fouls: 0 },
      ],
      current: 0,          // 当前击球方
      breakDone: false,    // 开球是否已发生
      openTable: false,    // 台面开放（未分组）
      ballInHand: true,    // 开球前可自由摆放白球（开球线后由游戏层处理）
      winner: null,        // 0/1
      winReason: '',
    };
  }

  function activeCount(balls, group) {
    let n = 0;
    for (const b of balls)
      if (b.active && groupOf(b.id) === group) n++;
    return n;
  }

  /* 该球员当前合法的首个接触目标集合 */
  function legalTargets(balls, match, idx) {
    const me = match.players[idx];
    const targets = [];
    if (!me.group) { // 开放球桌：任意全色/花色球（黑8在分组前不可作为首碰目标）
      for (const b of balls) if (b.active && b.id !== 0 && b.id !== 8) targets.push(b.id);
      return targets;
    }
    const mine = balls.filter(b => b.active && groupOf(b.id) === me.group);
    if (mine.length) return mine.map(b => b.id);
    if (balls[8] && balls[8].active) return [8];
    return [];
  }

  /* 从事件流汇总一次击球结果。返回结构化判定。 */
  function summarize(events) {
    const potted = [];
    for (const s of events.steps) for (const p of s.potted) potted.push(p.ball);
    let railAfterContact = false;
    const fc = events.firstContactStep;
    if (fc >= 0) {
      for (let i = fc + 1; i < events.steps.length; i++)
        if (events.steps[i].rails.length) { railAfterContact = true; break; }
    }
    return {
      potted: potted,
      cueScratched: potted.indexOf(0) !== -1,
      eightPotted: potted.indexOf(8) !== -1,
      firstContact: events.firstContact === undefined ? null : events.firstContact,
      railAfterContact: railAfterContact,
    };
  }

  /* 判定一次击球（球已全部静止后调用）。
   * 返回 { foul, message, turnContinues, assign?, gameOver? } */
  function resolveShot(match, balls, events) {
    const s = summarize(events);
    const meIdx = match.current, me = match.players[meIdx];
    const oppIdx = 1 - meIdx;
    me.shots++;
    const out = { foul: null, message: '', turnContinues: false, switchTurn: false, gameOver: false };

    /* --- 犯规判定 --- */
    if (s.cueScratched) {
      out.foul = '白球落袋';
    } else if (s.firstContact === null) {
      out.foul = '未击中任何球';
    } else if (match.breakDone) {
      const onEight = !!me.group && activeCount(balls, me.group) === 0;
      const legal = legalTargets(balls, match, meIdx);
      if (legal.length && legal.indexOf(s.firstContact) === -1) {
        out.foul = onEight ? '应首先击打黑8'
          : !me.group && s.firstContact === 8 ? '开放球桌不能首先击打黑8'
          : '首先碰到了对方的球';
      }
    }

    const objectPotted = s.potted.filter(id => id !== 0);
    if (!out.foul) {
      // 合法击球后：有目标球落袋 或 首次接触后有球碰库，否则犯规
      const noRail = !s.railAfterContact;
      if (objectPotted.length === 0 && noRail) out.foul = '击球后无球落袋且未碰库';
    }

    if (out.foul) me.fouls++;

    /* --- 黑8 处理 --- */
    const isBreak = !match.breakDone;
    if (s.eightPotted) {
      if (isBreak) { // 休闲规则：开球进8直接获胜
        match.winner = meIdx; match.winReason = '开球幸运打进黑8';
        out.gameOver = true; out.message = match.winReason;
        return out;
      }
      const onEight = me.group && activeCount(balls, me.group) === 0;
      if (onEight && !out.foul) {
        match.winner = meIdx; match.winReason = '合法打进黑8';
      } else if (onEight && out.foul) {
        match.winner = oppIdx; match.winReason = '击打黑8时犯规';
      } else {
        match.winner = oppIdx; match.winReason = '过早打进黑8';
      }
      out.gameOver = true; out.message = match.winReason;
      return out;
    }

    /* --- 开球 --- */
    if (isBreak) {
      match.breakDone = true;
      match.ballInHand = false;
      if (out.foul) {
        out.switchTurn = true;
        match.ballInHand = true;
        match.current = oppIdx;
        out.message = '开球犯规：' + out.foul + '，对方手中球';
      } else if (objectPotted.length) {
        match.openTable = true;
        out.turnContinues = true;
        out.message = '开球进球，继续击球（台面开放）';
      } else {
        match.openTable = true;
        out.switchTurn = true;
        match.current = oppIdx;
        out.message = '台面开放，轮到对方';
      }
      return out;
    }

    /* --- 分组 --- */
    if (!me.group && !out.foul && objectPotted.length) {
      const first = objectPotted[0];
      const g = groupOf(first);
      me.group = g;
      match.players[oppIdx].group = g === 'solid' ? 'stripe' : 'solid';
      out.assigned = g;
    }

    /* --- 回合归属 --- */
    let pottedOwn = false;
    if (me.group && !out.foul) {
      pottedOwn = objectPotted.some(id => groupOf(id) === me.group);
    }
    if (out.foul) {
      out.switchTurn = true;
      match.ballInHand = true;
      match.current = oppIdx;
      out.message = out.foul + '，对方手中球';
    } else if (pottedOwn || out.assigned) {
      out.turnContinues = true;
      const onEight = me.group && activeCount(balls, me.group) === 0;
      out.message = onEight
        ? me.name + ' 已清完本组，请击打黑8'
        : out.assigned
          ? me.name + ' 分到' + groupName(out.assigned) + '，继续击球'
          : '进球有效，继续击球';
    } else {
      out.switchTurn = true;
      match.current = oppIdx;
      out.message = objectPotted.length ? '未进己方球，换对方击球' : '未进球，换对方击球';
    }
    return out;
  }

  /* 手中球放置校验：不越界、不压球 */
  function canPlaceCue(balls, x, y) {
    const Ph = P();
    if (x < Ph.BALL_R || x > Ph.TABLE_W - Ph.BALL_R || y < Ph.BALL_R || y > Ph.TABLE_H - Ph.BALL_R) return false;
    for (const b of balls) {
      if (!b.active || b.id === 0) continue;
      if (Math.hypot(b.x - x, b.y - y) < Ph.BALL_R * 2) return false;
    }
    return true;
  }

  B.Rules = {
    BALL_DEFS: BALL_DEFS, groupOf: groupOf, groupName: groupName,
    rackBalls: rackBalls, createMatch: createMatch, resolveShot: resolveShot,
    legalTargets: legalTargets, activeCount: activeCount,
    canPlaceCue: canPlaceCue, summarize: summarize,
  };
})(typeof window !== 'undefined' ? window : globalThis);
