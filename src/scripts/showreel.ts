import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Particles } from './particles';

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

const NAMES = [
  'Opening titles',
  'Premise',
  'Tenerie',
  'MunMuang',
  'Buddy Glasses',
  'FridayMerch',
  'How I work',
  'End credits',
  'Contact',
];
// The reference exposed these as editor props; the site ships their defaults.
const DENSITY = 1;
const MISREG = 2;
const GRAIN = true;

type Q = <T extends Element = HTMLElement>(s: string, el?: Element) => T[];

class Showreel {
  alive = true;
  private inited = false;
  private ready = false;
  private reduced = false;
  private mobile = false;
  private sections: HTMLElement[] = [];
  private stages: HTMLElement[] = [];
  private counter!: HTMLElement;
  private sceneName!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private particles: Particles | null = null;
  private S: number[] | null = null;
  private H: number[] = [];
  private y = 0;
  private cur = -1;
  private tls: gsap.core.Timeline[] = [];
  private lenis: Lenis | null = null;
  private rafFn: ((t: number) => void) | null = null;
  private onRefresh: (() => void) | null = null;
  private onResize: (() => void) | null = null;
  private ro: ResizeObserver | null = null;
  private onNativeScroll: (() => void) | null = null;
  private onSkip: ((e: Event) => void) | null = null;

  constructor(private readonly root: HTMLElement) {}

  private q: Q = (s, el) => Array.from((el ?? this.root).querySelectorAll(s));

  private one<T extends Element = HTMLElement>(s: string, el?: Element): T {
    const found = (el ?? this.root).querySelector<T>(s);
    if (!found) throw new Error(`Showreel: missing ${s}`);
    return found;
  }

  init(): void {
    this.inited = true;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mobile = innerWidth < 700;
    this.sections = this.q('[data-scene]');
    this.stages = this.sections.map((s) => this.one('[data-stage]', s));
    this.counter = this.one('[data-counter]');
    this.sceneName = this.one('[data-scene-name]');
    this.canvas = this.one<HTMLCanvasElement>('[data-particles]');
    this.bindUI();
    this.applyTweaks();
    this.cur = -1;
    if (this.reduced) {
      this.staticMode();
      this.ready = true;
      return;
    }

    for (const s of this.sections) {
      s.style.height = `${this.mobile ? s.dataset.m : s.dataset.h}vh`;
    }
    for (const st of this.stages) {
      Object.assign(st.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100vh',
        visibility: 'hidden',
        zIndex: '1',
      });
    }
    for (const el of this.q<SVGElement>('[data-ht]')) el.style.opacity = '0';

    const particles = new Particles(this.canvas, this.mobile);
    this.particles = particles;
    const lenis = new Lenis({ lerp: 0.11 });
    this.lenis = lenis;
    lenis.on('scroll', () => {
      ScrollTrigger.update();
      this.onScroll();
    });
    this.rafFn = (t) => {
      lenis.raf(t * 1000);
      particles.draw(t * 1000, this.y);
    };
    gsap.ticker.add(this.rafFn);
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.fps(60);

