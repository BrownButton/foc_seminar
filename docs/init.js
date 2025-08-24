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
    // drawInvPark3D(t);

    drawInvClarkTime(t);
    drawInvClarkStatic(t);
    // drawInvClark3D(t);

    updateMath(t);
    updateMathUVW(t);
    updateMathPark(t);

    requestAnimationFrame(tick);
}

function callAnimeFrame(){
    requestAnimationFrame(tick);
}
