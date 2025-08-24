// ---------- Utilities ----------
    // const ele = (id) => document.getElementById(id);
    const DPR = () => (window.devicePixelRatio || 1);

    // === Colors ===
    const COLOR_ALPHA = '#ff5d6c'; // red (use uvw's red)
    const COLOR_BETA  = '#4aa3ff'; // blue (use uvw's blue)
    const COLOR_TRAIL = '#9dd7ff'; // light trail
    const COLOR_U = '#4aa3ff';
    const COLOR_V = '#7affc5';
    const COLOR_W = '#ff5d6c';
    const COLOR_D = COLOR_ALPHA; // d-axis color
    const COLOR_Q = COLOR_BETA;  // q-axis color

    // 3D layout constants for Clarke wall/floor view
    const WALL_X = 1.75;   // α(t) wall plane position along +α
    const FLOOR_Y = 1.5;  // β(t) floor plane position along -β (we use -FLOOR_Y)
    const AMP_RANGE = 1.2; // visible amplitude range for wall/floor grids

    // Defaults
    const defs = {
      amp: 1, freq: 1, tscale: 1, fe: 1, theta0: 0,
      cycles3D: 1.5,
      ampU:1, ampV:1, ampW:1,
      phiU:-90, phiV:-210, phiW:30,
      offU:0, offV:0, offW:0
    };

    // Bind range + number + reset for each id
    function bindTriple(id){
      const r = document.getElementById(id), n = document.getElementById(id+"_num"), b = document.getElementById(id+"_reset");
      if (!r || !n || !b){
        console.error(`[bindTriple] Missing element(s) for id="ele{id}"`, {r, n, b});
        return { r:null, n:null };
      }
      n.value = r.value; // init
      n.addEventListener('input', ()=>{ r.value = n.value; onInput({target:r}); });
      r.addEventListener('input', ()=>{ n.value = r.value; onInput({target:r}); });
      b.addEventListener('click', ()=>{ r.value = defs[id]; n.value = defs[id]; onInput({target:r}); });
      return {r,n};
    }

    const pairs = {
      amp: bindTriple('amp'),
      freq: bindTriple('freq'),
      tscale: bindTriple('tscale'),
      fe: bindTriple('fe'),
      theta0: bindTriple('theta0'),
      cycles3D: bindTriple('cycles3D'),
      ampU: bindTriple('ampU'),
      ampV: bindTriple('ampV'),
      ampW: bindTriple('ampW'),
      phiU: bindTriple('phiU'),
      phiV: bindTriple('phiV'),
      phiW: bindTriple('phiW'),
      offU: bindTriple('offU'),
      offV: bindTriple('offV'),
      offW: bindTriple('offW'),
    };

    const lock120 = document.getElementById("lock120"), sumZero = document.getElementById("sumZero"), normalize = document.getElementById("normalize"), freeze = document.getElementById("freeze"), syncTheta = document.getElementById("syncTheta");

    // === Global speed throttle ===
    // 값이 작을수록 더 느려집니다. (예: 0.35면 약 3배 느림)
    const SPEED_FACTOR = 0.35;
    function simTime(now){
    return ((now - t0)/1000) * SPEED_FACTOR / +pairs.tscale.r.value;
    }

    // Freeze behavior: capture current time when toggled ON
    freeze.addEventListener('change', ()=>{
      const now = performance.now();
      if (freeze.checked) {
        // tHold = ((now - t0)/1000) / +pairs.tscale.r.value;
        tHold = simTime(now);
      }
    });

    // --- Change tracking (previous vs current while sliding) ---
    let deltaActive = false; // true while user is adjusting (debounced)
    let deltaRef = null;     // {u,v,w,a,b} snapshot at adjustment start
    let deltaTimer = null;

    function snapshotValues(t){
      const [u,v,w] = uvwAt(t);
      const [a,b] = clarke(u,v,w);
      return {u,v,w,a,b};
    }

    function beginDelta(t){
      if (!deltaActive){ deltaRef = snapshotValues(t); deltaActive = true; document.getElementById("deltaBox").style.display = 'flex'; }
      if (deltaTimer) clearTimeout(deltaTimer);
      deltaTimer = setTimeout(()=>{ deltaActive=false; deltaRef=null; document.getElementById("deltaBox").style.display='none'; }, 700);
    }

    function onInput(e){
      const id = e.target.id;
      if (["phiU","phiV","phiW"].includes(id) && lock120.checked){
        if (id==='phiU'){ pairs.phiV.r.value = (+pairs.phiU.r.value - 120); pairs.phiW.r.value = (+pairs.phiU.r.value + 120); }
        if (id==='phiV'){ pairs.phiU.r.value = (+pairs.phiV.r.value + 120); pairs.phiW.r.value = (+pairs.phiV.r.value + 240); }
        if (id==='phiW'){ pairs.phiU.r.value = (+pairs.phiW.r.value - 120); pairs.phiV.r.value = (+pairs.phiW.r.value - 240); }
        pairs.phiV.n.value = pairs.phiV.r.value; pairs.phiW.n.value = pairs.phiW.r.value; pairs.phiU.n.value = pairs.phiU.r.value;
      }
      if (["ampU","ampV","ampW"].includes(id) && lock120.checked){
        const val = document.getElementById(id).value; ['ampU','ampV','ampW'].forEach(k=>{ pairs[k].r.value = val; pairs[k].n.value = val; });
      }
      const now = performance.now();
      const t = freeze.checked ? tHold : (((now - t0)/1000) / +pairs.tscale.r.value);
      beginDelta(t);
    }

    // --- Signals & canvases ---
    const wave = document.getElementById("wave"); const ctxW = wave.getContext('2d');
    const uvwS = document.getElementById("uvwStatic"); const ctxUS = uvwS.getContext('2d');
    const uvw3 = document.getElementById("uvw3D"); const ctxU3 = uvw3.getContext('2d');

    const ab = document.getElementById("alphaBeta"); const ctxA = ab.getContext('2d');
    const abT = document.getElementById("alphabetaTime"); const ctxAT = abT.getContext('2d');
    const ab3 = document.getElementById("alphaBeta3D"); const ctxA3 = ab3.getContext('2d');

    const dqT = document.getElementById("dqTime"); const ctxDT = dqT.getContext('2d');
    const dq3 = document.getElementById("dq3D"); const ctxD3 = dq3.getContext('2d');
    const dqS = document.getElementById("dqStatic"); const ctxDS = dqS.getContext('2d');

    /*
    const inv_abT = document.getElementById("inv_alphaBetaTime"); const ctxIABT = inv_abT.getContext('2d');
    const inv_abS = document.getElementById("inv_alphaBeta"); const ctxIABS = inv_abS.getContext('2d');
    const inv_ab3 = document.getElementById("inv_alphaBeta3D"); const ctxIAB3 = inv_ab3.getContext('2d');

    const inv_uvwT = document.getElementById("inv_uvwTime"); const ctxIuvwT = inv_uvwT.getContext('2d');
    const inv_uvwS = document.getElementById("inv_uvw"); const ctxIuvwS = inv_uvwS.getContext('2d');
    const inv_uvw3 = document.getElementById("inv_uvw3D"); const ctxIuvw3 = inv_uvw3.getContext('2d');

    */

    function resizeCanvas() {
      const ratio = DPR();
      /*
      [wave,ab,abT,ab3,uvw3,uvwS,dqT,dq3,dqS,inv_abT,inv_ab3,inv_abS,inv_uvwT,inv_uvwS,inv_uvw3].forEach(c=>{ const rect = c.getBoundingClientRect(); c.width = Math.max(1, Math.floor(rect.width * ratio)); c.height = Math.max(1, Math.floor(rect.height * ratio)); });
      */
      [wave,ab,abT,ab3,uvw3,uvwS,dqT,dq3,dqS].forEach(c=>{ const rect = c.getBoundingClientRect(); c.width = Math.max(1, Math.floor(rect.width * ratio)); c.height = Math.max(1, Math.floor(rect.height * ratio)); });
    }
      
    addEventListener('resize', resizeCanvas);
