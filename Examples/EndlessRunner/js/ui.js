// ui.js — Score HUD, menus, game-over screen, high-score
export class UI {
  constructor() {
    this.$score    = document.getElementById('hud-score');
    this.$coins    = document.getElementById('hud-coins');
    this.$speedFill= document.getElementById('speed-fill');
    this.$hud      = document.getElementById('hud');

    this.$loadBar  = document.getElementById('loading-bar');
    this.$loadStat = document.getElementById('loading-status');

    this.$goScore  = document.getElementById('go-score');
    this.$goBest   = document.getElementById('go-best');
    this.$goCoins  = document.getElementById('go-coins');
    this.$goDist   = document.getElementById('go-dist');
    this.$newBest  = document.getElementById('new-best-badge');

    this.$menuHS   = document.getElementById('menu-hs');

    this._laneDots = [
      document.getElementById('lane-dot-0'),
      document.getElementById('lane-dot-1'),
      document.getElementById('lane-dot-2'),
    ];

    this.highScore = parseInt(localStorage.getItem('neonrun_hs') || '0');
    this.$menuHS.textContent = this.highScore.toLocaleString();
  }

  showLoading() {
    this._show('loading-screen');
    this._hide('menu-screen');
    this._hide('pause-screen');
    this._hide('gameover-screen');
    this.$hud.classList.remove('active');
  }

  setLoadProgress(pct, label) {
    this.$loadBar.style.width = pct + '%';
    this.$loadStat.textContent = label;
  }

  showMenu() {
    this.$menuHS.textContent = this.highScore.toLocaleString();
    this._show('menu-screen');
    this._hide('loading-screen');
    this._hide('pause-screen');
    this._hide('gameover-screen');
    this.$hud.classList.remove('active');
  }

  showHUD() {
    this._hide('menu-screen');
    this._hide('loading-screen');
    this._hide('pause-screen');
    this._hide('gameover-screen');
    this.$hud.classList.add('active');
  }

  showPause() {
    this._show('pause-screen');
    this.$hud.classList.remove('active');
  }

  hidePause() {
    this._hide('pause-screen');
    this.$hud.classList.add('active');
  }

  showGameOver(score, coins, dist) {
    const isNew = score > this.highScore;
    if (isNew) {
      this.highScore = score;
      localStorage.setItem('neonrun_hs', score);
    }

    this.$goScore.textContent = score.toLocaleString();
    this.$goBest.textContent  = this.highScore.toLocaleString();
    this.$goCoins.textContent = coins.toLocaleString();
    this.$goDist.textContent  = Math.floor(dist) + 'm';

    if (isNew) {
      this.$newBest.classList.remove('hidden');
    } else {
      this.$newBest.classList.add('hidden');
    }

    this._show('gameover-screen');
    this.$hud.classList.remove('active');
  }

  updateScore(score) {
    this.$score.textContent = Math.floor(score).toLocaleString();
  }

  updateCoins(n) {
    this.$coins.textContent = n;
  }

  updateSpeed(normalized) {
    this.$speedFill.style.width = (normalized * 100).toFixed(1) + '%';
  }

  updateLane(lane) {
    this._laneDots.forEach((d, i) => {
      d.classList.toggle('active', i === lane);
    });
  }

  spawnScorePopup(text, screenX, screenY) {
    const el = document.createElement('div');
    el.className  = 'score-popup';
    el.textContent = text;
    el.style.left = screenX + 'px';
    el.style.top  = screenY + 'px';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  _show(id) { document.getElementById(id)?.classList.remove('hidden'); }
  _hide(id) { document.getElementById(id)?.classList.add('hidden'); }
}
