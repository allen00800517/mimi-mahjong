import { waitingTiles, isWinningShape, declarationGroupTai, dealerTai } from './rules-core.mjs';
export const TILES = [...'mps'].flatMap(s => Array.from({length:9},(_,i)=>String(i+1)+s)).concat(Array.from({length:7},(_,i)=>String(i+1)+'z'));
export const sortTiles = a => [...a].sort((x,y)=>TILES.indexOf(x)-TILES.indexOf(y));
export const tileLabel = t => t?.[1]==='f' ? '春夏秋冬梅蘭菊竹'[+t[0]-1] : t?.[1]==='z' ? ['東','南','西','北','白','發','中'][+t[0]-1] : (t?.[0]??'')+(({m:'萬',p:'筒',s:'索'})[t?.[1]]??'');
export function decompositions(hand, melds=[]) {
  if (!isWinningShape(hand,melds)) return [];
  const c = TILES.map(t=>hand.filter(x=>x===t).length), out=[];
  function walk(sets,pair) {
    const i=c.findIndex(n=>n);
    if(i<0) { if(pair&&sets.length+melds.length===5) out.push({pair,sets:[...sets]}); return; }
    if(!pair&&c[i]>=2) { c[i]-=2; walk(sets,TILES[i]); c[i]+=2; }
    if(sets.length+melds.length>=5) return;
    if(c[i]>=3) { c[i]-=3; walk([...sets,{kind:'triplet',tiles:Array(3).fill(TILES[i])}],pair); c[i]+=3; }
    if(i<27&&i%9<7&&c[i+1]&&c[i+2]) { c[i]--;c[i+1]--;c[i+2]--; walk([...sets,{kind:'sequence',tiles:TILES.slice(i,i+3)}],pair); c[i]++;c[i+1]++;c[i+2]++; }
  }
  walk([],null); return out;
}
function placements(d,win) {
  const out=[];
  if(d.pair===win) out.push({kind:'pair',index:-1});
  d.sets.forEach((s,i)=>{if(s.tiles.includes(win)) {
    let kind=s.kind;
    if(kind==='sequence') kind=s.tiles[1]===win?'inside':((s.tiles[0][0]==='1'&&win[0]==='3')||(s.tiles[0][0]==='7'&&win[0]==='7'))?'edge':'side';
    out.push({kind,index:i});
  }}); return out;
}
export function flowerTai(flowers,seatWind) {
  if(flowers.length===8)return 8;
  let tai=0; for(let start=1;start<=5;start+=4) { const group=flowers.filter(t=>+t[0]>=start&&+t[0]<start+4); tai+=group.length===4?2:group.includes(String(start+seatWind)+'f')?1:0; } return tai;
}
export function scoreHand({hand,melds=[],flowers=[],winTile,method='ron',state='S0',seatWind=0,roundWind=0,replacement=false,lastTile=false,opening=null,flowerRob=false,flowerOverride=null}) {
  if(!Array.isArray(hand)||!TILES.includes(winTile)||!hand.includes(winTile))throw new TypeError('胡牌張必須實際存在於暗手');
  if(!Number.isInteger(seatWind)||seatWind<0||seatWind>3||!Number.isInteger(roundWind)||roundWind<0||roundWind>3)throw new TypeError('風位不正確');
  if(typeof replacement!=='boolean'||typeof lastTile!=='boolean'||!['ron','tsumo','rob_added_kan'].includes(method)||![null,'heaven','earth','human'].includes(opening))throw new TypeError('胡牌事件不正確');
  if(typeof flowerRob!=='boolean'||(flowerRob&&(method!=='ron'||!replacement))||(flowerOverride!==null&&(!Number.isInteger(flowerOverride)||flowerOverride<0||flowerOverride>8)))throw new TypeError('花胡來源不正確');
  if((replacement&&method!=='tsumo'&&!flowerRob)||(method==='rob_added_kan'&&(lastTile||opening!==null))||(opening==='human'&&method!=='ron')||(['heaven','earth'].includes(opening)&&method!=='tsumo'))throw new TypeError('胡牌來源與事件台互相矛盾');
  if(!Array.isArray(flowers)||new Set(flowers).size!==flowers.length||flowers.some(t=>!String(t).match(/^[1-8]f$/)))throw new TypeError('花牌不正確');
  const ds=decompositions(hand,melds); if(!ds.length) throw Error('不是合法胡牌');
  const before=[...hand]; before.splice(before.indexOf(winTile),1);
  const waits=waitingTiles(before,melds), menzen=melds.every(m=>m.kind==='concealedKan');
  const pinfuExcluded=ds.some(d=>placements(d,winTile).some(p=>['pair','inside','edge'].includes(p.kind))) || waits.some(t=>decompositions([...before,t],melds).some(d=>d.pair===t));
  const all=[...hand,...melds.flatMap(m=>m.tiles)], suits=new Set(all.filter(t=>t[1]!=='z').map(t=>t[1])), honor=all.some(t=>t[1]==='z');
  const candidates=[];
  for(const d of ds) for(const pos of placements(d,winTile)) {
    const rows=[], add=(name,tai)=>{if(tai) rows.push({name,tai});};
    const pending=[];
    const group=opening==='human'&&state==='S2'?(menzen?1:0):declarationGroupTai({state,method,menzen});
    add(opening==='human'&&state==='S2'?'門清':state==='S3'?'天聽組':state==='S2'?'地聽組':state==='S1'?'宣告與自摸／門清組':method==='tsumo'?(menzen?'門清自摸':'自摸'):'門清',group);
    const sets=[...d.sets,...melds], triples=sets.filter(s=>s.kind!=='sequence').map(s=>s.tiles[0]);
    const winds=triples.filter(t=>t[1]==='z'&&+t[0]<=4), dragons=triples.filter(t=>t[1]==='z'&&+t[0]>=5);
    const bigW=winds.length===4, smallW=winds.length===3&&d.pair[1]==='z'&&+d.pair[0]<=4;
    add('大四喜',bigW?16:0); add('小四喜',!bigW&&smallW?8:0);
    if(!bigW) {add('門風',triples.includes(String(seatWind+1)+'z')?1:0);add('圈風',triples.includes(String(roundWind+1)+'z')?1:0);}
    if(dragons.length===3) add('大三元',8);
    else if(dragons.length===2&&d.pair[1]==='z'&&+d.pair[0]>=5) add('小三元',4);
    else for(const t of dragons) add(tileLabel(t)+'刻',1);
    const allHonor=suits.size===0;
    add('字一色',allHonor?8:0);add('混一色',suits.size===1&&honor?4:0);add('清一色',suits.size===1&&!honor?8:0);
    add('碰碰胡',triples.length===5&&!allHonor?4:0);
    let dark=d.sets.filter(s=>s.kind==='triplet').length+melds.filter(m=>m.kind==='concealedKan').length;
    if(method!=='tsumo'&&!flowerRob&&pos.kind==='triplet') dark--;
    if(dark>=3) add(['','','','三','四','五'][dark]+'暗刻',({3:2,4:5,5:8})[dark]);
    const allExposed=melds.length===5&&melds.every(m=>m.kind!=='concealedKan');
    if(allExposed) add(method==='tsumo'||flowerRob?'半求人':'全求人',method==='tsumo'||flowerRob?1:2);
    if(!allExposed&&waits.length===1) add(({pair:'單釣',inside:'中洞',edge:'邊張'})[pos.kind],['pair','inside','edge'].includes(pos.kind)?1:0);
    add('平胡',method!=='tsumo'&&!flowerRob&&!flowers.length&&!honor&&triples.length===0&&!pinfuExcluded&&pos.kind==='side'?2:0);
    add(flowers.length===8?'滿花':'花牌',flowerOverride??flowerTai(flowers,seatWind)); add('搶槓',method==='rob_added_kan'?1:0);
    add('槓上開花',replacement?1:0);add('海底撈月',lastTile?1:0);
    add(({heaven:'天胡',earth:'地胡',human:'人胡'})[opening],({heaven:24,earth:16,human:8})[opening]??0);
    candidates.push({rows,tai:rows.reduce((s,r)=>s+r.tai,0),pending,decomposition:d,completion:pos});
  }
  candidates.sort((a,b)=>b.tai-a.tai); return {...candidates[0],alternatives:candidates.length,waits};
}
export function payments({score,winner,payer=null,dealer,repeats,base=100,unit=50}) {
  if(score.pending?.length) return [];
  return [0,1,2,3].filter(s=>s!==winner&&(payer===null||s===payer)).map(s=>{
    const dealerPoints=dealerTai({dealer,winner,payer:s,repeats});
    return {from:s,to:winner,tai:score.tai+dealerPoints,dealerTai:dealerPoints,amount:base+unit*(score.tai+dealerPoints)};
  });
}
