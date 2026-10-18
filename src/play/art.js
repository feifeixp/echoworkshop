/* 场景背景的程序化绘制 */
import {S} from '../app/store.js';
import {rng} from '../core/util.js';

export const isInside=n=>/窖|墙|楼梯|告解|钟房|井|石门/.test(n.title+n.text);
export function paintScene(x,W,H,id){
  const n=S.G.nodes[id]||{title:'',text:'',type:'story'},R=rng(id+n.title);
  const txt=n.title+n.text;const dead=n.type==='death',won=n.type==='ending'&&n.ending==='true';
  const inside=isInside(n);
  let g=x.createLinearGradient(0,0,0,H);
  if(dead){g.addColorStop(0,'#2a0a10');g.addColorStop(1,'#0a0709')}
  else if(won){g.addColorStop(0,'#4a3520');g.addColorStop(.55,'#2a2a3a');g.addColorStop(1,'#141a26')}
  else if(inside){g.addColorStop(0,'#0c0f16');g.addColorStop(1,'#16141a')}
  else{g.addColorStop(0,'#0b1220');g.addColorStop(.7,'#1a2436');g.addColorStop(1,'#232c3d')}
  x.fillStyle=g;x.fillRect(0,0,W,H);
  if(!inside){
    for(let i=0;i<90;i++){x.fillStyle=`rgba(230,225,210,${R()*.5})`;x.fillRect(R()*W,R()*H*.5,1,1)}
    const mx=W*(.6+R()*.28),my=H*.18,mr=dead?26:22;
    const mg=x.createRadialGradient(mx,my,0,mx,my,mr*5);mg.addColorStop(0,dead?'rgba(201,68,79,.35)':won?'rgba(240,199,126,.5)':'rgba(220,226,240,.25)');mg.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=mg;x.fillRect(0,0,W,H);x.beginPath();x.arc(mx,my,mr,0,7);x.fillStyle=dead?'#d75a64':won?'#f6d494':'#e7e4da';x.fill();
    const far='#121928',near=dead?'#0b070c':'#0a0d14';
    const skyline=(base,col,hmin,hmax,lit)=>{x.fillStyle=col;let px=-10;while(px<W+10){const w=26+R()*48,h=hmin+R()*(hmax-hmin);x.fillRect(px,base-h,w,h+H);
        x.beginPath();x.moveTo(px-3,base-h);x.lineTo(px+w/2,base-h-10-R()*18);x.lineTo(px+w+3,base-h);x.fill();
        if(lit)for(let k=0;k<2;k++)if(R()<.45){x.fillStyle=won?'rgba(240,199,126,.9)':'rgba(217,166,83,.8)';x.fillRect(px+5+R()*(w-12),base-h+8+R()*(h-16),4,6);x.fillStyle=col}
        px+=w+R()*6}};
    skyline(H*.7,far,30,90,false);
    if(/钟|楼|塔/.test(txt)){const tx=W*(.15+R()*.3),tw=46,th=H*.6;x.fillStyle=near;x.fillRect(tx,H*.84-th,tw,th+H);x.beginPath();x.moveTo(tx-6,H*.84-th);x.lineTo(tx+tw/2,H*.84-th-52);x.lineTo(tx+tw+6,H*.84-th);x.fill();
      x.beginPath();x.arc(tx+tw/2,H*.84-th+26,11,0,7);x.fillStyle=dead?'rgba(201,68,79,.8)':'rgba(217,166,83,.75)';x.fill()}
    if(/教堂|神父|祷告/.test(txt)){const cx=W*(.62+R()*.15),cw=96,ch=H*.42;x.fillStyle=near;x.fillRect(cx,H*.84-ch,cw,ch+H);x.beginPath();x.moveTo(cx-8,H*.84-ch);x.lineTo(cx+cw/2,H*.84-ch-40);x.lineTo(cx+cw+8,H*.84-ch);x.fill();
      x.fillRect(cx+cw/2-2,H*.84-ch-70,4,32);x.fillRect(cx+cw/2-11,H*.84-ch-60,22,4);
      x.fillStyle='rgba(217,166,83,.6)';x.beginPath();x.arc(cx+cw/2,H*.84-ch+30,12,Math.PI,0);x.fill();x.fillRect(cx+cw/2-12,H*.84-ch+30,24,20)}
    skyline(H*.84,near,30,90,true);
  }else{
    for(let row=0;row*22<H;row++)for(let col=-1;col*46<W;col++){const off=row%2?23:0;x.fillStyle=`rgba(${38+R()*14},${34+R()*12},${42+R()*12},.95)`;x.fillRect(col*46+off+1,row*22+1,44,20)}
    const arches=Math.max(3,Math.round(W/260));for(let i=0;i<arches;i++){const ax=W*(i+.5)/arches,aw=Math.min(120,W/5),ah=H*.6;x.fillStyle='#07080c';x.beginPath();x.moveTo(ax-aw/2,H);x.lineTo(ax-aw/2,H-ah+aw/2);x.arc(ax,H-ah+aw/2,aw/2,Math.PI,0);x.lineTo(ax+aw/2,H);x.fill()}
    if(/名字|墙/.test(txt)){x.strokeStyle='rgba(232,224,207,.2)';x.lineWidth=1;for(let i=0;i<90;i++){const px=R()*W,py=R()*H*.7;x.beginPath();x.moveTo(px,py);x.lineTo(px+6+R()*18,py);x.stroke()}}
    const cg=x.createRadialGradient(W*.5,H*.8,0,W*.5,H*.8,H*.9);cg.addColorStop(0,dead?'rgba(201,68,79,.3)':'rgba(217,166,83,.18)');cg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=cg;x.fillRect(0,0,W,H);
  }
  const fg=x.createLinearGradient(0,H*.55,0,H);fg.addColorStop(0,'rgba(143,163,184,0)');fg.addColorStop(1,dead?'rgba(80,20,28,.5)':'rgba(143,163,184,.22)');x.fillStyle=fg;x.fillRect(0,H*.55,W,H*.45);
}
