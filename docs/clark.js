
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
        //const px = aa * S - 110, py = -bb * S - 50; // p0[0], -p0[1]
        //const px = p0[0], py = -p0[1]; // p0[0], -p0[1]
        const px = p1[0], py = -p1[1]
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
