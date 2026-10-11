export type RGB = readonly [number, number, number];
type Pt = [number, number, number];

export interface Formation {
  x: Float32Array;
  y: Float32Array;
  r: Float32Array;
  color: RGB;
  loose: number;
}

export const INK: { black: RGB; [scene: number]: RGB } = {
  black: [17, 17, 17],
  2: [249, 52, 39],
  3: [124, 58, 237],
  4: [232, 112, 42],
  5: [26, 87, 255],
};

export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Particles {
  N = 0;
  delay = new Float32Array(0);
  ang = new Float32Array(0);
  swirl = new Float32Array(0);
  ph = new Float32Array(0);
  W = 1;
  Hh = 1;
  dpr = 1;
  ctx: CanvasRenderingContext2D | null = null;
  keys: { s: number; f: Formation }[] | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly mobile: boolean,
  ) {}

  allocParticles(density: number): void {
    const N = Math.round((this.mobile ? 650 : 1700) * density);
    this.N = N;
    const r = rng(7);
    this.delay = new Float32Array(N);
    this.ang = new Float32Array(N);
    this.swirl = new Float32Array(N);
    this.ph = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      this.delay[i] = r();
      this.ang[i] = r() * Math.PI * 2;
      this.swirl[i] = 20 + r() * 90;
      this.ph[i] = r() * 100;
    }
  }

  sizeCanvas(): void {
    const c = this.canvas;
    const dpr = Math.min(devicePixelRatio || 1, this.mobile ? 1.5 : 2);
    this.dpr = dpr;
    this.W = Math.max(1, document.documentElement.clientWidth || innerWidth);
    this.Hh = Math.max(1, innerHeight || document.documentElement.clientHeight);
    c.width = Math.round(this.W * dpr);
    c.height = Math.round(this.Hh * dpr);
    this.ctx = c.getContext('2d');
  }

  mk(pts: Pt[], color: RGB, loose: number, seed: number): Formation {
    const N = this.N;
    const r = rng(seed || 1);
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = pts[i];
      pts[i] = pts[j];
      pts[j] = t;
    }
    const x = new Float32Array(N);
    const y = new Float32Array(N);
    const rad = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      if (n < pts.length) {
        x[n] = pts[n][0];
        y[n] = pts[n][1];
        rad[n] = pts[n][2];
      } else if (pts.length) {
        const p = pts[n % pts.length];
        x[n] = p[0];
        y[n] = p[1];
        rad[n] = 0;
      } else {
        x[n] = r() * this.W;
        y[n] = r() * this.Hh;
        rad[n] = 0;
      }
    }
    return { x, y, r: rad, color, loose };
  }

  scatterPts(seed: number, rmul: number): Pt[] {
    const r = rng(seed);
    const pts: Pt[] = [];
    for (let n = 0; n < this.N; n++) {
      pts.push([r() * this.W, r() * this.Hh, (1 + r() * 1.8) * rmul]);
    }
    return pts;
  }

  namePts(lines: HTMLElement[]): Pt[] {
    const W = Math.max(1, Math.round(this.W));
    const H = Math.max(1, Math.round(this.Hh));
    if (W < 2 || H < 2) return [];
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const c = off.getContext('2d');
    if (!c) return [];
    c.fillStyle = '#000';
    for (const l of lines) {
      const rc = l.getBoundingClientRect();
      const cs = getComputedStyle(l);
      c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      c.letterSpacing = cs.letterSpacing;
      const m = c.measureText('THEERAKARN');
      const asc =
        m.fontBoundingBoxAscent || Number.parseFloat(cs.fontSize) * 0.8;
      const des =
        m.fontBoundingBoxDescent || Number.parseFloat(cs.fontSize) * 0.2;
      c.fillText(
        (l.textContent ?? '').trim(),
        rc.left,
        rc.top + (rc.height - (asc + des)) / 2 + asc,
      );
    }
    const data = c.getImageData(0, 0, W, H).data;
    let step = 3;
    let pts: Pt[];
    do {
      step++;
      pts = [];
      for (let y = 0; y < H; y += step) {
        for (let x = (y / step) % 2 ? step / 2 : 0; x < W; x += step) {
          if (data[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] > 128) {
            pts.push([x, y, step * 0.44]);
          }
        }
      }
    } while (pts.length > this.N && step < 40);
    return pts;
  }

  htPts(el: Element): Pt[] {
    const rc = el.getBoundingClientRect();
    const circ = el.tagName.toLowerCase() === 'circle';
    const area = circ ? Math.PI * (rc.width / 2) ** 2 : rc.width * rc.height;
    const s = Math.max(this.mobile ? 6 : 8, Math.sqrt(area / this.N) * 1.02);
    const cx = rc.left + rc.width / 2;
    const cy = rc.top + rc.height / 2;
    const R = rc.width / 2;
    const pts: Pt[] = [];
    for (let j = 0, y = rc.top + s / 2; y < rc.bottom; j++, y += s * 0.866) {
      for (let x = rc.left + (j % 2 ? s : s / 2); x < rc.right; x += s) {
        if (circ) {
          const d = Math.hypot(x - cx, y - cy);
          if (d > R) continue;
          pts.push([x, y, s * 0.5 * (0.28 + 0.72 * (1 - d / R) ** 0.7)]);
        } else {
          pts.push([
            x,
            y,
            s * 0.5 * (0.25 + 0.75 * (1 - (y - rc.top) / rc.height)),
          ]);
        }
      }
    }
    return pts;
  }

  buildFormations(stages: HTMLElement[], S: number[], H: number[]): void {
    if (!this.N || !this.ctx) return;
    const K = INK;
    const scP = this.scatterPts(11, 1);
    const sc = (c: RGB) => this.mk(scP.slice(), c, 7, 3);
    const drift = this.mk(this.scatterPts(5, 1), K.black, 22, 3);
    const off = this.mk(
      scP.map((p): Pt => [p[0], p[1], 0]),
      K.black,
      4,
      3,
    );
    const name = this.mk(
      this.namePts(
        Array.from(stages[0].querySelectorAll<HTMLElement>('[data-name-line]')),
      ),
      K.black,
      0.4,
      9,
    );
    const ht = (i: number, c: RGB) => {
      const el = stages[i].querySelector('[data-ht]');
      return this.mk(el ? this.htPts(el) : [], c, 0.5, 20 + i);
    };
    const at = (i: number, f: number) => S[i] + H[i] * f;
    const keys: [number, Formation][] = [
      [0, drift],
      [at(0, 0.5), name],
      [at(0, 0.92), name],
      [at(1, 0.16), sc(K.black)],
    ];
    const prem = ht(1, K.black);
    keys.push([at(1, 0.42), prem], [at(1, 0.84), prem]);
    for (let r = 2; r <= 5; r++) {
      const f = ht(r, K[r]);
      keys.push([S[r], sc(K[r])], [at(r, 0.3), f], [at(r, 0.8), f]);
    }
    keys.push([S[6], sc(K[5])], [at(6, 0.22), off], [S[8] + H[8], off]);
    this.keys = keys.map(([s, f]) => ({ s, f }));
  }

  draw(now: number, y: number): void {
    const k = this.keys;
    const ctx = this.ctx;
    if (!k || !ctx) return;
    let i = 0;
    while (i < k.length - 2 && y >= k[i + 1].s) i++;
    const A = k[i].f;
    const B = k[i + 1].f;
    let p = (y - k[i].s) / Math.max(1, k[i + 1].s - k[i].s);
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.Hh);
    if (A === B && A.r[0] === 0 && A === k[k.length - 1].f) return;
    const ca = A.color;
    const cb = B.color;
    ctx.fillStyle = `rgb(${(ca[0] + (cb[0] - ca[0]) * p) | 0},${(ca[1] + (cb[1] - ca[1]) * p) | 0},${(ca[2] + (cb[2] - ca[2]) * p) | 0})`;
    ctx.beginPath();
    const t = now * 0.001;
    const same = A === B;
    const N = this.N;
    const TAU = 6.2832;
    for (let n = 0; n < N; n++) {
      let q = same ? 1 : p * 1.6 - this.delay[n] * 0.6;
      q = q < 0 ? 0 : q > 1 ? 1 : q;
      q = q * q * (3 - 2 * q);
      const r = A.r[n] + (B.r[n] - A.r[n]) * q;
      if (r < 0.35) continue;
      const sw = Math.sin(q * Math.PI) * this.swirl[n];
      const lo = A.loose + (B.loose - A.loose) * q;
      const ph = this.ph[n];
      const x =
        A.x[n] +
        (B.x[n] - A.x[n]) * q +
        Math.cos(this.ang[n]) * sw +
        Math.sin(t * 0.7 + ph) * lo;
      const yy =
        A.y[n] +
        (B.y[n] - A.y[n]) * q +
        Math.sin(this.ang[n]) * sw +
        Math.cos(t * 0.6 + ph * 1.3) * lo;
      ctx.moveTo(x + r, yy);
      ctx.arc(x, yy, r, 0, TAU);
    }
    ctx.fill();
  }
}
