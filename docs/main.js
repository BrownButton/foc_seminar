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

    const inv_abT = document.getElementById("inv_alphaBetaTime"); const ctxIABT = inv_abT.getContext('2d');
    const inv_abS = document.getElementById("inv_alphaBeta"); const ctxIABS = inv_abS.getContext('2d');
    const inv_ab3 = document.getElementById("inv_alphaBeta3D"); const ctxIAB3 = inv_ab3.getContext('2d');

    const inv_uvwT = document.getElementById("inv_uvwTime"); const ctxIuvwT = inv_uvwT.getContext('2d');
    const inv_uvwS = document.getElementById("inv_uvw"); const ctxIuvwS = inv_uvwS.getContext('2d');
    const inv_uvw3 = document.getElementById("inv_uvw3D"); const ctxIuvw3 = inv_uvw3.getContext('2d');

    function resizeCanvas() {
      const ratio = DPR();
      [wave,ab,abT,ab3,uvw3,uvwS,dqT,dq3,dqS,inv_abT,inv_ab3,inv_abS,inv_uvwT,inv_uvwS,inv_uvw3].forEach(c=>{ const rect = c.getBoundingClientRect(); c.width = Math.max(1, Math.floor(rect.width * ratio)); c.height = Math.max(1, Math.floor(rect.height * ratio)); });
    }
      
    addEventListener('resize', resizeCanvas);

    let t0 = 0, tHold = 0;
    function init(){
  
      resizeCanvas();
      t0 = performance.now();
      callAnimeFrame();
    }

    const deg2rad = d => d * Math.PI/180;

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
      document.getElementById("matText").textContent = text;

      const box = document.getElementById("deltaBox");
      if (deltaActive && deltaRef){
        const du = (u-deltaRef.u).toFixed(3), dv=(v-deltaRef.v).toFixed(3), dw=(w-deltaRef.w).toFixed(3);
        const da = (a-deltaRef.a).toFixed(4), db=(b-deltaRef.b).toFixed(4);
        box.innerHTML = `<span>Δu=${du}</span><span>Δv=${dv}</span><span>Δw=${dw}</span><span>Δα=${da}</span><span>Δβ=${db}</span>`;
      }
    }

    

    // kick off after DOM is ready (script is at the end, but ensure layout is done)
    window.addEventListener('load', init());

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