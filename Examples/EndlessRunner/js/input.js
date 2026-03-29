// input.js — Keyboard + Touch input manager
export class InputManager {
  constructor() {
    this.keys       = {};
    this.swipeStart = null;
    this._handlers  = [];

    // ─── Keyboard ───
    const onDown = (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'ArrowUp') e.preventDefault();
    };
    const onUp = (e) => {
      this.keys[e.code] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    this._handlers.push(
      { el: window, ev: 'keydown', fn: onDown },
      { el: window, ev: 'keyup',   fn: onUp   }
    );

    // ─── Touch ───
    const onTouchStart = (e) => {
      const t = e.touches[0];
      this.swipeStart = { x: t.clientX, y: t.clientY, time: Date.now() };
    };
    const onTouchEnd = (e) => {
      if (!this.swipeStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.swipeStart.x;
      const dy = t.clientY - this.swipeStart.y;
      const dt = Date.now() - this.swipeStart.time;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (dt < 400 && (adx > 30 || ady > 30)) {
        if (ady > adx) {
          // Vertical swipe
          if (dy < 0) this._triggerSwipe('up');
        } else {
          if (dx < 0) this._triggerSwipe('left');
          else        this._triggerSwipe('right');
        }
      }
      this.swipeStart = null;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });
    this._handlers.push(
      { el: window, ev: 'touchstart', fn: onTouchStart },
      { el: window, ev: 'touchend',   fn: onTouchEnd   }
    );

    // ─── Touch zone buttons ───
    const tzLeft  = document.getElementById('tz-left');
    const tzMid   = document.getElementById('tz-mid');
    const tzRight = document.getElementById('tz-right');
    if (tzLeft)  { const f = () => this._triggerSwipe('left');  tzLeft.addEventListener('click', f);  this._handlers.push({ el: tzLeft,  ev: 'click', fn: f }); }
    if (tzMid)   { const f = () => this._triggerSwipe('up');    tzMid.addEventListener('click', f);   this._handlers.push({ el: tzMid,   ev: 'click', fn: f }); }
    if (tzRight) { const f = () => this._triggerSwipe('right'); tzRight.addEventListener('click', f); this._handlers.push({ el: tzRight, ev: 'click', fn: f }); }

    this._swipeListeners = [];
    this._pendingSwipes  = [];
  }

  _triggerSwipe(dir) {
    this._pendingSwipes.push(dir);
    this._swipeListeners.forEach(fn => fn(dir));
  }

  onSwipe(fn) {
    this._swipeListeners.push(fn);
  }

  consumeSwipes() {
    const s = this._pendingSwipes.slice();
    this._pendingSwipes = [];
    return s;
  }

  isDown(code) { return !!this.keys[code]; }

  dispose() {
    this._handlers.forEach(({ el, ev, fn }) => el.removeEventListener(ev, fn));
  }
}
