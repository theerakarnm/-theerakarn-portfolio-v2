
const NAMES=['Opening titles','Premise','Tenerie','MunMuang','Buddy Glasses','FridayMerch','How I work','End credits','Contact'];
const INK={black:[17,17,17],2:[249,52,39],3:[124,58,237],4:[232,112,42],5:[26,87,255]};
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

class Component extends DCLogic {
  rootRef = React.createRef();
  renderVals(){ return { root: this.rootRef }; }

  componentDidMount(){ this.alive=true; this.lang=this.lang||'th'; this.gen=(this.gen||0)+1; this.wait(this.gen); }
  componentWillUnmount(){ this.alive=false; this.teardown(); }
  componentDidUpdate(prev){
    if(!this.ready) return;
    const p=this.props;
    if(prev.grain!==p.grain||prev.misregistration!==p.misregistration) this.applyTweaks();
    if(prev.density!==p.density && !this.reduced){ this.allocParticles(); this.buildFormations(); }
  }

  wait(gen){
    const ok=()=>window.gsap&&window.ScrollTrigger&&window.DrawSVGPlugin&&window.Lenis&&this.rootRef.current&&innerWidth>0&&innerHeight>0;
    const tick=()=>{
      if(!this.alive||gen!==this.gen) return;
      if(!ok()) return setTimeout(tick,50);
      const f=document.fonts;
      const loads=f?Promise.all([f.load('700 80px Anuphan','THEERAKARN ก'),f.load('400 16px Anuphan','ก'),f.load('500 14px "IBM Plex Mono"')]):Promise.resolve();
      Promise.race([loads,new Promise(r=>setTimeout(r,2500))]).catch(()=>{}).then(()=>{
        if(!this.alive||gen!==this.gen||this.inited) return;
        try{ this.init(); }catch(e){ console.error('Showreel init failed',e); }
      });
    };
    tick();
  }

  q(s,el){ return Array.from((el||this.root).querySelectorAll(s)); }

