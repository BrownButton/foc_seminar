function uvwAt(t){
    const A0 = +pairs.amp.r.value;
    const u = +pairs.offU.r.value + (+pairs.ampU.r.value || A0) * Math.sin(2*Math.PI*+pairs.freq.r.value * t + deg2rad(+pairs.phiU.r.value));
    const v = +pairs.offV.r.value + (+pairs.ampV.r.value || A0) * Math.sin(2*Math.PI*+pairs.freq.r.value * t + deg2rad(+pairs.phiV.r.value));
    let w = +pairs.offW.r.value + (+pairs.ampW.r.value || A0) * Math.sin(2*Math.PI*+pairs.freq.r.value * t + deg2rad(+pairs.phiW.r.value));
    if (sumZero.checked) w = -(u+v);
    return [u,v,w];
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
