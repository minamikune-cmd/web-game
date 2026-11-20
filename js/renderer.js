/* ============================================================
 * Billiards · renderer.js
 * 渲染器：球桌、球（带号码/花色）、球杆、瞄准线、力度条。
 * 只负责绘制，不持有游戏状态逻辑。
 * ============================================================ */
(function (global) {
  'use strict';
  const B = global.Billiards = global.Billiards || {};

  function drawTable(ctx, Ph) {
    const W = Ph.TABLE_W, H = Ph.TABLE_H;
    // 台呢
    let g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1a7a4f');
    g.addColorStop(1, '#115c3a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 呢纹
    ctx.strokeStyle = '#ffffff09';
    ctx.lineWidth = 1;
    for (let x = 24; x < W; x += 36) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    // 库边内侧线（橡皮边）
    ctx.strokeStyle = '#0a3d27';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, W - 8, H - 8);
    // 开球线 / 置球点
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W * .25, 10); ctx.lineTo(W * .25, H - 10); ctx.stroke();
    ctx.beginPath(); ctx.arc(W * .25, H / 2, 70, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = '#ffffff33';
    ctx.beginPath(); ctx.arc(W * .705, H / 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * .25, H / 2, 3.5, 0, Math.PI * 2); ctx.fill();
    // 袋口
    for (const p of Ph.POCKETS) {
      const pr = Ph.pocketRadius(p) + 3;
      const pg = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, pr + 6);
      pg.addColorStop(0, '#000');
      pg.addColorStop(.78, '#04110a');
      pg.addColorStop(.82, '#6b4c2b');
      pg.addColorStop(1, '#8a6a3e00');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(p.x, p.y, pr + 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawBall(ctx, b, def, Ph) {
    if (!b.active) return;
    ctx.save();
    ctx.shadowColor = '#00180dcc';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    if (def.stripe) {
      ctx.fillStyle = '#f4f1e4';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = def.color;
      ctx.fillRect(b.x - b.r, b.y - b.r * .58, b.r * 2, b.r * 1.16);
      ctx.restore();
    } else {
      const g = ctx.createRadialGradient(b.x - b.r * .4, b.y - b.r * .45, 1, b.x, b.y, b.r * 1.25);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(.32, def.color);
      g.addColorStop(1, shade(def.color, -45));
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();
    // 号码圆
    if (b.id !== 0) {
      ctx.fillStyle = '#f7f4e8';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1e22';
      ctx.font = 'bold ' + (b.r * .62) + 'px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(b.id), b.x, b.y + .5);
    } else {
      ctx.fillStyle = '#ffffffd9';
      ctx.beginPath(); ctx.arc(b.x - b.r * .3, b.y - b.r * .32, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, bl = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); bl = Math.max(0, Math.min(255, bl));
    return '#' + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0');
  }

  /* 瞄准辅助：虚线导向 + 球杆 + 力度 */
  function drawAim(ctx, cue, angle, power, Ph, showGuide) {
    const nx = Math.cos(angle), ny = Math.sin(angle);
    if (showGuide) {
      ctx.setLineDash([7, 9]);
      ctx.strokeStyle = '#fff3c2b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cue.x + nx * (Ph.BALL_R + 4), cue.y + ny * (Ph.BALL_R + 4));
      // 导向线止于首个阻挡（简化：画固定长度）
      ctx.lineTo(cue.x + nx * 300, cue.y + ny * 300);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 球杆
    const pull = 16 + power * 2.4;
    const sx = cue.x - nx * (pull + 190), sy = cue.y - ny * (pull + 190);
    const ex = cue.x - nx * (pull + 8), ey = cue.y - ny * (pull + 8);
    const grad = ctx.createLinearGradient(sx, sy, ex, ey);
    grad.addColorStop(0, '#7c4f28');
    grad.addColorStop(.7, '#c99a5e');
    grad.addColorStop(1, '#e8d6ae');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#2f7ec9'; // 皮头
    ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(cue.x - nx * pull, cue.y - ny * pull); ctx.stroke();
  }

  function draw(ctx, view) {
    // view = { Ph, balls, aim: {angle, power} | null, placing: bool, pointer: {x,y} | null }
    const Ph = view.Ph;
    ctx.clearRect(0, 0, Ph.TABLE_W, Ph.TABLE_H);
    drawTable(ctx, Ph);
    const defs = B.Rules.BALL_DEFS;
    for (const b of view.balls) {
      if (b.id === 0) continue;
      drawBall(ctx, b, defs[b.id], Ph);
    }
    const cue = view.balls[0];
    if (cue && cue.active) {
      drawBall(ctx, cue, { color: '#f8f5e9' }, Ph);
      if (view.aim) drawAim(ctx, cue, view.aim.angle, view.aim.power, Ph, true);
      if (view.placing && view.pointer) {
        ctx.strokeStyle = '#8ff0b4aa';
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(view.pointer.x, view.pointer.y, Ph.BALL_R, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (view.ghost && cue && cue.active) {
      ctx.strokeStyle = '#ffffff55';
      ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.arc(view.ghost.x, view.ghost.y, Ph.BALL_R, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  B.Renderer = { draw: draw, drawTable: drawTable, drawBall: drawBall, shade: shade };
})(typeof window !== 'undefined' ? window : globalThis);