*/
    let t0 = 0, tHold = 0;
    function init(){
  
      resizeCanvas();
      t0 = performance.now();
      requestAnimationFrame(tick);
    }

    const deg2rad = d => d * Math.PI/180;

    function uvwAt(t){
      const A0 = +pairs.amp.r.value;
      const u = +pairs.offU.r.value + (+pairs.ampU.r.value || A0) * Math.sin(2*Math.PI*+pairs.freq.r.value * t + deg2rad(+pairs.phiU.r.value));
      const v = +pairs.offV.r.value + (+pairs.ampV.r.value || A0) * Math.sin(2*Math.PI*+pairs.freq.r.value * t + deg2rad(+pairs.phiV.r.value));
      let w = +pairs.offW.r.value + (+pairs.ampW.r.value || A0) * Math.sin(2*Math.PI*+pairs.freq.r.value * t + deg2rad(+pairs.phiW.r.value));
      if (sumZero.checked) w = -(u+v);
      return [u,v,w];
    }

    function clarke(u,v,w){
      const k = normalize.checked ? (2/3) : 1; // power-invariant toggle
      const alpha = k * (u - 0.5*v - 0.5*w);
      const beta  = k * ((Math.sqrt(3)/2) * (v - w));
      return [alpha, beta];
    }

    function uvwVector(u,v,w){
      const x = 0;
      const y  = 0;
      return [x, y];
    }

    function drawGrid(ctx){
      const w = ctx.canvas.width, h = ctx.canvas.height;
      ctx.clearRect(0,0,w,h);
      ctx.lineWidth = 1; ctx.strokeStyle = '#1a2744';
      const step = 40 * DPR();
      ctx.beginPath();
      for(let x=0;x<w;x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,h); }
      for(let y=0;y<h;y+=step){ ctx.moveTo(0,y); ctx.lineTo(w,y); }
      ctx.stroke();
    }

    function drawWave(t){
      const w = ctxW.canvas.width, h = ctxW.canvas.height; drawGrid(ctxW);
      const N = 600;
      const dt = (1/1200) / +pairs.tscale.r.value;
      ctxW.lineWidth = 1.25; ctxW.strokeStyle = '#2b3c63';
      ctxW.beginPath(); ctxW.moveTo(0, h/2); ctxW.lineTo(w, h/2); ctxW.stroke();

      const colors = ['#4aa3ff','#7affc5','#ff5d6c'];
      [[0,'U'],[1,'V'],[2,'W']].forEach(([idx,label])=>{
        ctxW.beginPath();
        for(let i=0;i<N;i++){
          const ti = t - (N-i)*dt;
          const [u,v,wv] = uvwAt(ti);
          const y = [u,v,wv][idx];
          const px = (i/(N-1))*w; const py = h/2 - y * 60 * DPR();
          if(i===0) ctxW.moveTo(px,py); else ctxW.lineTo(px,py);
        }
        ctxW.strokeStyle = colors[idx]; ctxW.lineWidth = 2; ctxW.stroke();
      });
    }

    function drawAxesWithLabels(ctx){
      const w = ctx.canvas.width, h = ctx.canvas.height;
      ctx.save();
      ctx.translate(w/2, h/2);
      // axes
      ctx.strokeStyle = '#2b3c63'; ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.moveTo(-w/2,0); ctx.lineTo(w/2,0); ctx.moveTo(0,-h/2); ctx.lineTo(0,h/2); ctx.stroke();
      // arrows
      ctx.beginPath(); ctx.moveTo(w/2-10, -4); ctx.lineTo(w/2, 0); ctx.lineTo(w/2-10, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -h/2+10); ctx.lineTo(0, -h/2); ctx.lineTo(4, -h/2+10); ctx.stroke();
      // labels
      ctx.fillStyle = '#cfe0ff';
      ctx.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctx.fillText('α (X)', w/2 - 40, -8);
      ctx.fillText('β (Y)', 8, -h/2 + 18);
      ctx.restore();
    }

    function drawAlphaBeta(t){
      const w = ctxA.canvas.width, h = ctxA.canvas.height; drawGrid(ctxA);
      drawAxesWithLabels(ctxA);

      const S = 90 * DPR();
      ctxA.save();
      ctxA.translate(w/2, h/2);

      // ---- 현재 파라미터 기준 한 주기 전체 궤적 (비누적) ----
      const f = Math.max(0, +pairs.freq.r.value);
      let a=0, b=0;
      if (f > 1e-6){
        const T = 1/f;
        const N = 720;
        ctxA.beginPath();
        for (let i=0; i<=N; i++){
          const ti = t - T + (i/N)*T; // [t-T, t]
          const [u,v,wv] = uvwAt(ti);
          const [aa,bb] = clarke(u,v,wv);
          const px = aa * S, py = -bb * S;
          if (i===0) ctxA.moveTo(py,px); else ctxA.lineTo(py,px);
          if (i===N){ a = aa; b = bb; }
        }
        ctxA.strokeStyle = '#9dd7ff'; ctxA.lineWidth = 1.6; ctxA.stroke();
      } else {
        const [u,v,wv] = uvwAt(t); [a,b] = clarke(u,v,wv);
        ctxA.beginPath(); ctxA.arc(a*S, -b*S, 3.5*DPR(), 0, Math.PI*2); ctxA.fillStyle = '#9dd7ff'; ctxA.fill();
      }

      // 현재 벡터(초록색)
      const vx = a * S, vy = -b * S;
      ctxA.beginPath(); ctxA.moveTo(0,0); ctxA.lineTo(vy,vx); ctxA.strokeStyle = '#FFCC00'; ctxA.lineWidth = 2.4; ctxA.stroke();
      ctxA.beginPath(); ctxA.arc(vy,vx,4.5*DPR(),0,Math.PI*2); ctxA.fillStyle = '#FFCC00'; ctxA.fill();

      // α, β 축 값: 축에 붙여 표시 + 벡터팁→축 직각 점선 가이드
      // α (X축)
      ctxA.lineWidth = 2;
      ctxA.beginPath(); ctxA.moveTo(0,0); ctxA.lineTo(0,vx); ctxA.strokeStyle = COLOR_ALPHA; ctxA.stroke();
      ctxA.beginPath(); ctxA.arc(0,vx,4*DPR(),0,Math.PI*2); ctxA.fillStyle = COLOR_ALPHA; ctxA.fill();
      // β (Y축)
      ctxA.beginPath(); ctxA.moveTo(0,0); ctxA.lineTo(vy,0); ctxA.strokeStyle = COLOR_BETA; ctxA.stroke();
      ctxA.beginPath(); ctxA.arc(vy,0,4*DPR(),0,Math.PI*2); ctxA.fillStyle = COLOR_BETA; ctxA.fill();
      // 직각 점선 가이드
      ctxA.setLineDash([6,6]);
      ctxA.beginPath(); ctxA.moveTo(vy,vx); ctxA.lineTo(0,vx); ctxA.strokeStyle = COLOR_ALPHA; ctxA.stroke();
      ctxA.beginPath(); ctxA.moveTo(vy,vx); ctxA.lineTo(vy,0); ctxA.strokeStyle = COLOR_BETA; ctxA.stroke();
      ctxA.setLineDash([]);

      // 값 라벨 (축 색상과 매칭)
      ctxA.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      // α 라벨
      ctxA.fillStyle = COLOR_ALPHA;
      ctxA.textBaseline = 'middle';
      ctxA.textAlign = 'center';
      const axOff = 12*DPR();
      ctxA.fillText(`α = ${a.toFixed(3)}`, -12*DPR(), vx + axOff);
      // β 라벨
      ctxA.fillStyle = COLOR_BETA;
      ctxA.textBaseline = 'middle';
      ctxA.textAlign = 'right';
      ctxA.fillText(`β = ${b.toFixed(3)}`, vy, -12*DPR());

      // 조정 중 변화 화살표
      if (deltaActive && deltaRef){
        const vxp = deltaRef.a * S, vyp = -deltaRef.b * S;
        ctxA.beginPath(); ctxA.moveTo(vxp,vyp); ctxA.lineTo(vx,vy);
        ctxA.strokeStyle = '#ffb020'; ctxA.setLineDash([6,6]); ctxA.lineWidth = 2; ctxA.stroke(); ctxA.setLineDash([]);
      }

      ctxA.restore();
    }

    function drawAlphaBetaTime(t){
      const w = ctxAT.canvas.width, h = ctxAT.canvas.height; drawGrid(ctxAT);
      const N = 600; const dt = (1/1200) / +pairs.tscale.r.value;
      // Axis
      ctxAT.lineWidth = 1.25; ctxAT.strokeStyle = '#2b3c63';
      ctxAT.beginPath(); ctxAT.moveTo(0, h/2); ctxAT.lineTo(w, h/2); ctxAT.stroke();
      // Labels
      ctxAT.fillStyle = '#cfe0ff'; ctxAT.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctxAT.fillText('α(t)', 10, 16); ctxAT.fillText('β(t)', 60, 16);

      const series = [
        {key:'alpha', color:COLOR_ALPHA},
        {key:'beta',  color:COLOR_BETA}
      ];

      series.forEach((sObj)=>{
        ctxAT.beginPath();
        for(let i=0;i<N;i++){
          const ti = t - (N-i)*dt;
          const [u,v,wv] = uvwAt(ti);
          const [a,b] = clarke(u,v,wv);
          const y = (sObj.key==='alpha') ? a : b;
          const px = (i/(N-1))*w; const py = h/2 - y * 60 * DPR();
          if(i===0) ctxAT.moveTo(px,py); else ctxAT.lineTo(px,py);
        }
        ctxAT.strokeStyle = sObj.color; ctxAT.lineWidth = 2; ctxAT.stroke();
      });

      // Mark last points and deltas
      const [u,v,wv] = uvwAt(t);
      const [a,b] = clarke(u,v,wv);
      const px = w, pyA = h/2 - a * 60 * DPR(), pyB = h/2 - b * 60 * DPR();

      if (deltaActive && deltaRef){
        const pyAp = h/2 - deltaRef.a * 60 * DPR();
        const pyBp = h/2 - deltaRef.b * 60 * DPR();
        ctxAT.beginPath(); ctxAT.moveTo(px-16,pyAp); ctxAT.lineTo(px-6,pyA); ctxAT.strokeStyle='#ffb020'; ctxAT.setLineDash([6,6]); ctxAT.stroke(); ctxAT.setLineDash([]);
        ctxAT.beginPath(); ctxAT.moveTo(px-16,pyBp); ctxAT.lineTo(px-6,pyB); ctxAT.strokeStyle='#ffb020'; ctxAT.setLineDash([6,6]); ctxAT.stroke(); ctxAT.setLineDash([]);
      }
    }


    function drawInvClarkStatic(t){
      const cw = ctxIuvwS.canvas.width, ch = ctxIuvwS.canvas.height; drawGrid(ctxIuvwS);
      const S = 90 * DPR();
      ctxIuvwS.save(); ctxIuvwS.translate(cw/2, ch/2);
      const axes = [
        {ang: -90,     lab:'+U', col:COLOR_U},
        {ang:-210,   lab:'+V', col:COLOR_V},
        {ang: 30,   lab:'+W', col:COLOR_W},
      ];
      ctxIuvwS.lineWidth = 1.25; ctxIuvwS.strokeStyle = '#2b3c63'; ctxIuvwS.fillStyle = '#cfe0ff';
      ctxIuvwS.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      axes.forEach(a=>{
        const th = a.ang * Math.PI/180;
        const x = Math.cos(th)*S*1.1, y = -Math.sin(th)*S*1.1;
        ctxIuvwS.beginPath(); ctxIuvwS.moveTo(-x,-y); ctxIuvwS.lineTo(x,y); ctxIuvwS.stroke();
        ctxIuvwS.fillStyle = a.col; ctxIuvwS.fillText(a.lab, x + (x>=0?6:-10), y + (y>=0?-6:14));
        ctxIuvwS.fillStyle = '#cfe0ff';
      });
      
      const [u,v,w] = uvwAt(t);
      const vals = [
        {ang:-90,   val:u, col:COLOR_U, lab:'U'},
        {ang:-210,val:v, col:COLOR_V, lab:'V'},
        {ang:30, val:w, col:COLOR_W, lab:'W'},
      ];
      
      // --- 합성벡터(αβ 공간벡터) 추가 ---
      let alphaX = 0; // α축은 +X (U축과 정렬)
      let betaY = 0; // 캔버스 Y는 아래가 +이므로 부호 반전

      vals.forEach(o=>{
        const th = o.ang * Math.PI/180;
        const px = Math.cos(th) * o.val * S;
        const py = -Math.sin(th) * o.val * S;
        ctxIuvwS.beginPath(); ctxIuvwS.moveTo(0,0); ctxIuvwS.lineTo(px,py);
        ctxIuvwS.strokeStyle = o.col; ctxIuvwS.lineWidth = 2.2; ctxIuvwS.stroke();
        ctxIuvwS.beginPath(); ctxIuvwS.arc(px,py,4*DPR(),0,Math.PI*2); ctxIuvwS.fillStyle = o.col; ctxIuvwS.fill();
        alphaX += px;
        betaY += py;
      }); 

      // 벡터 본체
      ctxIuvwS.beginPath();
      ctxIuvwS.moveTo(0, 0);
      ctxIuvwS.lineTo(alphaX, betaY);
      ctxIuvwS.strokeStyle = '#FFCC00';     // 기존 그린 계열(Color of resultant)
      ctxIuvwS.lineWidth = 2.4;
      ctxIuvwS.stroke();

      // 벡터 팁 표시
      ctxIuvwS.beginPath();
      ctxIuvwS.arc(alphaX, betaY, 4.5 * DPR(), 0, Math.PI * 2);
      ctxIuvwS.fillStyle = '#FFCC00';
      ctxIuvwS.fill();

      // ---- 현재 파라미터 기준 한 주기 전체 궤적 (비누적) ----
      const f = Math.max(0, +pairs.freq.r.value);
      let a=0, b=0;
      if (f > 1e-6){
        const T = 1/f;
        const N = 720;
        ctxIuvwS.beginPath();
        for (let i=0; i<=N; i++){
          const ti = t - T + (i/N)*T; // [t-T, t]
          const [u,v,wv] = uvwAt(ti);
          const [aa,bb] = clarke(u,v,wv);
          const px = aa * S, py = -bb * S;
          if (i===0) ctxIuvwS.moveTo(px,py); else ctxIuvwS.lineTo(px,py);
          if (i===N){ a = aa; b = bb; }
        }
        ctxIuvwS.strokeStyle = '#9dd7ff'; ctxIuvwS.lineWidth = 1.6; ctxIuvwS.stroke();
      } else {
        const [u,v,wv] = uvwAt(t); [a,b] = clarke(u,v,wv);
        ctxIuvwS.beginPath(); ctxIuvwS.arc(a*S, -b*S, 3.5*DPR(), 0, Math.PI*2); ctxIuvwS.fillStyle = '#9dd7ff'; ctxIuvwS.fill();
      }

      ctxIuvwS.restore();
    }

    function drawInvClarkTime(t){
      const w = ctxIuvwT.canvas.width, h = ctxIuvwT.canvas.height; drawGrid(ctxIuvwT);
      const N = 600;
      const dt = (1/1200) / +pairs.tscale.r.value;
      ctxIuvwT.lineWidth = 1.25; ctxIuvwT.strokeStyle = '#2b3c63';
      ctxIuvwT.beginPath(); ctxIuvwT.moveTo(0, h/2); ctxIuvwT.lineTo(w, h/2); ctxIuvwT.stroke();

      const colors = ['#4aa3ff','#7affc5','#ff5d6c'];
      [[0,'U'],[1,'V'],[2,'W']].forEach(([idx,label])=>{
        ctxIuvwT.beginPath();
        for(let i=0;i<N;i++){
          const ti = t - (N-i)*dt;
          const [u,v,wv] = uvwAt(ti);
          const y = [u,v,wv][idx];
          const px = (i/(N-1))*w; const py = h/2 - y * 60 * DPR();
          if(i===0) ctxIuvwT.moveTo(px,py); else ctxIuvwT.lineTo(px,py);
        }
        ctxIuvwT.strokeStyle = colors[idx]; ctxIuvwT.lineWidth = 2; ctxIuvwT.stroke();
      });
    }

    // ---------- 3D αβ+t view ----------
    const VIEW = { pitch: deg2rad(35.26438968), yaw: deg2rad(45), roll: deg2rad(0) };

    function rotX(p,a){ const [x,y,z]=p; return [x, y*Math.cos(a)-z*Math.sin(a), y*Math.sin(a)+z*Math.cos(a)]; }
    function rotY(p,a){ const [x,y,z]=p; return [ x*Math.cos(a)+z*Math.sin(a), y, -x*Math.sin(a)+z*Math.cos(a) ]; }
    function rotZ(p,a){ const [x,y,z]=p; return [ x*Math.cos(a)-y*Math.sin(a), x*Math.sin(a)+y*Math.cos(a), z ]; }

    function project3D(x,y,z){
      // scale before rotate
      const S = 80 * DPR();
      const ZS = 0.9 * S;  // Z 축을 조금 다르게 스케일해도 각도엔 영향 없음
      let p = [x*S, y*S, z*ZS];

      // ✅ 순서 교체: yaw → pitch → roll
      p = rotY(p, VIEW.yaw);   // yaw
      p = rotX(p, VIEW.pitch); // pitch
      p = rotZ(p, VIEW.roll);  // roll

      return p; // orthographic: x,y 사용
    }


    function drawAxes3D(ctx){
      const w = ctx.canvas.width, h = ctx.canvas.height; //drawGrid(ctx);
      const cx = w/2, cy = h/2;
      ctx.clearRect(0,0,w,h);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.lineWidth = 1.25; ctx.strokeStyle = '#2b3c63'; ctx.fillStyle = '#cfe0ff';
      ctx.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      // α axis (x,0,0)
      let p0 = project3D(0,0,0); let pX = project3D(3,0,0);
      ctx.beginPath(); ctx.moveTo(-pX[0],pX[1]); ctx.lineTo(pX[0],-pX[1]); ctx.stroke(); ctx.fillText('α (X)', pX[0]-10, -pX[1]-6);
      // β axis (0,1,0)
      let pY = project3D(0,2,0);
      ctx.beginPath(); ctx.moveTo(-pY[0],pY[1]); ctx.lineTo(pY[0],-pY[1]); ctx.stroke(); ctx.fillText('β (Y)', pY[0]+4, -pY[1]);
      // t axis (0,0,1)
      let pZ = project3D(0,0,3);
      ctx.beginPath(); ctx.moveTo(p0[0],p0[1]); ctx.lineTo(pZ[0],-pZ[1]); ctx.stroke(); ctx.fillText('t', pZ[0]+4, -pZ[1]);
      ctx.restore();
    }

    // ---- 3D helper grids for Clarke wall/floor presentation ----
    function drawAlphaWallGrid(ctx){
      ctx.save();
      ctx.lineWidth = 1; ctx.strokeStyle = '#203156';
      const gyStep = 0.3, gzStep = 0.1;
      // horizontal lines (z): y fixed, z:0→1
      for(let gy=-AMP_RANGE; gy<=AMP_RANGE+1e-6; gy+=gyStep){
        const A = project3D(WALL_X, gy, 0), B = project3D(WALL_X, gy, 1);
        ctx.beginPath(); ctx.moveTo(A[0], -A[1]); ctx.lineTo(B[0], -B[1]); ctx.stroke();
      }
      // vertical lines (y): z fixed
      for(let gz=0; gz<=1+1e-6; gz+=gzStep){
        const A = project3D(WALL_X, -AMP_RANGE, gz), B = project3D(WALL_X, AMP_RANGE, gz);
        ctx.beginPath(); ctx.moveTo(A[0], -A[1]); ctx.lineTo(B[0], -B[1]); ctx.stroke();
      }
      const lbl = project3D(WALL_X, AMP_RANGE, 0);
      ctx.fillStyle = COLOR_ALPHA; ctx.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctx.fillText('α(t)', lbl[0] + 6*DPR(), -lbl[1] - 6*DPR());
      ctx.restore();
    }
    function drawBetaFloorGrid(ctx){
      ctx.save();
      ctx.lineWidth = 1; ctx.strokeStyle = '#203156';
      const gxStep = 0.3, gzStep = 0.1;
      // depth lines (z): x fixed, z:0→1 on the floor (y = -FLOOR_Y)
      for(let gx=-AMP_RANGE; gx<=AMP_RANGE+1e-6; gx+=gxStep){
        const A = project3D(gx, -FLOOR_Y, 0), B = project3D(gx, -FLOOR_Y, 1);
        ctx.beginPath(); ctx.moveTo(A[0], -A[1]); ctx.lineTo(B[0], -B[1]); ctx.stroke();
      }
      // cross lines (x): z fixed
      for(let gz=0; gz<=1+1e-6; gz+=gzStep){
        const A = project3D(-AMP_RANGE, -FLOOR_Y, gz), B = project3D(AMP_RANGE, -FLOOR_Y, gz);
        ctx.beginPath(); ctx.moveTo(A[0], -A[1]); ctx.lineTo(B[0], -B[1]); ctx.stroke();
      }
      const lbl = project3D(AMP_RANGE, -FLOOR_Y, 0);
      ctx.fillStyle = COLOR_BETA; ctx.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctx.fillText('β(t)', lbl[0] - 24*DPR(), -lbl[1] - 6*DPR());
      ctx.restore();
    }

    function drawAlphaBeta3D(t){
      const w = ctxA3.canvas.width, h = ctxA3.canvas.height; //drawGrid(ctxA3);
      drawAxes3D(ctxA3);

      const cx = w/2, cy = h/2; ctxA3.save(); ctxA3.translate(cx, cy);

      const f = Math.max(0, +pairs.freq.r.value);
      const cycles = Math.max(1, +pairs.cycles3D.r.value || 5);
      const Tvis = 1/f; // time window length
      const N = 720;
      let a=0, b=0;

      // α(t) on vertical wall @ x = WALL_X (vary y over α, depth over time)
      ctxA3.beginPath();

      for (let i=0; i<=N*2; i++){
        const ti = t - Tvis + (i/N)*Tvis;
        const [u,v,wv] = uvwAt(ti); const [aa,bb] = clarke(u,v,wv);
        const P = project3D(WALL_X, aa, -i/N);
        const sx = P[0], sy = -P[1];
        if (i===0) ctxA3.moveTo(sx, sy); else ctxA3.lineTo(sx, sy);
        if (i===N*2){ a=aa; }
      }
      ctxA3.strokeStyle = COLOR_ALPHA; ctxA3.lineWidth = 2; ctxA3.stroke();

      // β(t) on floor @ y = -FLOOR_Y (vary x over β, depth over time)
      ctxA3.beginPath();
      for (let i=0; i<=N*2; i++){
        const ti = t - Tvis + (i/N)*Tvis;
        const [u,v,wv] = uvwAt(ti); const [aa,bb] = clarke(u,v,wv);
        const P = project3D(bb, -FLOOR_Y, -i/N);
        const sx = P[0], sy = -P[1];
        if (i===0) ctxA3.moveTo(sx, sy); else ctxA3.lineTo(sx, sy);
        if (i===N*2){ b=bb; }
      }
      ctxA3.strokeStyle = COLOR_BETA; ctxA3.lineWidth = 2; ctxA3.stroke();

      // Current rotating vector in αβ plane @ z=1
      // yj 여기가 노랑
      const p0 = project3D(0,0,-2), p1 = project3D(a,b,-2);
      ctxA3.beginPath(); ctxA3.moveTo(p0[0], -p0[1]); ctxA3.lineTo(p1[0], -p1[1]);
      ctxA3.strokeStyle = '#FFCC00'; ctxA3.lineWidth = 2.4; ctxA3.stroke();
      ctxA3.beginPath(); 
      ctxA3.arc(p1[0], -p1[1], 4.5*DPR(), 0, Math.PI*2); 
      ctxA3.fillStyle = '#FFCC00'; ctxA3.fill();

      // Guides from vector tip to the α-wall and β-floor at the current time (z=1)
      // const pAlphaNow = project3D(WALL_X, a, 0);
      const pAlphaNow = project3D(WALL_X, a, 0);
      const pBetaNow  = project3D(b, -FLOOR_Y, 0);
      ctxA3.setLineDash([6,6]);
      ctxA3.beginPath(); ctxA3.moveTo(p1[0], -p1[1]); ctxA3.lineTo(pAlphaNow[0], -pAlphaNow[1]); ctxA3.strokeStyle = COLOR_ALPHA; ctxA3.stroke();
      ctxA3.beginPath(); ctxA3.moveTo(p1[0], -p1[1]); ctxA3.lineTo(pBetaNow[0], -pBetaNow[1]); ctxA3.strokeStyle = COLOR_BETA; ctxA3.stroke();
      ctxA3.setLineDash([]);
      // markers & labels at plane intersections (latest α, β)
      ctxA3.beginPath(); ctxA3.arc(pAlphaNow[0], -pAlphaNow[1], 4*DPR(), 0, Math.PI*2); ctxA3.fillStyle = COLOR_ALPHA; ctxA3.fill();
      ctxA3.beginPath(); ctxA3.arc(pBetaNow[0], -pBetaNow[1], 4*DPR(), 0, Math.PI*2); ctxA3.fillStyle = COLOR_BETA; ctxA3.fill();
      ctxA3.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctxA3.fillStyle = COLOR_ALPHA; ctxA3.textAlign = 'left'; ctxA3.textBaseline = 'bottom';
      ctxA3.fillText(`α=${a.toFixed(3)}`, pAlphaNow[0] + 6*DPR(), -pAlphaNow[1] - 4*DPR());
      ctxA3.fillStyle = COLOR_BETA; ctxA3.textAlign = 'right'; ctxA3.textBaseline = 'middle';
      ctxA3.fillText(`β=${b.toFixed(3)}`, pBetaNow[0] - 6*DPR(), -pBetaNow[1]);

      // ---- 현재 파라미터 기준 한 주기 전체 궤적 (비누적) ----
      // if (f > 1e-6){
      //   for (let i=0; i<=N; i++){
      //     const ti = t - T + (i/N)*T; // [t-T, t]
      //     const [u,v,wv] = uvwAt(ti);
      //     const [aa,bb] = clarke(u,v,wv);
      //     const px = aa * S, py = -bb * S;
      //     if (i===0) ctxIuvwS.moveTo(px,py); else ctxIuvwS.lineTo(px,py);
      //     if (i===N){ a = aa; b = bb; }
      //   }
      //   ctxIuvwS.strokeStyle = '#9dd7ff'; ctxIuvwS.lineWidth = 1.6; ctxIuvwS.stroke();
      // } else {
      //   const [u,v,wv] = uvwAt(t); [a,b] = clarke(u,v,wv);
      //   ctxIuvwS.beginPath(); ctxIuvwS.arc(a*S, -b*S, 3.5*DPR(), 0, Math.PI*2); ctxIuvwS.fillStyle = '#9dd7ff'; ctxIuvwS.fill();
      // }
      const S = 50 * DPR();
      if (f > 1e-6){
        const T = 1/f;
        const N = 720;
        ctxA3.beginPath();
        for (let i=0; i<=N; i++){
          const ti = t - T + (i/N)*T;
          const [u,v,w] = uvwAt(ti);
          const [aa,bb] = clarke(u,v,w);
          const px = aa * S - 110, py = -bb * S - 50;
          const P2 = project3D(0, 0, -2);
          const P3 = project3D(px, py, -2);
          if (i===0) ctxA3.moveTo(px,py); else ctxA3.lineTo(px,py);
          //if (i===0) ctxA3.moveTo(P3[0],P3[1]); else ctxA3.lineTo(P3[0],P3[1]);
          if (i===N){ a = P3[0]; b = P3[1]; }
        }
        ctxA3.strokeStyle = '#9dd7ff'; ctxA3.lineWidth = 1.6; ctxA3.stroke();
      } else {
        const [u,v,wv] = uvwAt(t); [a,b] = clarke(u,v,wv);
        ctxA3.beginPath(); 
        ctxA3.arc(-b*S, a*S, 3.5*DPR(), 0, Math.PI*2); 
        ctxA3.fillStyle = '#9dd7ff'; ctxA3.fill();
      }

      ctxA3.restore();
    }

    // ---------- UVW helper (custom 3D scaler & axes) ----------
    function project3D_custom(x,y,z,Sx,Sy,Sz){
      let p = [x*Sx, y*Sy, z*Sz];
      p = rotX(p, VIEW.pitch); p = rotY(p, VIEW.yaw); p = rotZ(p, VIEW.roll);
      return p;
    }
    function drawAxes3D_UVW(ctx){
      const w = ctx.canvas.width, h = ctx.canvas.height; drawGrid(ctx);
      const cx = w/2, cy = h/2; const Sx = 80*DPR(), Sy = 60*DPR(), Sz = 0.9*Sy;
      ctx.save(); ctx.translate(cx,cy);
      ctx.lineWidth = 1.25; ctx.strokeStyle = '#2b3c63'; ctx.fillStyle = '#cfe0ff';
      ctx.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      const p0 = project3D_custom(0,0,0,Sx,Sy,Sz);
      const pX = project3D_custom(1.4,0,0,Sx,Sy,Sz);
      const pY = project3D_custom(0,1.4,0,Sx,Sy,Sz);
      const pZ = project3D_custom(0,0,1.2,Sx,Sy,Sz);
      ctx.beginPath(); ctx.moveTo(p0[0],-p0[1]); ctx.lineTo(pX[0],-pX[1]); ctx.stroke(); ctx.fillText('phase', pX[0]-22, -pX[1]-6);
      ctx.beginPath(); ctx.moveTo(p0[0],-p0[1]); ctx.lineTo(pY[0],-pY[1]); ctx.stroke(); ctx.fillText('amp', pY[0]+6, -pY[1]);
      ctx.beginPath(); ctx.moveTo(p0[0],-p0[1]); ctx.lineTo(pZ[0],-pZ[1]); ctx.stroke(); ctx.fillText('t', pZ[0]+6, -pZ[1]);
      const tU = project3D_custom(-1,0,0,Sx,Sy,Sz); const tV = project3D_custom(0,0,0,Sx,Sy,Sz); const tW = project3D_custom(1,0,0,Sx,Sy,Sz);
      ctx.fillStyle = COLOR_U; ctx.fillText('U', tU[0]-6, -tU[1]-6);
      ctx.fillStyle = COLOR_V; ctx.fillText('V', tV[0]+6, -tV[1]-6);
      ctx.fillStyle = COLOR_W; ctx.fillText('W', tW[0]+6, -tW[1]-6);
      ctx.restore();
    }

    // ---------- UVW 3D (time-domain) ----------
    function drawUVW3D(t){
      const w = ctxU3.canvas.width, h = ctxU3.canvas.height; drawAxes3D_UVW(ctxU3);
      const cx = w/2, cy = h/2; ctxU3.save(); ctxU3.translate(cx,cy);
      const f = Math.max(0, +pairs.freq.r.value);
      const cycles = Math.max(1, +pairs.cycles3D.r.value || 5);
      const Tvis = (f > 1e-6) ? (cycles / f) : 1;
      const N = Math.max(600, Math.floor(cycles * 720));
      const Sx = 80*DPR(), Sy = 60*DPR(), Sz = 0.9*Sy;
      const chans = [
        {name:'U', col:COLOR_U, x:-1, sample:(ti)=>uvwAt(ti)[0]},
        {name:'V', col:COLOR_V, x: 0, sample:(ti)=>uvwAt(ti)[1]},
        {name:'W', col:COLOR_W, x: 1, sample:(ti)=>uvwAt(ti)[2]},
      ];
      chans.forEach(ch=>{
        ctxU3.beginPath();
        for (let i=0;i<=N;i++){
          const ti = t - Tvis + (i/N)*Tvis; // [t-Tvis, t]
          const y = ch.sample(ti);
          const z = i/N; // time 0..1
          const p = project3D_custom(ch.x, y, z, Sx,Sy,Sz);
          const sx = p[0], sy = -p[1];
          if (i===0) ctxU3.moveTo(sx, sy); else ctxU3.lineTo(sx, sy);
        }
        ctxU3.strokeStyle = ch.col; ctxU3.lineWidth = 1.8; ctxU3.stroke();
      });
      ctxU3.restore();
    }

    // ---------- UVW static phasor (120° axes) ----------
    function drawUVWStatic(t){
      const cw = ctxUS.canvas.width, ch = ctxUS.canvas.height; drawGrid(ctxUS);
      const S = 90 * DPR();
      ctxUS.save(); ctxUS.translate(cw/2, ch/2);
      const axes = [
        {ang: -90,     lab:'+U', col:COLOR_U},
        {ang:-210,   lab:'+V', col:COLOR_V},
        {ang: 30,   lab:'+W', col:COLOR_W},
      ];
      ctxUS.lineWidth = 1.25; ctxUS.strokeStyle = '#2b3c63'; ctxUS.fillStyle = '#cfe0ff';
      ctxUS.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      axes.forEach(a=>{
        const th = a.ang * Math.PI/180;
        const x = Math.cos(th)*S*1.1, y = -Math.sin(th)*S*1.1;
        ctxUS.beginPath(); ctxUS.moveTo(-x,-y); ctxUS.lineTo(x,y); ctxUS.stroke();
        ctxUS.fillStyle = a.col; ctxUS.fillText(a.lab, x + (x>=0?6:-10), y + (y>=0?-6:14));
        ctxUS.fillStyle = '#cfe0ff';
      });
      
      const [u,v,w] = uvwAt(t);
      const vals = [
        {ang:-90,   val:u, col:COLOR_U, lab:'U'},
        {ang:-210,val:v, col:COLOR_V, lab:'V'},
        {ang:30, val:w, col:COLOR_W, lab:'W'},
      ];
      
      // --- 합성벡터(αβ 공간벡터) 추가 ---
      let alphaX = 0; // α축은 +X (U축과 정렬)
      let betaY = 0; // 캔버스 Y는 아래가 +이므로 부호 반전

      vals.forEach(o=>{
        const th = o.ang * Math.PI/180;
        const px = Math.cos(th) * o.val * S;
        const py = -Math.sin(th) * o.val * S;
        ctxUS.beginPath(); ctxUS.moveTo(0,0); ctxUS.lineTo(px,py);
        ctxUS.strokeStyle = o.col; ctxUS.lineWidth = 2.2; ctxUS.stroke();
        ctxUS.beginPath(); ctxUS.arc(px,py,4*DPR(),0,Math.PI*2); ctxUS.fillStyle = o.col; ctxUS.fill();
        alphaX += px;
        betaY += py;
      }); 

      if(normalize.checked) {
        alphaX = alphaX * 2/3;
        betaY = betaY * 2/3;
      }

      // 벡터 본체
      ctxUS.beginPath();
      ctxUS.moveTo(0, 0);
      ctxUS.lineTo(alphaX, betaY);
      ctxUS.strokeStyle = '#FFCC00';     // 기존 그린 계열(Color of resultant)
      ctxUS.lineWidth = 2.4;
      ctxUS.stroke();

      // 벡터 팁 표시
      ctxUS.beginPath();
      ctxUS.arc(alphaX, betaY, 4.5 * DPR(), 0, Math.PI * 2);
      ctxUS.fillStyle = '#FFCC00';
      ctxUS.fill();

      // ---- 현재 파라미터 기준 한 주기 전체 궤적 (비누적) ----
      const f = Math.max(0, +pairs.freq.r.value);
      let a=0, b=0;
      if (f > 1e-6){
        const T = 1/f;
        const N = 720;
        ctxUS.beginPath();
        for (let i=0; i<=N; i++){
          const ti = t - T + (i/N)*T; // [t-T, t]
          const [u,v,wv] = uvwAt(ti);
          const [aa,bb] = clarke(u,v,wv);
          const px = aa * S, py = -bb * S;
          if (i===0) ctxUS.moveTo(py,px); else ctxUS.lineTo(py,px);
          if (i===N){ a = aa; b = bb; }
        }
        ctxUS.strokeStyle = '#9dd7ff'; ctxUS.lineWidth = 1.6; ctxUS.stroke();
      } else {
        const [u,v,wv] = uvwAt(t); [a,b] = clarke(u,v,wv);
        ctxUS.beginPath(); ctxUS.arc(-b*S, a*S, 3.5*DPR(), 0, Math.PI*2); ctxUS.fillStyle = '#9dd7ff'; ctxUS.fill();
      }

      ctxUS.restore();
    }

    // ===== Park helpers =====
    function thetaE(t){
      const fe = syncTheta && syncTheta.checked ? +pairs.freq.r.value : +pairs.fe.r.value;
      return deg2rad(+pairs.theta0.r.value) + 2*Math.PI*fe*t;
    }
    function parkFromAlphaBeta(a,b,th){
      const c = Math.cos(th), s = Math.sin(th);
      const d =  a*c + b*s;
      const q = -a*s + b*c;
      return [d,q];
    }

    function drawAxesWithLabelsGeneric(ctx, xLab, yLab){
      const w = ctx.canvas.width, h = ctx.canvas.height;
      ctx.save(); ctx.translate(w/2, h/2);
      ctx.strokeStyle = '#2b3c63'; ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.moveTo(-w/2,0); ctx.lineTo(w/2,0); ctx.moveTo(0,-h/2); ctx.lineTo(0,h/2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w/2-10, -4); ctx.lineTo(w/2, 0); ctx.lineTo(w/2-10, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -h/2+10); ctx.lineTo(0, -h/2); ctx.lineTo(4, -h/2+10); ctx.stroke();
      ctx.fillStyle = '#cfe0ff'; ctx.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctx.fillText(xLab, w/2 - 40, -8);
      ctx.fillText(yLab, 8, -h/2 + 18);
      ctx.restore();
    }

    function drawParkTime(t){
      const w = ctxDT.canvas.width, h = ctxDT.canvas.height; drawGrid(ctxDT);
      const N = 600; const dt = (1/1200) / +pairs.tscale.r.value;
      ctxDT.lineWidth = 1.25; ctxDT.strokeStyle = '#2b3c63';
      ctxDT.beginPath(); ctxDT.moveTo(0, h/2); ctxDT.lineTo(w, h/2); ctxDT.stroke();
      ctxDT.fillStyle = '#cfe0ff'; ctxDT.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctxDT.fillText('d(t)', 10, 16); ctxDT.fillText('q(t)', 60, 16);

      const series = [ {key:'d', color:COLOR_D}, {key:'q', color:COLOR_Q} ];
      series.forEach((sObj)=>{
        ctxDT.beginPath();
        for(let i=0;i<N;i++){
          const ti = t - (N-i)*dt;
          const [u,v,wv] = uvwAt(ti); const [a,b] = clarke(u,v,wv); const th = thetaE(ti);
          const [d,q] = parkFromAlphaBeta(a,b,th);
          const y = (sObj.key==='d') ? d : q;
          const px = (i/(N-1))*w; const py = h/2 - y * 60 * DPR();
          if(i===0) ctxDT.moveTo(px,py); else ctxDT.lineTo(px,py);
        }
        ctxDT.strokeStyle = sObj.color; ctxDT.lineWidth = 2; ctxDT.stroke();
      });

      const [u,v,wph] = uvwAt(t); const [a,b] = clarke(u,v,wph); const th = thetaE(t);
      const [d,q] = parkFromAlphaBeta(a,b,th);
      const px = w, pyD = h/2 - d * 60 * DPR(), pyQ = h/2 - q * 60 * DPR();
    }

    function drawParkStatic(t){
      const cw = ctxDS.canvas.width, ch = ctxDS.canvas.height; drawGrid(ctxDS);
      drawAxesWithLabelsGeneric(ctxDS, 'd (X)', 'q (Y)');
      const S = 90 * DPR();
      ctxDS.save(); ctxDS.translate(cw/2, ch/2);
      const [u,v,w] = uvwAt(t); const [a,b] = clarke(u,v,w); const th = thetaE(t);
      const [d,q] = parkFromAlphaBeta(a,b,th);
      const vx = d * S, vy = -q * S;
      ctxDS.beginPath(); ctxDS.moveTo(0,0); ctxDS.lineTo(vx,vy); ctxDS.strokeStyle = '#FFCC00'; ctxDS.lineWidth = 2.4; ctxDS.stroke();
      ctxDS.beginPath(); ctxDS.arc(vx,vy,4.5*DPR(),0,Math.PI*2); ctxDS.fillStyle = '#FFCC00'; ctxDS.fill();
      // axis components
      ctxDS.lineWidth = 2; ctxDS.strokeStyle = COLOR_D; ctxDS.beginPath(); ctxDS.moveTo(0,0); ctxDS.lineTo(vx,0); ctxDS.stroke();
      ctxDS.fillStyle = COLOR_D; ctxDS.beginPath(); ctxDS.arc(vx,0,4*DPR(),0,Math.PI*2); ctxDS.fill();
      ctxDS.strokeStyle = COLOR_Q; ctxDS.beginPath(); ctxDS.moveTo(0,0); ctxDS.lineTo(0,vy); ctxDS.stroke();
      ctxDS.fillStyle = COLOR_Q; ctxDS.beginPath(); ctxDS.arc(0,vy,4*DPR(),0,Math.PI*2); ctxDS.fill();
      // dashed guides
      ctxDS.setLineDash([6,6]);
      ctxDS.strokeStyle = COLOR_D; ctxDS.beginPath(); ctxDS.moveTo(vx,vy); ctxDS.lineTo(vx,0); ctxDS.stroke();
      ctxDS.strokeStyle = COLOR_Q; ctxDS.beginPath(); ctxDS.moveTo(vx,vy); ctxDS.lineTo(0,vy); ctxDS.stroke();
      ctxDS.setLineDash([]);
      // labels
      let dStr = d.toFixed(3);
      if (d >= 0) dStr = ' ' + dStr; // 양수일 때 앞에 한 칸
      
      ctxDS.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctxDS.fillStyle = COLOR_D; ctxDS.textAlign = 'center'; ctxDS.textBaseline = 'middle';
      ctxDS.fillText(`d = ${dStr}`, vx + 6*DPR(), -12*DPR());
      ctxDS.fillStyle = COLOR_Q; ctxDS.textAlign = 'right'; ctxDS.textBaseline = 'middle';
      ctxDS.fillText(`q = ${q.toFixed(3)}`, -12*DPR(), vy);
      ctxDS.restore();
    }

    function drawInvParkStatic(t){
      const w = ctxIABS.canvas.width, h = ctxIABS.canvas.height; drawGrid(ctxIABS);
      drawAxesWithLabels(ctxIABS);

      const S = 90 * DPR();
      ctxIABS.save();
      ctxIABS.translate(w/2, h/2);

      // ---- 현재 파라미터 기준 한 주기 전체 궤적 (비누적) ----
      const f = Math.max(0, +pairs.freq.r.value);
      let a=0, b=0;
      if (f > 1e-6){
        const T = 1/f;
        const N = 720;
        ctxIABS.beginPath();
        for (let i=0; i<=N; i++){
          const ti = t - T + (i/N)*T; // [t-T, t]
          const [u,v,wv] = uvwAt(ti);
          const [aa,bb] = clarke(u,v,wv);
          const px = aa * S, py = -bb * S;
          if (i===0) ctxIABS.moveTo(px,py); else ctxIABS.lineTo(px,py);
          if (i===N){ a = aa; b = bb; }
        }
        ctxIABS.strokeStyle = '#9dd7ff'; ctxIABS.lineWidth = 1.6; ctxIABS.stroke();
      } else {
        const [u,v,wv] = uvwAt(t); [a,b] = clarke(u,v,wv);
        ctxIABS.beginPath(); ctxIABS.arc(a*S, -b*S, 3.5*DPR(), 0, Math.PI*2); ctxIABS.fillStyle = '#9dd7ff'; ctxIABS.fill();
      }

      // 현재 벡터(초록색)
      const vx = a * S, vy = -b * S;
      ctxIABS.beginPath(); ctxIABS.moveTo(0,0); ctxIABS.lineTo(vy,vx); ctxIABS.strokeStyle = '#FFCC00'; ctxIABS.lineWidth = 2.4; ctxIABS.stroke();
      ctxIABS.beginPath(); ctxIABS.arc(vy,vx,4.5*DPR(),0,Math.PI*2); ctxIABS.fillStyle = '#FFCC00'; ctxIABS.fill();

      // α, β 축 값: 축에 붙여 표시 + 벡터팁→축 직각 점선 가이드
      // α (X축)
      ctxIABS.lineWidth = 2;
      ctxIABS.beginPath(); ctxIABS.moveTo(0,0); ctxIABS.lineTo(0,vx); ctxIABS.strokeStyle = COLOR_ALPHA; ctxIABS.stroke();
      ctxIABS.beginPath(); ctxIABS.arc(0,vx,4*DPR(),0,Math.PI*2); ctxIABS.fillStyle = COLOR_ALPHA; ctxIABS.fill();
      // β (Y축)
      ctxIABS.beginPath(); ctxIABS.moveTo(0,0); ctxIABS.lineTo(vy,0); ctxIABS.strokeStyle = COLOR_BETA; ctxIABS.stroke();
      ctxIABS.beginPath(); ctxIABS.arc(vy,0,4*DPR(),0,Math.PI*2); ctxIABS.fillStyle = COLOR_BETA; ctxIABS.fill();
      // 직각 점선 가이드
      ctxIABS.setLineDash([6,6]);
      ctxIABS.beginPath(); ctxIABS.moveTo(vy,vx); ctxIABS.lineTo(0,vx); ctxIABS.strokeStyle = COLOR_ALPHA; ctxIABS.stroke();
      ctxIABS.beginPath(); ctxIABS.moveTo(vy,vx); ctxIABS.lineTo(vy,0); ctxIABS.strokeStyle = COLOR_BETA; ctxIABS.stroke();
      ctxIABS.setLineDash([]);

      // 값 라벨 (축 색상과 매칭)
      ctxIABS.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      // α 라벨
      ctxIABS.fillStyle = COLOR_ALPHA;
      ctxIABS.textBaseline = 'middle';
      ctxIABS.textAlign = 'center';
      const axOff = 12*DPR();
      ctxIABS.fillText(`α = ${a.toFixed(3)}`, -12*DPR(), vx + axOff);
      // β 라벨
      ctxIABS.fillStyle = COLOR_BETA;
      ctxIABS.textBaseline = 'middle';
      ctxIABS.textAlign = 'right';
      ctxIABS.fillText(`β = ${b.toFixed(3)}`, vy, -12*DPR());

      // 조정 중 변화 화살표
      if (deltaActive && deltaRef){
        const vxp = deltaRef.a * S, vyp = -deltaRef.b * S;
        ctxIABS.beginPath(); ctxIABS.moveTo(vxp,vyp); ctxIABS.lineTo(vx,vy);
        ctxIABS.strokeStyle = '#ffb020'; ctxIABS.setLineDash([6,6]); ctxIABS.lineWidth = 2; ctxIABS.stroke(); ctxIABS.setLineDash([]);
      }

      ctxIABS.restore();
    }

    function drawInvParkTime(t){
      const w = ctxIABT.canvas.width, h = ctxIABT.canvas.height; drawGrid(ctxIABT);
      const N = 600; const dt = (1/1200) / +pairs.tscale.r.value;
      // Axis
      ctxIABT.lineWidth = 1.25; ctxIABT.strokeStyle = '#2b3c63';
      ctxIABT.beginPath(); ctxIABT.moveTo(0, h/2); ctxIABT.lineTo(w, h/2); ctxIABT.stroke();
      // Labels
      ctxIABT.fillStyle = '#cfe0ff'; ctxIABT.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctxIABT.fillText('α(t)', 10, 16); ctxIABT.fillText('β(t)', 60, 16);

      const series = [
        {key:'alpha', color:COLOR_ALPHA},
        {key:'beta',  color:COLOR_BETA}
      ];

      series.forEach((sObj)=>{
        ctxIABT.beginPath();
        for(let i=0;i<N;i++){
          const ti = t - (N-i)*dt;
          const [u,v,wv] = uvwAt(ti);
          const [a,b] = clarke(u,v,wv);
          const y = (sObj.key==='alpha') ? a : b;
          const px = (i/(N-1))*w; const py = h/2 - y * 60 * DPR();
          if(i===0) ctxIABT.moveTo(px,py); else ctxIABT.lineTo(px,py);
        }
        ctxIABT.strokeStyle = sObj.color; ctxIABT.lineWidth = 2; ctxIABT.stroke();
      });

      // Mark last points and deltas
      const [u,v,wv] = uvwAt(t);
      const [a,b] = clarke(u,v,wv);
      const px = w, pyA = h/2 - a * 60 * DPR(), pyB = h/2 - b * 60 * DPR();

      if (deltaActive && deltaRef){
        const pyAp = h/2 - deltaRef.a * 60 * DPR();
        const pyBp = h/2 - deltaRef.b * 60 * DPR();
        ctxIABT.beginPath(); ctxIABT.moveTo(px-16,pyAp); ctxIABT.lineTo(px-6,pyA); ctxIABT.strokeStyle='#ffb020'; ctxIABT.setLineDash([6,6]); ctxIABT.stroke(); ctxIABT.setLineDash([]);
        ctxIABT.beginPath(); ctxIABT.moveTo(px-16,pyBp); ctxIABT.lineTo(px-6,pyB); ctxIABT.strokeStyle='#ffb020'; ctxIABT.setLineDash([6,6]); ctxIABT.stroke(); ctxIABT.setLineDash([]);
      }
    }

    function drawDWallGrid(ctx){
      ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#203156';
      const gyStep = 0.3, gzStep = 0.1;
      for(let gy=-AMP_RANGE; gy<=AMP_RANGE+1e-6; gy+=gyStep){
        const A = project3D(WALL_X, gy, 0), B = project3D(WALL_X, gy, 1);
        ctx.beginPath(); ctx.moveTo(A[0], -A[1]); ctx.lineTo(B[0], -B[1]); ctx.stroke();
      }
      for(let gz=0; gz<=1+1e-6; gz+=gzStep){
        const A = project3D(WALL_X, -AMP_RANGE, gz), B = project3D(WALL_X, AMP_RANGE, gz);
        ctx.beginPath(); ctx.moveTo(A[0], -A[1]); ctx.lineTo(B[0], -B[1]); ctx.stroke();
      }
      const lbl = project3D(WALL_X, AMP_RANGE, 0);
      ctx.fillStyle = COLOR_D; ctx.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctx.fillText('d(t)', lbl[0] + 6*DPR(), -lbl[1] - 6*DPR());
      ctx.restore();
    }
    function drawQFloorGrid(ctx){
      ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#203156';
      const gxStep = 0.3, gzStep = 0.1;
      for(let gx=-AMP_RANGE; gx<=AMP_RANGE+1e-6; gx+=gxStep){
        const A = project3D(gx, -FLOOR_Y, 0), B = project3D(gx, -FLOOR_Y, 1);
        ctx.beginPath(); ctx.moveTo(A[0], -A[1]); ctx.lineTo(B[0], -B[1]); ctx.stroke();
      }
      for(let gz=0; gz<=1+1e-6; gz+=gzStep){
        const A = project3D(-AMP_RANGE, -FLOOR_Y, gz), B = project3D(AMP_RANGE, -FLOOR_Y, gz);
        ctx.beginPath(); ctx.moveTo(A[0], -A[1]); ctx.lineTo(B[0], -B[1]); ctx.stroke();
      }
      const lbl = project3D(AMP_RANGE, -FLOOR_Y, 0);
      ctx.fillStyle = COLOR_Q; ctx.font = `${Math.round(12*DPR())}px ui-monospace, monospace`;
      ctx.fillText('q(t)', lbl[0] - 24*DPR(), -lbl[1] - 6*DPR());
      ctx.restore();
    }

    function drawPark3D(t){
      const w = ctxD3.canvas.width, h = ctxD3.canvas.height; drawGrid(ctxD3); drawAxes3D(ctxD3);
      drawDWallGrid(ctxD3); drawQFloorGrid(ctxD3);
      const cx = w/2, cy = h/2; ctxD3.save(); ctxD3.translate(cx,cy);

      const f = Math.max(0, +pairs.freq.r.value);
      const cycles = Math.max(1, +pairs.cycles3D.r.value || 5);
      const Tvis = (f > 1e-6) ? (cycles / f) : 1; const N = Math.max(600, Math.floor(cycles * 720));

      let d=0, q=0;
      // d(t) on wall
      ctxD3.beginPath();
      for (let i=0;i<=N;i++){
        const ti = t - Tvis + (i/N)*Tvis; const [u,v,wph] = uvwAt(ti); const [a,b] = clarke(u,v,wph); const th = thetaE(ti); const pq = parkFromAlphaBeta(a,b,th);
        const P = project3D(WALL_X, pq[0], i/N); const sx = P[0], sy = -P[1];
        if (i===0) ctxD3.moveTo(sx,sy); else ctxD3.lineTo(sx,sy);
        if (i===N){ d = pq[0]; }
      }
      ctxD3.strokeStyle = COLOR_D; ctxD3.lineWidth = 2; ctxD3.stroke();
      // q(t) on floor
      ctxD3.beginPath();
      for (let i=0;i<=N;i++){
        const ti = t - Tvis + (i/N)*Tvis; const [u,v,wph] = uvwAt(ti); const [a,b] = clarke(u,v,wph); const th = thetaE(ti); const pq = parkFromAlphaBeta(a,b,th);
        const P = project3D(pq[1], -FLOOR_Y, i/N); const sx = P[0], sy = -P[1];
        if (i===0) ctxD3.moveTo(sx,sy); else ctxD3.lineTo(sx,sy);
        if (i===N){ q = pq[1]; }
      }
      ctxD3.strokeStyle = COLOR_Q; ctxD3.lineWidth = 2; ctxD3.stroke();

      // current dq vector at z=1
      const p0 = project3D(0,0,1), p1 = project3D(d,q,1);
      ctxD3.beginPath(); ctxD3.moveTo(p0[0], -p0[1]); ctxD3.lineTo(p1[0], -p1[1]); ctxD3.strokeStyle = '#FFCC00'; ctxD3.lineWidth = 2.4; ctxD3.stroke();
      ctxD3.beginPath(); ctxD3.arc(p1[0], -p1[1], 4.5*DPR(), 0, Math.PI*2); ctxD3.fillStyle = '#FFCC00'; ctxD3.fill();

      // guides
      const pDNow = project3D(WALL_X, d, 1); const pQNow = project3D(q, -FLOOR_Y, 1);
      ctxD3.setLineDash([6,6]);
      ctxD3.beginPath(); ctxD3.moveTo(p1[0], -p1[1]); ctxD3.lineTo(pDNow[0], -pDNow[1]); ctxD3.strokeStyle = COLOR_D; ctxD3.stroke();
      ctxD3.beginPath(); ctxD3.moveTo(p1[0], -p1[1]); ctxD3.lineTo(pQNow[0], -pQNow[1]); ctxD3.strokeStyle = COLOR_Q; ctxD3.stroke();
      ctxD3.setLineDash([]);
      ctxD3.beginPath(); ctxD3.arc(pDNow[0], -pDNow[1], 4*DPR(), 0, Math.PI*2); ctxD3.fillStyle = COLOR_D; ctxD3.fill();
      ctxD3.beginPath(); ctxD3.arc(pQNow[0], -pQNow[1], 4*DPR(), 0, Math.PI*2); ctxD3.fillStyle = COLOR_Q; ctxD3.fill();

      ctxD3.restore();
    }

    function updateMath(t){
      const [u,v,w] = uvwAt(t);
      const [a,b] = clarke(u,v,w);
      const k = normalize.checked ? '2/3' : '1';

      const text = `Clarke ( UVW → αβ )

`+
`  [α]   =  ${k} * [  1   -1/2   -1/2 ] [u]
`+
`  [β]           [  0   √3/2  -√3/2 ] [v]
`+
`                                   [w]

`+
`현재 시각 t=${(t).toFixed(3)} s
`+
`  u=${u.toFixed(3)}, v=${v.toFixed(3)}, w=${w.toFixed(3)} ${sumZero.checked? ' (※ U+V+W=0 강제중)':''}
`+
`  α=${a.toFixed(4)}, β=${b.toFixed(4)}`;
      ele("matText").textContent = text;

      const box = ele("deltaBox");
      if (deltaActive && deltaRef){
        const du = (u-deltaRef.u).toFixed(3), dv=(v-deltaRef.v).toFixed(3), dw=(w-deltaRef.w).toFixed(3);
        const da = (a-deltaRef.a).toFixed(4), db=(b-deltaRef.b).toFixed(4);
        box.innerHTML = `<span>Δu=${du}</span><span>Δv=${dv}</span><span>Δw=${dw}</span><span>Δα=${da}</span><span>Δβ=${db}</span>`;
      }
    }

    function tick(now){
    //   const tRunning = ((now - t0)/1000) / +pairs.tscale.r.value;
    //   const t = freeze.checked ? tHold : tRunning;
      const tRunning = simTime(now);
      const t = freeze.checked ? tHold : tRunning;
      drawWave(t);
      drawUVWStatic(t);
      drawUVW3D(t);

      drawAlphaBetaTime(t);
      drawAlphaBeta(t);
      drawAlphaBeta3D(t);

      drawParkTime(t);
      drawParkStatic(t);
      drawPark3D(t);

      drawInvParkTime(t);
      drawInvParkStatic(t);
      //drawInvPark3D(t);

      drawInvClarkTime(t);
      drawInvClarkStatic(t);
      //drawInvClark3D(t);

      updateMath(t);
      updateMathUVW(t);
      updateMathPark(t);

      requestAnimationFrame(tick);
    }

    // kick off after DOM is ready (script is at the end, but ensure layout is done)
    window.addEventListener('load', init);

    function updateMathPark(t){
      const [u,v,w] = uvwAt(t); const [a,b] = clarke(u,v,w); const th = thetaE(t); const [d,q] = parkFromAlphaBeta(a,b,th);
      const text = `Park (αβ→dq, θe=${(th).toFixed(3)} rad)

`
        + `  [d]   = [ cosθe   sinθe] [α]
`
        + `  [q]     [-sinθe   cosθe] [β]

`
        + `현재 시각 t=${t.toFixed(3)} s
`
        + `  α=${a.toFixed(3)}, β=${b.toFixed(3)}
`
        + `  d=${d.toFixed(4)}, q=${q.toFixed(4)}`;
      const el = document.getElementById("matPark"); if (el) el.textContent = text;
    }

    function updateMathUVW(t){
      const [u,v,w] = uvwAt(t);
      const text = `UVW (time-domain)

`
        + `  u(t) = offU + ampU·sin(2π f t + φU)
`
        + `  v(t) = offV + ampV·sin(2π f t + φV)
`
        + `  w(t) = offW + ampW·sin(2π f t + φW)

`
        + `현재 시각 t=${t.toFixed(3)} s
`
        + `  u=${u.toFixed(3)}, v=${v.toFixed(3)}, w=${w.toFixed(3)}`;
      const el = document.getElementById("matUVW"); if (el) el.textContent = text;
    }