    this.buildTimelines();
    this.onRefresh = () => {
      this.measure();
      particles.sizeCanvas();
      try {
        if (this.S) particles.buildFormations(this.stages, this.S, this.H);
      } catch (e) {
        console.warn('formations', e);
      }
      this.onScroll(true);
    };
    ScrollTrigger.addEventListener('refresh', this.onRefresh);
    let rt: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (this.ready) ScrollTrigger.refresh();
      }, 150);
    };
    this.onResize = onResize;
    addEventListener('resize', onResize);
    let lw = innerWidth;
    let lh = innerHeight;
    this.ro = new ResizeObserver(() => {
      if (innerWidth !== lw || innerHeight !== lh) {
        lw = innerWidth;
        lh = innerHeight;
        onResize();
      }
    });
    this.ro.observe(document.documentElement);
    particles.allocParticles(DENSITY);
    for (const t of this.tls) {
      t.progress(1, true);
      t.progress(0, true);
    }
    ScrollTrigger.refresh();
    ScrollTrigger.update();
    this.ready = true;
  }

  teardown(): void {
    if (!this.inited) return;
    this.inited = false;
    this.ready = false;
    if (this.onResize) removeEventListener('resize', this.onResize);
    if (this.ro) {
      this.ro.disconnect();
      this.ro = null;
    }
    if (this.onRefresh)
      ScrollTrigger.removeEventListener('refresh', this.onRefresh);
    for (const t of this.tls) t.revert();
    this.tls = [];
    if (this.rafFn) gsap.ticker.remove(this.rafFn);
    if (this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    }
    if (this.onNativeScroll) removeEventListener('scroll', this.onNativeScroll);
    if (this.onSkip)
      this.one('[data-skip]').removeEventListener('click', this.onSkip);
    for (const st of this.stages) {
      for (const k of [
        'position',
        'top',
        'left',
        'width',
        'height',
        'visibility',
        'z-index',
      ]) {
        st.style.removeProperty(k);
      }
      st.style.position = 'sticky';
      st.style.top = '0';
      st.style.height = '100vh';
    }
    for (const s of this.sections) s.style.height = `${s.dataset.h}vh`;
    for (const el of this.q<SVGElement>('[data-ht]')) el.style.opacity = '';
    if (this.particles) this.particles.keys = null;
  }

  private bindUI(): void {
    const skip = this.one('[data-skip]');
    this.onSkip = (e) => {
      e.preventDefault();
      if (this.lenis) {
        this.lenis.scrollTo(document.documentElement.scrollHeight, {
          duration: 2.2,
        });
      } else {
        window.scrollTo({ top: this.sections[8].offsetTop });
      }
    };
    skip.addEventListener('click', this.onSkip);
  }

  private applyTweaks(): void {
    const g = this.root.querySelector<SVGElement>('[data-grain]');
    if (g) g.style.display = GRAIN ? '' : 'none';
    for (const el of this.q('[data-key]')) {
      el.style.marginLeft = `${MISREG}px`;
      el.style.marginTop = `${MISREG * 0.6}px`;
    }
  }

  private staticMode(): void {
    this.canvas.style.display = 'none';
    for (const s of this.sections) s.style.height = 'auto';
    this.stages.forEach((st, i) => {
      st.style.position = 'relative';
      if (i === 7) st.style.height = 'auto';
    });
    for (const el of this.q('[data-film],[data-hint]'))
      el.style.display = 'none';
    this.one('[data-name]').style.color = '#111';
    for (const el of this.q('[data-count]')) el.textContent = '00:00:00:00';
    this.onNativeScroll = () => this.onScroll();
    addEventListener('scroll', this.onNativeScroll, { passive: true });
    this.measure();
    this.onScroll(true);
  }

  /** Re-measure after a late layout change, such as fonts loading after init. */
  relayout(): void {
    if (!this.ready) return;
    if (this.reduced) {
      this.measure();
      this.onScroll(true);
    } else {
      ScrollTrigger.refresh();
    }
  }

  private measure(): void {
    const y = window.scrollY;
    this.S = this.sections.map((s) => s.getBoundingClientRect().top + y);
    this.H = this.sections.map((s) => s.offsetHeight);
  }

  private onScroll(force = false): void {
    if (!this.S) return;
    const y = window.scrollY;
    this.y = y;
    let idx = 0;
    for (let i = 0; i < this.S.length; i++) if (y >= this.S[i] - 2) idx = i;
    if (idx !== this.cur || force) {
      this.cur = idx;
      if (!this.reduced) {
        this.stages.forEach((s, i) => {
          s.style.visibility = i === idx ? 'visible' : 'hidden';
        });
      }
      this.counter.textContent = String(idx).padStart(2, '0');
      this.sceneName.textContent = NAMES[idx];
    }
  }

  private buildTimelines(): void {
    const q = this.q;
    this.tls = [];
    const last = this.sections.length - 1;
    this.sections.forEach((sec, i) => {
      const st = this.stages[i];
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: i === last ? 'bottom bottom' : 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      tl.set({}, {}, 1);
      if (i === 0) this.tlOpening(tl, st, q);
      else if (i === 1) this.tlPremise(tl, st, q);
      else if (i >= 2 && i <= 5) this.tlReel(tl, st, q, sec.dataset.kind);
      else if (i === 6) this.tlHow(tl, st, q);
      else if (i === 7) this.tlCredits(tl, st);
      else this.tlCta(tl, st, q);
      this.tls.push(tl);
    });
  }

  private tlOpening(tl: gsap.core.Timeline, st: HTMLElement, q: Q): void {
    tl.to(q('[data-hint]', st), { opacity: 0, duration: 0.04 }, 0);
    q('[data-film]', st).forEach((f, k) => {
      const at = 0.05 + k * 0.24;
      tl.fromTo(
        f,
        { opacity: 0, letterSpacing: '.6em' },
        {
          opacity: 1,
          letterSpacing: '.3em',
          duration: 0.08,
          ease: 'power2.out',
        },
        at,
      ).to(f, { opacity: 0, duration: 0.05 }, at + 0.15);
    });
    tl.from(
      q('[data-name] [data-w]', st),
      {
        scaleY: 0,
        transformOrigin: '50% 100%',
        duration: 0.1,
        stagger: { amount: 0.14, from: 'random' },
        ease: 'power3.out',
      },
      0.58,
    );
    tl.from(
      q('[data-role] [data-w]', st),
      { opacity: 0, x: -14, duration: 0.05, stagger: { amount: 0.07 } },
      0.8,
    );
  }

  private tlPremise(tl: gsap.core.Timeline, st: HTMLElement, q: Q): void {
    const a = q('[data-pa]', st);
    const b = q('[data-pb]', st);
    const p = q('[data-pplus]', st);
    tl.from(a, { xPercent: -110, duration: 0.2, ease: 'power3.out' }, 0.08)
      .from(
        p,
        { scale: 0, rotation: -90, duration: 0.14, ease: 'back.out(1.6)' },
        0.24,
      )
      .from(b, { xPercent: 110, duration: 0.2, ease: 'power3.out' }, 0.3)
      .from(
        q('[data-psub] [data-w]', st),
        { opacity: 0, duration: 0.04, stagger: { amount: 0.08 } },
        0.48,
      )
      .to(
        a,
        {
          x: () => -innerWidth * 0.3,
          opacity: 0,
          duration: 0.14,
          ease: 'power2.in',
        },
        0.86,
      )
      .to(
        b,
        {
          x: () => innerWidth * 0.3,
          opacity: 0,
          duration: 0.14,
          ease: 'power2.in',
        },
        0.86,
      )
      .to(
        p,
        { scale: 0, rotation: 90, duration: 0.12, ease: 'power2.in' },
        0.86,
      )
      .to(q('[data-psub]', st), { opacity: 0, duration: 0.08 }, 0.86);
  }

  private tlReel(
    tl: gsap.core.Timeline,
    st: HTMLElement,
    q: Q,
    kind: string | undefined,
  ): void {
    const ink = q('[data-ink]', st);
    const key = q('[data-key]', st);
    tl.from(
      ink,
      { x: -140, y: -30, opacity: 0, duration: 0.12, ease: 'power3.out' },
      0.03,
    )
      .from(
        key,
        { x: 140, y: 30, opacity: 0, duration: 0.12, ease: 'power3.out' },
        0.11,
      )
      .from(
        q('[data-title] [data-w]', st),
        {
          yPercent: 90,
          rotation: 8,
          opacity: 0,
          transformOrigin: '0% 100%',
          duration: 0.1,
          stagger: { amount: 0.08 },
          ease: 'power3.out',
        },
        0.17,
      )
      .from(
        q('[data-desc] [data-w]', st),
        { opacity: 0, duration: 0.03, stagger: { amount: 0.09 } },
        0.28,
      )
      .from(
        q('[data-meta] > *', st),
        { x: -24, opacity: 0, duration: 0.05, stagger: 0.02 },
        0.33,
      )
      .from(
        q('[data-link]', st),
        {
          scaleX: 0,
          transformOrigin: '0% 50%',
          duration: 0.06,
          ease: 'power2.out',
        },
        0.4,
      );
    if (kind === 'tenerie') {
      const bars = q<SVGElement>('[data-bar]', st);
      tl.from(
        bars,
        {
          scaleY: 0,
          transformOrigin: '50% 50%',
          duration: 0.08,
          stagger: { amount: 0.1, from: 'center' },
          ease: 'back.out(2)',
        },
        0.16,
      )
        .to(
          bars,
          {
            scaleY: (i: number) => [0.35, 1.25, 0.6, 1.1, 0.45][i % 5],
            transformOrigin: '50% 50%',
            duration: 0.1,
            stagger: { amount: 0.14, from: 'edges' },
            ease: 'sine.inOut',
          },
          0.46,
        )
        .to(
          bars,
          {
            scaleY: 1,
            duration: 0.08,
            stagger: { amount: 0.08, from: 'center' },
          },
          0.64,
        )
        .from(
          q<SVGElement>('[data-dot]', st),
          {
            scale: 0,
            transformOrigin: '50% 50%',
            duration: 0.05,
            ease: 'back.out(3)',
          },
          0.22,
        );
    }
    if (kind === 'munmuang') {
      tl.fromTo(
        q('[data-messy]', st),
        { opacity: 1 },
        { opacity: 0, y: -6, duration: 0.05, stagger: 0.05 },
        0.46,
      ).from(
        q('[data-clean]', st),
        { opacity: 0, y: 6, duration: 0.05, stagger: 0.05 },
        0.49,
      );
    }
    if (kind === 'buddy') {
      tl.from(
        q('[data-row]', st),
        {
          scaleX: 0,
          opacity: 0,
          transformOrigin: '50% 50%',
          duration: 0.06,
          stagger: 0.035,
          ease: 'power3.out',
        },
        0.18,
      );
    }
    if (kind === 'friday') {
      const els = q('[data-count]', st);
      const total = 7 * 86400;
      const o = { v: 0 };
      const fmt = (v: number) => {
        let s = Math.round(total * (1 - v));
        const d = Math.floor(s / 86400);
        s -= d * 86400;
        const h = Math.floor(s / 3600);
        s -= h * 3600;
        const m = Math.floor(s / 60);
        s -= m * 60;
        return [d, h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
      };
      for (const e of els) e.textContent = fmt(0);
      tl.to(
        o,
        {
          v: 1,
          duration: 0.55,
          onUpdate: () => {
            const t = fmt(o.v);
            for (const e of els) e.textContent = t;
          },
        },
        0.2,
      );
      tl.fromTo(
        q('[data-tilt]', st),
        { xPercent: (i: number) => (i % 2 ? -18 : 0) },
        { xPercent: (i: number) => (i % 2 ? 0 : -18), duration: 0.8 },
        0.08,
      );
    }
    tl.to(
      ink,
      {
        x: () => innerWidth * 0.28,
        y: -20,
        opacity: 0,
        duration: 0.17,
        ease: 'power2.in',
      },
      0.82,
    )
      .to(
        key,
        {
          x: () => -innerWidth * 0.28,
          y: 20,
          opacity: 0,
          duration: 0.17,
          ease: 'power2.in',
        },
        0.82,
      )
      .to(
        q('[data-text]', st),
        { opacity: 0, x: -30, duration: 0.1, ease: 'power2.in' },
        0.86,
      );
  }

  private tlHow(tl: gsap.core.Timeline, st: HTMLElement, q: Q): void {
    tl.from(
      q('[data-howtitle] [data-w]', st),
      {
        yPercent: 80,
        opacity: 0,
        duration: 0.08,
        stagger: 0.03,
        ease: 'power3.out',
      },
      0.03,
    );
    q('[data-step]', st).forEach((row, k) => {
      const at = 0.1 + k * 0.17;
      tl.from(
        q<SVGElement>('[data-draw]', row),
        { drawSVG: 0, duration: 0.12, ease: 'power1.inOut' },
        at,
      )
        .from(
          q<SVGElement>('[data-fill]', row),
          {
            scale: 0,
            transformOrigin: '50% 50%',
            duration: 0.07,
            ease: 'back.out(2)',
          },
          at + 0.08,
        )
        .from(
          row.children[1],
          { x: -30, opacity: 0, duration: 0.07, ease: 'power2.out' },
          at + 0.06,
        )
        .from(
          q<SVGElement>('[data-rule]', row),
          { drawSVG: 0, duration: 0.1 },
          at + 0.1,
        );
    });
    tl.to(q('[data-text]', st), { opacity: 0, duration: 0.08 }, 0.9);
  }

  private tlCredits(tl: gsap.core.Timeline, st: HTMLElement): void {
    const roll = this.one('[data-roll]', st);
    tl.fromTo(
      roll,
      { y: () => innerHeight },
      { y: () => -roll.offsetHeight, duration: 1 },
      0,
    );
  }

  private tlCta(tl: gsap.core.Timeline, st: HTMLElement, q: Q): void {
    tl.from(
      q('[data-ink]', st),
      {
        scale: 0,
        opacity: 0,
        transformOrigin: '50% 50%',
        duration: 0.14,
        stagger: 0.06,
        ease: 'back.out(1.4)',
      },
      0.04,
    )
      .from(
        q('[data-cta] [data-w]', st),
        {
          yPercent: 90,
          rotation: 6,
          opacity: 0,
          transformOrigin: '0% 100%',
          duration: 0.12,
          stagger: 0.06,
          ease: 'power3.out',
        },
        0.12,
      )
      .from(
        q('[data-btn]', st),
        {
          x: -40,
          opacity: 0,
          duration: 0.08,
          stagger: 0.04,
          ease: 'power2.out',
        },
        0.32,
      );
  }
}

