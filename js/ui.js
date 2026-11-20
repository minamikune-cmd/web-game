/* ============================================================
 * Billiards · ui.js
 * UI 层：主菜单、HUD（比分/回合/球组）、力度条、胜负界面。
 * 只操作 DOM，不碰游戏逻辑。
 * ============================================================ */
(function (global) {
  'use strict';
  const B = global.Billiards = global.Billiards || {};
  const doc = global.document;

  const el = {};
  function init() {
    ['menuOverlay', 'endOverlay', 'card0', 'card1', 'turnLabel', 'message', 'powerFill',
      'powerWrap', 'statusPill', 'endTitle', 'endReason', 'endStats', 'btnSound', 'soundText',
    ].forEach(id => el[id] = doc.getElementById(id));
  }
  const $ = id => doc.getElementById(id);

  function ballChip(id) {
    const def = B.Rules.BALL_DEFS[id];
    const d = doc.createElement('span');
    d.className = 'chip' + (def.stripe ? ' stripe' : '') + (id === 8 ? ' eight' : '');
    d.style.setProperty('--c', def.color);
    d.textContent = id;
    return d;
  }

  function updateScoreboard(match, balls) {
    for (let i = 0; i < 2; i++) {
      const p = match.players[i];
      const card = el['card' + i];
      card.querySelector('.p-name').textContent = p.name;
      const badge = card.querySelector('.p-group');
      if (p.group) {
        badge.textContent = B.Rules.groupName(p.group);
        badge.className = 'p-group on ' + p.group;
      } else {
        badge.textContent = match.breakDone ? '未分组' : '—';
        badge.className = 'p-group';
      }
      const tray = card.querySelector('.p-balls');
      tray.innerHTML = '';
      if (p.group) {
        const lo = p.group === 'solid' ? 1 : 9;
        const hi = p.group === 'solid' ? 7 : 15;
        let alive = 0;
        for (let id = lo; id <= hi; id++) {
          const alive_ = balls[id] && balls[id].active;
          if (alive_) alive++;
          const chip = ballChip(id);
          if (!alive_) chip.classList.add('down');
          tray.appendChild(chip);
        }
        const onEight = alive === 0;
        const eight = ballChip(8);
        if (!onEight) eight.classList.add('down');
        else eight.classList.add('target');
        tray.appendChild(eight);
        card.classList.toggle('on-eight', onEight);
      } else {
        for (let id = 1; id <= 8; id++) {
          const c = ballChip(id); c.classList.add('idle'); tray.appendChild(c);
        }
      }
      card.classList.toggle('active', match.current === i && match.winner === null);
    }
    el.turnLabel.textContent = match.winner !== null
      ? '对局结束'
      : '轮到 ' + match.players[match.current].name;
  }

  function setMessage(t) { el.message.textContent = t; }
  function setPower(p) {
    el.powerFill.style.width = Math.round(Math.min(Math.max(p, 0), 1) * 100) + '%';
    el.powerWrap.classList.toggle('hot', p > 0.75);
  }
  function setStatus(t) { el.statusPill.innerHTML = '<i></i>' + t; }
  function setSoundLabel(on) { el.soundText.textContent = on ? '开' : '关'; }

  function showMenu(show) { el.menuOverlay.classList.toggle('hidden', !show); }
  function showEnd(match, humanIdx) {
    const win = match.winner === humanIdx;
    el.endTitle.textContent = win ? '你赢了！' : '你输了';
    el.endTitle.className = 'end-title ' + (win ? 'win' : 'lose');
    el.endReason.textContent = match.players[match.winner].name + ' · ' + match.winReason;
    const p = match.players[0], a = match.players[1];
    el.endStats.innerHTML =
      '<div><small>你的击球</small><strong>' + p.shots + '</strong></div>' +
      '<div><small>你的犯规</small><strong>' + p.fouls + '</strong></div>' +
      '<div><small>AI 击球</small><strong>' + a.shots + '</strong></div>' +
      '<div><small>AI 犯规</small><strong>' + a.fouls + '</strong></div>';
    el.endOverlay.classList.remove('hidden');
  }
  function hideEnd() { el.endOverlay.classList.add('hidden'); }

  B.UI = {
    init: init, $: $, el: el,
    updateScoreboard: updateScoreboard, setMessage: setMessage, setPower: setPower,
    setStatus: setStatus, setSoundLabel: setSoundLabel,
    showMenu: showMenu, showEnd: showEnd, hideEnd: hideEnd,
  };
})(typeof window !== 'undefined' ? window : globalThis);
