
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