export function startShowreel(root: HTMLElement): () => void {
  const reel = new Showreel(root);
  const f = document.fonts;
  const loads = Promise.all([
    f.load('700 80px Anuphan', 'THEERAKARN ก'),
    f.load('400 16px Anuphan', 'ก'),
    f.load('500 14px "IBM Plex Mono"'),
  ]);
  let fontsLoaded = false;
  loads.then(
    () => {
      fontsLoaded = true;
    },
    () => {},
  );
  Promise.race([loads, new Promise((r) => setTimeout(r, 2500))])
    .catch(() => {})
    .then(() => {
      if (!reel.alive) return;
      try {
        reel.init();
      } catch (e) {
        console.error('Showreel init failed', e);
        return;
      }
      // Init ran with fallback fonts: measure again once the real ones arrive.
      if (!fontsLoaded) {
        f.ready.then(() => {
          if (reel.alive) reel.relayout();
        });
      }
    });
  return () => {
    reel.alive = false;
    reel.teardown();
  };
}

let stop: (() => void) | null = null;

function start(): void {
  if (stop) return;
  const root = document.querySelector<HTMLElement>('[data-root]');
  if (root) stop = startShowreel(root);
}

start();
window.addEventListener('pagehide', () => {
  stop?.();
  stop = null;
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted) start();
});
