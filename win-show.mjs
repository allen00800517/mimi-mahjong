// v0.97 · Win presentation, tier 1 (一般胡 / 自摸). The grade of a win is set by how rare its patterns are, never by
// the total tai (many small tai can add up without the hand being special). Higher tiers reuse this skeleton.
// Art (generated, keyed): assets/win-v1/<id>-hu.webp portraits, brush-hu.png, seal-frame.png. Until a file exists the
// presentation falls back to the existing half-body portrait and a typeset character, so nothing ever shows blank.
export const WIN_TIMING=Object.freeze({ron:1500,tsumo:2000,rowGap:260,rowFirst:350,sealAfter:220});
export const WIN_COLORS=Object.freeze({mimi:'#e0566f',ichika:'#c8323a',harumi:'#7b3fb0',gondo:'#b8892e'});
export const WIN_ART=Object.freeze({portrait:id=>'./assets/win-v1/'+id+'-hu.webp',stamp:'./assets/win-v1/brush-hu.png',seal:'./assets/win-v1/seal-frame.png'});

// Rarity grades agreed with the user (2026-10-18). Row names are the scoring engine's.
const TIER2=['碰碰胡','混一色','小三元','四暗刻','全求人','槓上開花','海底撈月','河底撈魚','搶槓'];
const TIER3=['清一色','字一色','大三元','小四喜','五暗刻','地聽組','天聽組','人胡'];
const TIER4=['大四喜','地胡','天胡'];
const SHOWN=Object.freeze({地聽組:'地聽',天聽組:'天聽'});
export function winGrade(result){
 if(!result||result.kind!=='win')return null;
 const rows=result.score?.rows??[],names=rows.map(r=>r.name),tsumo=result.method==='tsumo';
 const t3=names.filter(n=>TIER3.includes(n)).length;
 let tier=1;
 if(names.some(n=>TIER2.includes(n)))tier=2;
 if(t3)tier=3;
 if(result.method==='flower'||names.some(n=>TIER4.includes(n))||t3>=2)tier=4;
 const patterns=names.filter(n=>TIER2.includes(n)||TIER3.includes(n)||TIER4.includes(n)).map(n=>SHOWN[n]||n);
 if(result.method==='flower')patterns.unshift(result.flower?.kind==='eight'?'八仙過海':'七搶一');
 return {tier,tsumo,patterns};
}
export function stampWord(result){return result.method==='tsumo'?'自摸':result.method==='flower'?'花胡':'胡';}
export function winCaption(result,names){
 const w=names[result.winner];
 if(result.method==='tsumo')return w+' 自摸　·　三家各付';
 if(result.method==='flower')return w+' 花胡';
 const payer=result.payments?.find(p=>p.to===result.winner)?.from;
 return w+' 胡牌'+(payer!==undefined?'　·　放槍：'+names[payer]:'');
}
// Score rows for the settlement, each with the delay at which it appears; the seal follows the last row.
export function revealPlan(rows,{rowFirst=WIN_TIMING.rowFirst,rowGap=WIN_TIMING.rowGap,sealAfter=WIN_TIMING.sealAfter}={}){
 const items=rows.map((r,i)=>({...r,at:rowFirst+i*rowGap}));
 return {items,sealAt:(items.at(-1)?.at??rowFirst)+sealAfter};
}
