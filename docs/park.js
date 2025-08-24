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