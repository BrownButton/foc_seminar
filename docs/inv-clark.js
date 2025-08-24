
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