import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('App root element "#app" was not found.');
}

root.innerHTML = `
  <main class="shell">
    <p class="eyebrow">BILLIARDS WEB · DEVELOPMENT</p>
    <h1>开发环境已就绪</h1>
    <p class="intro">
      这里是正式应用的入口。仓库根目录中的旧版小游戏会继续保留为 Demo / Reference。
    </p>
    <section class="panel" aria-labelledby="next-heading">
      <h2 id="next-heading">下一步</h2>
      <p>先搭建游戏核心模块，再逐步迁移和重构 Demo 中验证过的玩法。</p>
    </section>
  </main>
`;
