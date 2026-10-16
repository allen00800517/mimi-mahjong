import {compactFlowerSVG} from './flower-display.mjs';
import {tileLabel} from './scoring.mjs';
const digits=['','一','二','三','四','五','六','七','八','九'];
const dot=(x,y,c,r=5)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'" stroke="'+c+'" stroke-width=".4"/><circle cx="'+x+'" cy="'+y+'" r="'+(r*.5)+'" fill="#fff9"/>';
const green='#1d6946',red='#b62929',blue='#25365e';
function legacyTileFace(t){
const n=Number(t[0]),s=t[1];let face='';
if(s==='m')face='<text x="24" y="27" text-anchor="middle" font-family="KaiTi,DFKai-SB,serif" font-size="24" font-weight="bold" fill="'+blue+'">'+digits[n]+'</text><text x="24" y="57" text-anchor="middle" font-family="KaiTi,DFKai-SB,serif" font-size="26" font-weight="bold" fill="'+red+'">萬</text>';
if(s==='p'){
const positions={1:[[24,34]],2:[[24,19],[24,49]],3:[[12,16],[24,34],[36,52]],4:[[13,19],[35,19],[13,49],[35,49]],5:[[12,17],[36,17],[24,34],[12,51],[36,51]],6:[[13,14],[35,14],[13,34],[35,34],[13,54],[35,54]],7:[[11,11],[24,20],[37,29],[13,42],[35,42],[13,56],[35,56]],8:[[13,12],[35,12],[13,27],[35,27],[13,42],[35,42],[13,57],[35,57]],9:[[11,13],[24,13],[37,13],[11,34],[24,34],[37,34],[11,55],[24,55],[37,55]]};
face=positions[n].map(([x,y],i)=>dot(x,y,n===1?blue:n===5&&i===2?red:n>=7&&i<3?red:(i%2?green:blue),n===1?14:n>=8?4.4:5.8)).join('');
}
if(s==='s'){
if(n===1)face='<image href="./assets/bamboo-one.png" x="3" y="2" width="42" height="64" preserveAspectRatio="xMidYMid meet"/>';
else{const cols=n<=3?1:n===4||n===6||n===8?2:3,rows=Math.ceil(n/cols);for(let i=0;i<n;i++){const x=cols===1?24:cols===2?15+(i%cols)*18:10+(i%cols)*14,y=14+Math.floor(i/cols)*(rows===2?31:rows===3?20:14),c=(n===5&&i===2)||n===7&&i===0||n===9&&i%3===1?red:green;face+='<rect x="'+(x-2.5)+'" y="'+y+'" width="5" height="'+(rows===2?18:11)+'" rx="2" fill="'+c+'"/><path d="M'+(x-4)+','+(y+3)+'h8M'+(x-4)+','+(y+8)+'h8" stroke="'+c+'" stroke-width="1.5"/>';}}
}
if(s==='z'){const v=['','東','南','西','北','白','發','中'][n],c=n===6?green:n===7?red:blue;face=n===5?'<rect x="7" y="9" width="34" height="49" rx="3" fill="none" stroke="#2d4864" stroke-width="3"/><rect x="11" y="13" width="26" height="41" rx="1" fill="none" stroke="#2d4864" stroke-width="1"/>':'<text x="24" y="48" text-anchor="middle" font-family="KaiTi,DFKai-SB,serif" font-size="37" font-weight="bold" fill="'+c+'">'+v+'</text>';}
if(s==='f'){const v=['','春','夏','秋','冬','梅','蘭','菊','竹'][n];face='<text x="7" y="13" font-size="11" fill="'+(n<=4?blue:red)+'">'+((n-1)%4+1)+'</text><text x="24" y="44" text-anchor="middle" font-family="KaiTi,DFKai-SB,serif" font-size="27" fill="'+(n<=4?blue:red)+'">'+v+'</text><path d="M13 56 Q24 47 35 56" fill="none" stroke="'+green+'" stroke-width="2"/>';}
return '<svg viewBox="0 0 48 68" role="img" aria-label="'+tileLabel(t)+'">'+face+'</svg>';
}
let flowerSkin='character',faceImages=new Map();
export function setFaceImages(images){for(const url of faceImages.values())URL.revokeObjectURL(url);faceImages=images;}
export function setFlowerSkin(value){flowerSkin=value==='botanical'?'botanical':'character';return flowerSkin;}
export function concealedFace(){return '<img class="tile-art tile-back" src="'+(faceImages.get('back')||'./assets/table-v52/back-plain.png')+'" alt="玉綠素面牌背" draggable="false">';}

export function tileFace(t,{compact=false}={}){
 const label=tileLabel(t);
 if(compact&&/^[1-8]f$/.test(t))return '<img class="tile-art" src="'+(faceImages.get('compact/'+t)||'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(compactFlowerSVG(t)))+'" alt="'+label+'" draggable="false">';
 const src=faceImages.get(t.endsWith('f')?flowerSkin+'/'+t:t);if(src)return '<img class="tile-art" src="'+src+'" alt="'+label+'" draggable="false">';
 if(/^[1-8]f$/.test(t))return '<img class="tile-art flower-art" src="./assets/flower-art/'+flowerSkin+'/'+t+'.png" alt="'+label+'" draggable="false">';
 if(/^(?:[1-9][mps]|[1-7]z)$/.test(t))return '<img class="tile-art" src="./assets/tile-art/'+t+'.png" alt="'+label+'" draggable="false">';
 const legacy=legacyTileFace(t),inner=legacy.slice(legacy.indexOf('>')+1,legacy.lastIndexOf('</svg>'));
 return '<svg viewBox="0 0 48 68" role="img" aria-label="'+label+'"><image href="./assets/tile-art/tile-body.png" x="0" y="0" width="48" height="68"/><g transform="translate(2.5 3) scale(.895 .895)">'+inner+'</g></svg>';
}