  init(){
    const root=this.root=this.rootRef.current; if(!root) return;
    const prev=window.__showreel; if(prev&&prev!==this){ try{ prev.alive=false; prev.teardown(); }catch(e){} }
    window.__showreel=this;
    this.inited=true;
    this.G=window.gsap; this.ST=window.ScrollTrigger;
    this.G.registerPlugin(this.ST,window.DrawSVGPlugin);
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mobile=innerWidth<700;
    this.sections=this.q('[data-scene]');
    this.stages=this.sections.map(s=>s.querySelector('[data-stage]'));
    this.counter=root.querySelector('[data-counter]');
    this.sceneName=root.querySelector('[data-scene-name]');
    this.canvas=root.querySelector('[data-particles]');
    this.q('[data-l="th"]').forEach(el=>{ el.style.letterSpacing='0'; el.style.textTransform='none'; });
    this.split();
    this.setLang(this.lang,false);
    this.bindUI();
    this.applyTweaks();
    this.cur=-1;
    if(this.reduced){ this.staticMode(); this.ready=true; return; }

    this.sections.forEach(s=>{ s.style.height=(this.mobile?s.dataset.m:s.dataset.h)+'vh'; });
    this.stages.forEach(st=>Object.assign(st.style,{position:'fixed',top:'0',left:'0',width:'100%',height:'100vh',visibility:'hidden',zIndex:'1'}));
    this.q('[data-ht]').forEach(el=>el.style.opacity='0');

    this.lenis=new Lenis({lerp:0.11});
    this.lenis.on('scroll',()=>{ this.ST.update(); this.onScroll(); });
    this.rafFn=(t)=>{ this.lenis.raf(t*1000); this.draw(t*1000); };
    this.G.ticker.add(this.rafFn); this.G.ticker.lagSmoothing(0); this.G.ticker.fps(60);

    this.buildTimelines();
    this.onRefresh=()=>{ this.measure(); this.sizeCanvas(); try{ this.buildFormations(); }catch(e){ console.warn('formations',e); } this.onScroll(true); };
    this.ST.addEventListener('refresh',this.onRefresh);
    let rt; this.onResize=()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(this.ready&&this.ST) this.ST.refresh(); },150); };
    addEventListener('resize',this.onResize);
    if(window.ResizeObserver){ let lw=innerWidth,lh=innerHeight; this.ro=new ResizeObserver(()=>{ if(innerWidth!==lw||innerHeight!==lh){ lw=innerWidth; lh=innerHeight; this.onResize(); } }); this.ro.observe(document.documentElement); }
    this.allocParticles();
    this.tls.forEach(t=>{ t.progress(1,true); t.progress(0,true); });
    this.ST.refresh();
    this.ST.update();
    this.ready=true;
  }

  teardown(){
    if(!this.inited) return;
    this.inited=false; this.ready=false;
    if(window.__showreel===this) window.__showreel=null;
    if(this.onResize) removeEventListener('resize',this.onResize);
    if(this.ro){ this.ro.disconnect(); this.ro=null; }
    if(window.ScrollTrigger&&this.onRefresh) this.ST.removeEventListener('refresh',this.onRefresh);
    (this.tls||[]).forEach(t=>{ try{ t.revert(); }catch(e){ t.kill(); } });
    this.tls=[];
    if(this.rafFn&&this.G) this.G.ticker.remove(this.rafFn);
    if(this.lenis){ this.lenis.destroy(); this.lenis=null; }
    if(this.onNativeScroll) removeEventListener('scroll',this.onNativeScroll);
    (this.stages||[]).forEach(st=>{ ['position','top','left','width','height','visibility','zIndex'].forEach(k=>st.style[k]=''); st.style.position='sticky'; st.style.top='0'; st.style.height='100vh'; });
    (this.sections||[]).forEach(s=>s.style.height=s.dataset.h+'vh');
    if(this.root) this.q('[data-ht]').forEach(el=>el.style.opacity='');
    this.keys=null;
  }

  split(){
    const W=new Intl.Segmenter('th',{granularity:'word'}), G=new Intl.Segmenter('th',{granularity:'grapheme'});
    this.q('[data-split]').forEach(el=>{
      if(el.dataset.done) return; el.dataset.done='1';
      const txt=el.textContent.replace(/\s+/g,' ').trim();
      const seg=el.dataset.split==='char'?G:W;
      el.textContent='';
      let prev=null;
      for(const {segment} of seg.segment(txt)){
        if(/^\s+$/.test(segment)){ if(prev) prev.style.marginRight='0.3em'; continue; }
        const s=document.createElement('span'); s.dataset.w=''; s.style.display='inline-block'; s.textContent=segment; el.appendChild(s); prev=s;
      }
    });
  }

  setLang(l,refresh=true){
    this.lang=l; document.documentElement.lang=l;
    this.q('[data-l]').forEach(el=>{
      if(el.dataset.d==null) el.dataset.d = el.dataset.l==='th' ? el.style.display : '';
      el.style.display = el.dataset.l===l ? el.dataset.d : 'none';
    });
    this.q('[data-lang-btn]').forEach(b=>{ const on=b.dataset.langBtn===l; b.style.background=on?'#111':'transparent'; b.style.color=on?'#F2EFE8':'#111'; });
    if(refresh&&!this.reduced&&window.ScrollTrigger) this.ST.refresh();
  }

  bindUI(){
    if(this.root.dataset.bound) return; this.root.dataset.bound='1';
    this.q('[data-lang-btn]').forEach(b=>b.addEventListener('click',()=>this.setLang(b.dataset.langBtn)));
    const skip=this.root.querySelector('[data-skip]');
    skip.addEventListener('click',e=>{
      e.preventDefault();
      if(this.lenis) this.lenis.scrollTo(document.documentElement.scrollHeight,{duration:2.2});
      else window.scrollTo({top:this.sections[8].offsetTop});
    });
  }

  applyTweaks(){
    const g=this.root.querySelector('[data-grain]'); if(g) g.style.display=(this.props.grain??true)?'':'none';
    const m=this.props.misregistration??2;
    this.q('[data-key]').forEach(el=>{ el.style.marginLeft=m+'px'; el.style.marginTop=(m*0.6)+'px'; });
  }

  staticMode(){
    this.canvas.style.display='none';
    this.sections.forEach(s=>{ s.style.height='auto'; });
    this.stages.forEach((st,i)=>{ st.style.position='relative'; if(i===7){ st.style.height='auto'; } });
    this.q('[data-film],[data-hint]').forEach(el=>el.style.display='none');
    const n=this.root.querySelector('[data-name]'); n.style.color='#111';
    this.q('[data-count]').forEach(el=>el.textContent='00:00:00:00');
    this.onNativeScroll=()=>this.onScroll(); addEventListener('scroll',this.onNativeScroll,{passive:true});
    this.measure(); this.onScroll(true);
  }

  measure(){
    const y=window.scrollY;
    this.S=this.sections.map(s=>s.getBoundingClientRect().top+y);
    this.H=this.sections.map(s=>s.offsetHeight);
    this.vh=innerHeight;
  }

  onScroll(force){
    if(!this.S) return;
    const y=window.scrollY; this.y=y;
    let idx=0; for(let i=0;i<this.S.length;i++) if(y>=this.S[i]-2) idx=i;
    if(idx!==this.cur||force){
      this.cur=idx;
      if(!this.reduced) this.stages.forEach((s,i)=>s.style.visibility=i===idx?'visible':'hidden');
      this.counter.textContent=String(idx).padStart(2,'0');
      this.sceneName.textContent=NAMES[idx];
    }
  }

  buildTimelines(){
    const q=(s,el)=>this.q(s,el);
    this.tls=[];
    const last=this.sections.length-1;
    this.sections.forEach((sec,i)=>{
      const st=this.stages[i];
      const tl=this.G.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:sec,start:'top top',end:i===last?'bottom bottom':'bottom top',scrub:true,invalidateOnRefresh:true}});
      tl.set({}, {}, 1);
      if(i===0) this.tlOpening(tl,st,q);
      else if(i===1) this.tlPremise(tl,st,q);
      else if(i>=2&&i<=5) this.tlReel(tl,st,q,sec.dataset.kind);
      else if(i===6) this.tlHow(tl,st,q);
      else if(i===7) this.tlCredits(tl,st,q);
      else this.tlCta(tl,st,q);
      this.tls.push(tl);
    });
  }

  tlOpening(tl,st,q){
    tl.to(q('[data-hint]',st),{opacity:0,duration:.04},0);
    q('[data-film]',st).forEach((f,k)=>{
      const at=.05+k*.24;
      tl.fromTo(f,{opacity:0,letterSpacing:'.6em'},{opacity:1,letterSpacing:'.3em',duration:.08,ease:'power2.out'},at)
        .to(f,{opacity:0,duration:.05},at+.15);
    });
    tl.from(q('[data-name] [data-w]',st),{scaleY:0,transformOrigin:'50% 100%',duration:.1,stagger:{amount:.14,from:'random'},ease:'power3.out'},.58);
    tl.from(q('[data-role] [data-w]',st),{opacity:0,x:-14,duration:.05,stagger:{amount:.07}},.8);
  }

  tlPremise(tl,st,q){
    const a=q('[data-pa]',st),b=q('[data-pb]',st),p=q('[data-pplus]',st);
    tl.from(a,{xPercent:-110,duration:.2,ease:'power3.out'},.08)
      .from(p,{scale:0,rotation:-90,duration:.14,ease:'back.out(1.6)'},.24)
      .from(b,{xPercent:110,duration:.2,ease:'power3.out'},.3)
      .from(q('[data-psub] [data-w]',st),{opacity:0,duration:.04,stagger:{amount:.08}},.48)
      .to(a,{x:()=>-innerWidth*.3,opacity:0,duration:.14,ease:'power2.in'},.86)
      .to(b,{x:()=>innerWidth*.3,opacity:0,duration:.14,ease:'power2.in'},.86)
      .to(p,{scale:0,rotation:90,duration:.12,ease:'power2.in'},.86)
      .to(q('[data-psub]',st),{opacity:0,duration:.08},.86);
  }

  tlReel(tl,st,q,kind){
    const ink=q('[data-ink]',st),key=q('[data-key]',st);
    tl.from(ink,{x:-140,y:-30,opacity:0,duration:.12,ease:'power3.out'},.03)
      .from(key,{x:140,y:30,opacity:0,duration:.12,ease:'power3.out'},.11)
      .from(q('[data-title] [data-w]',st),{yPercent:90,rotation:8,opacity:0,transformOrigin:'0% 100%',duration:.1,stagger:{amount:.08},ease:'power3.out'},.17)
      .from(q('[data-desc] [data-w]',st),{opacity:0,duration:.03,stagger:{amount:.09}},.28)
      .from(q('[data-meta] > *',st),{x:-24,opacity:0,duration:.05,stagger:.02},.33)
      .from(q('[data-link]',st),{scaleX:0,transformOrigin:'0% 50%',duration:.06,ease:'power2.out'},.4);
    if(kind==='tenerie'){
      const bars=q('[data-bar]',st);
      tl.from(bars,{scaleY:0,transformOrigin:'50% 50%',duration:.08,stagger:{amount:.1,from:'center'},ease:'back.out(2)'},.16)
        .to(bars,{scaleY:i=>[.35,1.25,.6,1.1,.45][i%5],transformOrigin:'50% 50%',duration:.1,stagger:{amount:.14,from:'edges'},ease:'sine.inOut'},.46)
        .to(bars,{scaleY:1,duration:.08,stagger:{amount:.08,from:'center'}},.64)
        .from(q('[data-dot]',st),{scale:0,transformOrigin:'50% 50%',duration:.05,ease:'back.out(3)'},.22);
    }
    if(kind==='munmuang'){
      tl.fromTo(q('[data-messy]',st),{opacity:1},{opacity:0,y:-6,duration:.05,stagger:.05},.46)
        .from(q('[data-clean]',st),{opacity:0,y:6,duration:.05,stagger:.05},.49);
    }
    if(kind==='buddy'){
      tl.from(q('[data-row]',st),{scaleX:0,opacity:0,transformOrigin:'50% 50%',duration:.06,stagger:.035,ease:'power3.out'},.18);
    }
    if(kind==='friday'){
      const els=q('[data-count]',st), total=7*86400, o={v:0};
      const fmt=v=>{ let s=Math.round(total*(1-v)); const d=Math.floor(s/86400); s-=d*86400; const h=Math.floor(s/3600); s-=h*3600; const m=Math.floor(s/60); s-=m*60; return [d,h,m,s].map(n=>String(n).padStart(2,'0')).join(':'); };
      els.forEach(e=>e.textContent=fmt(0));
      tl.to(o,{v:1,duration:.55,onUpdate:()=>{ const t=fmt(o.v); els.forEach(e=>e.textContent=t); }},.2);
      tl.fromTo(q('[data-tilt]',st),{xPercent:i=>i%2?-18:0},{xPercent:i=>i%2?0:-18,duration:.8},.08);
    }
    tl.to(ink,{x:()=>innerWidth*.28,y:-20,opacity:0,duration:.17,ease:'power2.in'},.82)
      .to(key,{x:()=>-innerWidth*.28,y:20,opacity:0,duration:.17,ease:'power2.in'},.82)
      .to(q('[data-text]',st),{opacity:0,x:-30,duration:.1,ease:'power2.in'},.86);
  }

  tlHow(tl,st,q){
    tl.from(q('[data-howtitle] [data-w]',st),{yPercent:80,opacity:0,duration:.08,stagger:.03,ease:'power3.out'},.03);
    q('[data-step]',st).forEach((row,k)=>{
      const at=.1+k*.17;
      tl.from(q('[data-draw]',row),{drawSVG:0,duration:.12,ease:'power1.inOut'},at)
        .from(q('[data-fill]',row),{scale:0,transformOrigin:'50% 50%',duration:.07,ease:'back.out(2)'},at+.08)
        .from(row.children[1],{x:-30,opacity:0,duration:.07,ease:'power2.out'},at+.06)
        .from(q('[data-rule]',row),{drawSVG:0,duration:.1},at+.1);
    });
    tl.to(q('[data-text]',st),{opacity:0,duration:.08},.9);
  }

  tlCredits(tl,st,q){
    const roll=st.querySelector('[data-roll]');
    tl.fromTo(roll,{y:()=>innerHeight},{y:()=>-roll.offsetHeight,duration:1},0);
  }

  tlCta(tl,st,q){
    tl.from(q('[data-ink]',st),{scale:0,opacity:0,transformOrigin:'50% 50%',duration:.14,stagger:.06,ease:'back.out(1.4)'},.04)
      .from(q('[data-cta] [data-w]',st),{yPercent:90,rotation:6,opacity:0,transformOrigin:'0% 100%',duration:.12,stagger:.06,ease:'power3.out'},.12)
      .from(q('[data-btn]',st),{x:-40,opacity:0,duration:.08,stagger:.04,ease:'power2.out'},.32);
  }

  allocParticles(){
    const d=this.props.density??1;
    const N=this.N=Math.round((this.mobile?650:1700)*d);
    const r=rng(7);
    this.delay=new Float32Array(N); this.ang=new Float32Array(N); this.swirl=new Float32Array(N); this.ph=new Float32Array(N);
    for(let i=0;i<N;i++){ this.delay[i]=r(); this.ang[i]=r()*Math.PI*2; this.swirl[i]=20+r()*90; this.ph[i]=r()*100; }
  }

  sizeCanvas(){
    const c=this.canvas, dpr=this.dpr=Math.min(devicePixelRatio||1,this.mobile?1.5:2);
    this.W=Math.max(1,document.documentElement.clientWidth||innerWidth); this.Hh=Math.max(1,innerHeight||document.documentElement.clientHeight);
    c.width=Math.round(this.W*dpr); c.height=Math.round(this.Hh*dpr);
    this.ctx=c.getContext('2d');
  }

  mk(pts,color,loose,seed){
    const N=this.N, r=rng(seed||1);
    for(let i=pts.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); const t=pts[i]; pts[i]=pts[j]; pts[j]=t; }
    const x=new Float32Array(N),y=new Float32Array(N),rad=new Float32Array(N);
    for(let n=0;n<N;n++){
      if(n<pts.length){ x[n]=pts[n][0]; y[n]=pts[n][1]; rad[n]=pts[n][2]; }
      else if(pts.length){ const p=pts[n%pts.length]; x[n]=p[0]; y[n]=p[1]; rad[n]=0; }
      else { x[n]=r()*this.W; y[n]=r()*this.Hh; rad[n]=0; }
    }
    return {x,y,r:rad,color,loose};
  }

  scatterPts(seed,rmul){
    const r=rng(seed), pts=[];
    for(let n=0;n<this.N;n++) pts.push([r()*this.W, r()*this.Hh, (1+r()*1.8)*rmul]);
    return pts;
  }

  namePts(){
    const lines=this.q('[data-name-line]',this.stages[0]); const W=Math.max(1,Math.round(this.W)),H=Math.max(1,Math.round(this.Hh));
    if(W<2||H<2) return [];
    const off=document.createElement('canvas'); off.width=W; off.height=H;
    const c=off.getContext('2d'); c.fillStyle='#000';
    lines.forEach(l=>{
      const rc=l.getBoundingClientRect(), cs=getComputedStyle(l);
      c.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      try{ c.letterSpacing=cs.letterSpacing; }catch(e){}
      const m=c.measureText('THEERAKARN');
      const asc=m.fontBoundingBoxAscent||parseFloat(cs.fontSize)*.8, des=m.fontBoundingBoxDescent||parseFloat(cs.fontSize)*.2;
      c.fillText(l.textContent.trim(), rc.left, rc.top+(rc.height-(asc+des))/2+asc);
    });
    const data=c.getImageData(0,0,W,H).data;
    let step=3, pts;
    do { step++; pts=[];
      for(let y=0;y<H;y+=step) for(let x=(y/step)%2?step/2:0;x<W;x+=step){ if(data[(Math.floor(y)*W+Math.floor(x))*4+3]>128) pts.push([x,y,step*.44]); }
    } while(pts.length>this.N && step<40);
    return pts;
  }

  htPts(el){
    const rc=el.getBoundingClientRect(); const circ=el.tagName.toLowerCase()==='circle';
    const area=circ?Math.PI*(rc.width/2)**2:rc.width*rc.height;
    const s=Math.max(this.mobile?6:8, Math.sqrt(area/this.N)*1.02);
    const cx=rc.left+rc.width/2, cy=rc.top+rc.height/2, R=rc.width/2, pts=[];
    for(let j=0,y=rc.top+s/2;y<rc.bottom;j++,y+=s*.866){
      for(let x=rc.left+(j%2?s:s/2);x<rc.right;x+=s){
        if(circ){ const d=Math.hypot(x-cx,y-cy); if(d>R) continue; pts.push([x,y,s*.5*(.28+.72*Math.pow(1-d/R,.7))]); }
        else pts.push([x,y,s*.5*(.25+.75*(1-(y-rc.top)/rc.height))]);
      }
    }
    return pts;
  }

  buildFormations(){
    if(!this.S||!this.N||!this.ctx) return;
    const K=INK, scP=this.scatterPts(11,1);
    const sc=c=>this.mk(scP.slice(),c,7,3);
    const drift=this.mk(this.scatterPts(5,1),K.black,22,3);
    const off=this.mk(scP.map(p=>[p[0],p[1],0]),K.black,4,3);
    const name=this.mk(this.namePts(),K.black,.4,9);
    const ht=(i,c)=>{ const el=this.stages[i].querySelector('[data-ht]'); return this.mk(el?this.htPts(el):[],c,.5,20+i); };
    const S=this.S,H=this.H,at=(i,f)=>S[i]+H[i]*f;
    const keys=[[0,drift],[at(0,.5),name],[at(0,.92),name],[at(1,.16),sc(K.black)]];
    const prem=ht(1,K.black); keys.push([at(1,.42),prem],[at(1,.84),prem]);
    for(let r=2;r<=5;r++){ const f=ht(r,K[r]); keys.push([S[r],sc(K[r])],[at(r,.3),f],[at(r,.8),f]); }
    keys.push([S[6],sc(K[5])],[at(6,.22),off],[S[8]+H[8],off]);
    this.keys=keys.map(([s,f])=>({s,f}));
  }

  draw(now){
    const k=this.keys, ctx=this.ctx; if(!k||!ctx) return;
    const y=this.y||0; let i=0; while(i<k.length-2&&y>=k[i+1].s) i++;
    const A=k[i].f,B=k[i+1].f; let p=(y-k[i].s)/Math.max(1,k[i+1].s-k[i].s); p=p<0?0:p>1?1:p;
    const dpr=this.dpr; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,this.W,this.Hh);
    if(A===B&&A.r[0]===0&&A===k[k.length-1].f) return;
    const ca=A.color,cb=B.color;
    ctx.fillStyle=`rgb(${ca[0]+(cb[0]-ca[0])*p|0},${ca[1]+(cb[1]-ca[1])*p|0},${ca[2]+(cb[2]-ca[2])*p|0})`;
    ctx.beginPath();
    const t=now*.001, same=A===B, N=this.N, TAU=6.2832;
    for(let n=0;n<N;n++){
      let q=same?1:(p*1.6-this.delay[n]*.6); q=q<0?0:q>1?1:q; q=q*q*(3-2*q);
      const r=A.r[n]+(B.r[n]-A.r[n])*q; if(r<.35) continue;
      const sw=Math.sin(q*Math.PI)*this.swirl[n], lo=A.loose+(B.loose-A.loose)*q, ph=this.ph[n];
      const x=A.x[n]+(B.x[n]-A.x[n])*q+Math.cos(this.ang[n])*sw+Math.sin(t*.7+ph)*lo;
      const yy=A.y[n]+(B.y[n]-A.y[n])*q+Math.sin(this.ang[n])*sw+Math.cos(t*.6+ph*1.3)*lo;
      ctx.moveTo(x+r,yy); ctx.arc(x,yy,r,0,TAU);
    }
    ctx.fill();
  }
}
