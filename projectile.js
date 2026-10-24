export function projectile(ctx,b){
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.scale(b.size,b.size);
 const ellipse=(x,y,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
 if(b.type==='egg'){
  ctx.strokeStyle=b.gold?'#f9d45b66':'#e8e2c92a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-19,0);ctx.lineTo(-7,0);ctx.stroke();
  const g=ctx.createRadialGradient(1,-2,1,0,0,9);g.addColorStop(0,b.gold?'#fff6b3':'#ffffff');g.addColorStop(.6,b.gold?'#ffd451':'#f5e9cf');g.addColorStop(1,b.gold?'#b77a1e':'#c1aa85');ellipse(0,0,8,5.5,g);ellipse(2,-2,2.7,1.1,'#ffffffaa');
 }else if(b.type==='feather'){
  const g=ctx.createLinearGradient(0,-4,0,4);g.addColorStop(0,'#fff4dc');g.addColorStop(.5,'#e2c394');g.addColorStop(1,'#aa7950');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-11,0);ctx.bezierCurveTo(-6,-7,7,-6,12,0);ctx.bezierCurveTo(5,5,-5,6,-11,0);ctx.fill();ctx.strokeStyle='#8f6746';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(11,0);for(let x=-6;x<8;x+=4){ctx.moveTo(x,0);ctx.lineTo(x-2,-3);ctx.moveTo(x,0);ctx.lineTo(x-2,3);}ctx.stroke();
 }else{
  const g=ctx.createLinearGradient(-14,0,8,0);g.addColorStop(0,'#ffd35a00');g.addColorStop(.65,'#f4b447');g.addColorStop(1,'#fff3bd');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-17,-1);ctx.lineTo(5,-2);ctx.quadraticCurveTo(10,0,5,2);ctx.lineTo(-17,1);ctx.fill();
 }
 ctx.restore();
}
