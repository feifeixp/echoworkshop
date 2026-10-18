/* 横版场景：角色、物件、渲染循环 */
import {$} from '../app/dom.js';
import {S} from '../app/store.js';
import {clamp} from '../core/util.js';
import {isInside,paintScene} from './art.js';
import {believedMarks,buildObjs,drawPrompt,refreshObjs,renderMenu} from './objects.js';

export const OBJ_H={door:96,person:74,item:44,sign:76,orb:80,ghost:64};
export const GM={menu:null,floats:[],raf:0,keys:{l:false,r:false},px:60,face:1,last:0,walk:0,objs:[],near:-1,bg:null,bgW:0,W:0,H:0,WW:0,ground:0,busy:false,shake:0,dpr:1,nudge:''};
export function buildScene(resetPos){
  const st=$('#stage');const r=st.getBoundingClientRect();if(!r.width)return;
  const dpr=GM.dpr=Math.min(2,devicePixelRatio||1);GM.W=r.width;GM.H=r.height;GM.ground=Math.round(GM.H*.84);
  const n=S.G.nodes[S.P.node];const ops=n?n.options:[];
  GM.WW=Math.max(GM.W*1.5,250*new Set(ops.map((o,i)=>(o.obj||'').trim()||'#'+i)).size+360);
  GM.bgW=Math.round(GM.W*1.35);const c=document.createElement('canvas');c.width=GM.bgW*dpr;c.height=GM.H*dpr;const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);paintScene(x,GM.bgW,GM.H,S.P.node);GM.bg=c;
  GM.menu=null;renderMenu();GM.objs=buildObjs();refreshObjs();
  if(resetPos){GM.px=Math.max(46,GM.WW*.06);GM.face=1;GM.floats=[]}
  const art=$('#art');art.width=GM.W*dpr;art.height=GM.H*dpr;
}
export function startGame(){if(!GM.raf){GM.last=0;GM.raf=requestAnimationFrame(frame)}}
export function stopGame(){cancelAnimationFrame(GM.raf);GM.raf=0;GM.keys.l=GM.keys.r=false}
export function frame(ts){
  const dt=Math.min(.05,GM.last?(ts-GM.last)/1000:0);GM.last=ts;
  if(S.P&&!S.P.end&&!GM.busy&&!GM.menu){const d=(GM.keys.r?1:0)-(GM.keys.l?1:0);
    if(d){GM.face=d;GM.px=clamp(GM.px+d*240*dt,26,GM.WW-26);GM.walk+=dt*10}else GM.walk=0}
  if(!GM.menu){let best=-1,bd=64;GM.objs.forEach((ob,k)=>{if(ob.gone)return;const dd=Math.abs(ob.x-GM.px);if(dd<bd){bd=dd;best=k}});
  if(best!==GM.near){GM.near=best;GM.nudge=''}}
  GM.shake=Math.max(0,GM.shake-dt);GM.floats.forEach(f=>{f.life-=dt;f.y-=dt*28});GM.floats=GM.floats.filter(f=>f.life>0);
  if(GM.bg)render(ts/1000);
  GM.raf=requestAnimationFrame(frame);
}
export function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
export function drawObj(x,ob,near,t){
  const cx=ob.x,gy=GM.ground;const k=ob.hidden?'ghost':ob.kind;
  if(near&&!ob.hidden){const eg=x.createRadialGradient(cx,gy,0,cx,gy,70);eg.addColorStop(0,'rgba(240,199,126,.35)');eg.addColorStop(1,'rgba(240,199,126,0)');x.fillStyle=eg;x.fillRect(cx-70,gy-30,140,60)}
  x.save();
  if(near&&!ob.hidden){x.shadowColor='rgba(240,199,126,.9)';x.shadowBlur=16}
  const edge=near&&!ob.hidden?'#f0c77e':'#5b4a30';
  if(k==='door'){const w=54,h=96;x.beginPath();x.moveTo(cx-w/2-6,gy);x.lineTo(cx-w/2-6,gy-h+w/2);x.arc(cx,gy-h+w/2,w/2+6,Math.PI,0);x.lineTo(cx+w/2+6,gy);x.closePath();x.fillStyle='#1c1a1c';x.fill();
    x.beginPath();x.moveTo(cx-w/2,gy);x.lineTo(cx-w/2,gy-h+w/2);x.arc(cx,gy-h+w/2,w/2,Math.PI,0);x.lineTo(cx+w/2,gy);x.closePath();x.fillStyle='#24180f';x.fill();x.lineWidth=2.5;x.strokeStyle=edge;x.stroke();
    x.shadowBlur=0;x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=1.5;for(let p=-1;p<=1;p++){x.beginPath();x.moveTo(cx+p*13,gy);x.lineTo(cx+p*13,gy-h+20);x.stroke()}
    x.fillStyle='rgba(240,180,90,.55)';x.fillRect(cx-w/2+3,gy-3,w-6,3);
    x.beginPath();x.arc(cx+16,gy-h*.45,3,0,7);x.fillStyle='#d9a653';x.fill();
    if(ob.locked){x.fillStyle='#8a6b35';x.fillRect(cx-8,gy-h*.42,16,13);x.beginPath();x.arc(cx,gy-h*.42,6,Math.PI,0);x.lineWidth=2.5;x.strokeStyle='#8a6b35';x.stroke()}
  }else if(k==='person'){const b=Math.sin(t*1.6+ob.i)*1.2;
    x.fillStyle='#06080d';x.beginPath();x.moveTo(cx-18,gy);x.lineTo(cx-13,gy-50+b);x.quadraticCurveTo(cx,gy-56+b,cx+13,gy-50+b);x.lineTo(cx+18,gy);x.closePath();x.fill();
    x.beginPath();x.arc(cx,gy-62+b,10,0,7);x.fill();
    x.shadowBlur=near?16:0;x.lineWidth=1.4;x.strokeStyle=near?'#f0c77e':'rgba(143,163,184,.45)';x.beginPath();x.arc(cx,gy-62+b,10,Math.PI*1.1,Math.PI*1.9);x.stroke();
    x.beginPath();x.moveTo(cx+13,gy-50+b);x.lineTo(cx+18,gy);x.stroke();
  }else if(k==='item'){x.fillStyle='#20180f';x.fillRect(cx-24,gy-26,48,5);x.fillRect(cx-20,gy-21,4,21);x.fillRect(cx+16,gy-21,4,21);
    const p=.75+Math.sin(t*3+ob.i)*.25;const ig=x.createRadialGradient(cx,gy-36,0,cx,gy-36,26);ig.addColorStop(0,`rgba(240,199,126,${.55*p})`);ig.addColorStop(1,'rgba(240,199,126,0)');x.fillStyle=ig;x.fillRect(cx-28,gy-64,56,56);
    x.beginPath();x.arc(cx,gy-34,5,0,7);x.fillStyle='#f0c77e';x.fill();
    if(ob.locked){x.shadowBlur=0;x.fillStyle='rgba(13,16,24,.6)';x.fillRect(cx-26,gy-60,52,60)}
  }else if(k==='sign'){x.fillStyle='#2a2118';x.fillRect(cx-3,gy-76,6,76);
    x.beginPath();x.moveTo(cx-30,gy-70);x.lineTo(cx+22,gy-70);x.lineTo(cx+34,gy-61);x.lineTo(cx+22,gy-52);x.lineTo(cx-30,gy-52);x.closePath();x.fillStyle='#3a2c1c';x.fill();x.lineWidth=2;x.strokeStyle=edge;x.stroke();
    x.shadowBlur=0;x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=1;x.beginPath();x.moveTo(cx-24,gy-61);x.lineTo(cx+18,gy-61);x.stroke();
  }else if(k==='orb'){const y=gy-56+Math.sin(t*2+ob.i)*6;const og=x.createRadialGradient(cx,y,0,cx,y,30);og.addColorStop(0,'rgba(142,174,234,.7)');og.addColorStop(1,'rgba(142,174,234,0)');x.fillStyle=og;x.fillRect(cx-30,y-30,60,60);
    x.beginPath();x.arc(cx,y,5,0,7);x.fillStyle='#dfe9ff';x.fill();
  }else{for(let q=0;q<5;q++){const a=t*.6+q*1.3;x.beginPath();x.arc(cx+Math.cos(a)*14,gy-40+Math.sin(a*1.3)*10,16+q*2,0,7);x.fillStyle='rgba(159,179,200,.07)';x.fill()}
    x.font='600 20px "Noto Serif SC",serif';x.textAlign='center';x.fillStyle='rgba(159,179,200,.35)';x.fillText('？',cx,gy-34)}
  x.restore();
  const m=believedMarks(ob.idx);
  if(m&&!ob.hidden){const y=gy-OBJ_H[k]-18+Math.sin(t*3)*2;const label=m==='go'?'残响：在这里':'残响：危险';x.font='600 12px "Noto Sans SC",sans-serif';const w=x.measureText(label).width+16;
    rr(x,cx-w/2,y-12,w,20,10);x.fillStyle=m==='go'?'rgba(18,44,39,.92)':'rgba(52,19,24,.92)';x.fill();x.strokeStyle=m==='go'?'#63b79f':'#c9444f';x.lineWidth=1;x.stroke();
    x.fillStyle=m==='go'?'#63b79f':'#e2686f';x.textAlign='center';x.fillText(label,cx,y+3)}
}
export function drawPlayer(x,px,gy,face,walk,t){
  const lx=px+face*20,ly=gy-38;
  const lg=x.createRadialGradient(lx,ly,0,lx,ly,170);lg.addColorStop(0,'rgba(240,180,90,.22)');lg.addColorStop(1,'rgba(240,180,90,0)');x.fillStyle=lg;x.fillRect(lx-170,ly-170,340,340);
  x.save();x.translate(px,gy);x.scale(face,1);
  const sw=Math.sin(walk)*7,bob=walk?Math.abs(Math.cos(walk))*1.5:Math.sin(t*2)*.6;
  x.fillStyle='rgba(0,0,0,.5)';x.beginPath();x.ellipse(0,0,18,4,0,0,7);x.fill();
  x.strokeStyle='#0a0c12';x.lineWidth=6;x.lineCap='round';
  x.beginPath();x.moveTo(-3,-26);x.lineTo(-3+sw,-2);x.moveTo(4,-26);x.lineTo(4-sw,-2);x.stroke();
  x.translate(0,-bob);
  x.fillStyle='#1d2433';x.beginPath();x.moveTo(-14,-20);x.lineTo(-10,-56);x.lineTo(10,-56);x.lineTo(15,-20);x.closePath();x.fill();
  x.strokeStyle='rgba(240,199,126,.45)';x.lineWidth=1.3;x.beginPath();x.moveTo(10,-56);x.lineTo(15,-20);x.stroke();
  x.fillStyle='#8a2f36';x.fillRect(-9,-59,18,4);
  x.fillStyle='#161b26';x.beginPath();x.arc(0,-67,9,0,7);x.fill();
  x.fillStyle='#0d1018';x.beginPath();x.ellipse(0,-73,14,3,0,0,7);x.fill();x.fillRect(-8,-86,16,13);
  x.strokeStyle='rgba(240,199,126,.5)';x.beginPath();x.arc(0,-67,9,-.9,.6);x.stroke();
  x.strokeStyle='#1d2433';x.lineWidth=5;x.beginPath();x.moveTo(6,-50);x.lineTo(18,-40);x.stroke();
  const fl=.85+Math.sin(t*9)*.1;x.fillStyle='#3a2c1c';x.fillRect(15,-44,10,3);x.fillStyle=`rgba(240,199,126,${fl})`;x.fillRect(16,-41,8,11);x.fillStyle='#3a2c1c';x.fillRect(15,-30,10,2);
  x.restore();
}
export function render(t){
  const c=$('#art'),x=c.getContext('2d');const {W,H,WW}=GM;x.setTransform(GM.dpr,0,0,GM.dpr,0,0);x.clearRect(0,0,W,H);
  const cam=clamp(GM.px-W/2,0,Math.max(0,WW-W));
  const bx=-(WW>W?cam/(WW-W):0)*(GM.bgW-W);x.drawImage(GM.bg,bx,0,GM.bgW,H);
  x.save();x.translate(-cam,0);
  const gy=GM.ground;const n=S.G.nodes[S.P.node]||{};const inside=isInside(n);
  const gg=x.createLinearGradient(0,gy,0,H);gg.addColorStop(0,inside?'#1a1719':'#10131b');gg.addColorStop(1,'#050608');x.fillStyle=gg;x.fillRect(cam-4,gy,W+8,H-gy);
  x.strokeStyle='rgba(143,163,184,.22)';x.lineWidth=1;x.beginPath();x.moveTo(cam,gy+.5);x.lineTo(cam+W,gy+.5);x.stroke();
  x.strokeStyle='rgba(255,255,255,.035)';for(let row=0;row<4;row++){const y=gy+8+row*row*5+row*6;const step=30+row*10;x.beginPath();x.moveTo(cam,y);x.lineTo(cam+W,y);
    for(let k=Math.floor(cam/step)-1;k*step<cam+W+step;k++){const xx=k*step+(row%2?step/2:0);x.moveTo(xx,y);x.lineTo(xx-3,y+6+row*3)}x.stroke()}
  GM.objs.forEach((ob,k)=>{if(!ob.gone)drawObj(x,ob,k===GM.near&&!S.P.end,t)});
  if(!S.P.end)drawPlayer(x,GM.px,gy,GM.face,GM.walk,t);
  GM.floats.forEach(f=>{x.globalAlpha=Math.min(1,f.life/.5);x.font='700 15px "Noto Serif SC",serif';x.textAlign='center';x.lineWidth=3;x.strokeStyle='rgba(0,0,0,.7)';x.strokeText(f.text,f.x,f.y);x.fillStyle=f.col;x.fillText(f.text,f.x,f.y);x.globalAlpha=1});
  x.restore();
  if(!S.P.end&&GM.near>=0)drawPrompt(x,GM.objs[GM.near],cam);
}
