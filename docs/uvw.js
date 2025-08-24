function uvwAt(t){
    const A0 = +pairs.amp.r.value;
    const u = +pairs.offU.r.value + (+pairs.ampU.r.value || A0) * Math.sin(2*Math.PI*+pairs.freq.r.value * t + deg2rad(+pairs.phiU.r.value));
    const v = +pairs.offV.r.value + (+pairs.ampV.r.value || A0) * Math.sin(2*Math.PI*+pairs.freq.r.value * t + deg2rad(+pairs.phiV.r.value));
    let w = +pairs.offW.r.value + (+pairs.ampW.r.value || A0) * Math.sin(2*Math.PI*+pairs.freq.r.value * t + deg2rad(+pairs.phiW.r.value));
    if (sumZero.checked) w = -(u+v);
    return [u,v,w];
}