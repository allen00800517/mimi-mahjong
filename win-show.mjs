// v0.97 · Win presentation, tier 1 (一般胡 / 自摸). The grade of a win is set by how rare its patterns are, never by
// the total tai (many small tai can add up without the hand being special). Higher tiers reuse this skeleton.
// Art (generated, keyed): assets/win-v1/<id>-hu.webp portraits, brush-hu.png, seal-frame.png. Until a file exists the
// presentation falls back to the existing half-body portrait and a typeset character, so nothing ever shows blank.
export const WIN_TIMING=Object.freeze({ron:1500,tsumo:2000,rowGap:260,rowFirst:350,sealAfter:220});
export const WIN_COLORS=Object.freeze({mimi:'#e0566f',ichika:'#c8323a',harumi:'#7b3fb0',gondo:'#b8892e'});
export const WIN_ART=Object.freeze({portrait:id=>'./assets/win-v1/'+id+'-hu.webp',burst:id=>'./assets/win-v1/'+id+'-tsumo.webp',stamp:'./assets/win-v1/brush-hu.png',seal:'./assets/win-v1/seal-frame.png'});

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
// v0.99 · Two portraits per character: the composed 胡 pose for ordinary wins, the burst pose (tile held high) for
// 自摸 and for anything rarer than an ordinary win. Returns the list to try in order.
export function winPortraits(result,id){
 const burst=result?.method==='tsumo'||(winGrade(result)?.tier??1)>=2;
 return burst?[WIN_ART.burst(id),WIN_ART.portrait(id)]:[WIN_ART.portrait(id)];
}
// 自摸 animations (Flow, green screen, 1280×720). stampAt = the moment the character is back facing the camera after
// the big move; the 自摸 stamp lands there. Characters without a clip yet fall back to the still burst portrait.
export const WIN_ANIM=Object.freeze({
 // handoff: where the 1280×720 clip sits in layout B so its last frame lands exactly on the settlement portrait
 // (cx = frame centre on the 854 stage, frameH = the clip's height on the stage, portraitH = the figure's height there).
 // slide: layout C glides the clip from the centre to the hand-off spot during the big move (ms into the clip).
 ichika:{video:'./assets/win-v1/ichika-tsumo.mp4',stampAt:2600,handoff:{cx:97,frameH:394,portraitH:335},slide:{from:900,to:2600}},
 // 蜜蜜: take 2 (gag-face suspense, trembling from the first frame). She glides only while airborne (2.38–3.18 s) and the
 // stamp lands with her landing; she ends 40 px further right than the others (her raised arm hugs the left edge),
 // so her settlement portrait moves with her (portraitLeft, default -6).
 mimi:{video:'./assets/win-v1/mimi-tsumo.mp4',stampAt:3200,handoff:{cx:113,frameH:384,portraitH:372,portraitLeft:34},slide:{from:2380,to:3180}},
 // 珍美: take 1 (the tile leaves her hand during the turn; accepted by the user 2026-10-18). Stamp with the laugh.
 harumi:{video:'./assets/win-v1/harumi-tsumo.mp4',stampAt:2000,handoff:{cx:101,frameH:429,portraitH:372},slide:{from:1000,to:2000}},
 // 權藤: motion from take A, voice from take B (the fan snaps line up within ~50 ms); the stamp lands with 「ツモじゃ」.
 gondo:{video:'./assets/win-v1/gondo-tsumo.mp4',stampAt:3050,handoff:{cx:127,frameH:337,portraitH:314},slide:{from:1800,to:2900}},
});
// Where the clip stands on the 854×394 stage: 'B' puts the figure where the settlement portrait will be (no jump at
// the hand-off; a clip's own handoff.cx wins), 'A' centres it. frameH = height of the 16:9 video frame on the stage.
export const ANIM_LAYOUTS=Object.freeze({A:{cx:427,frameH:362,stampX:672,label:'A 置中'},B:{cx:205,frameH:394,stampX:575,label:'B 靠左（接結算不跳）'},C:{cx:427,frameH:394,stampX:575,slide:true,label:'C 中間登場→邊動邊滑到左'}});
// Ease used for the C glide: slow start, slow landing.
export const easeInOut=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
export function slideCx(anim,ms,from=427){const to=anim?.handoff?.cx??205,sl=anim?.slide;if(!sl)return to;const p=Math.min(1,Math.max(0,(ms-sl.from)/(sl.to-sl.from)));return from+(to-from)*easeInOut(p);}
// v1.00 · The tai seal is set like a real carved seal (朱文): Chinese numerals + 台, read in columns right→left.
// 2 chars stack; 3 chars: number in the right column, a tall 台 on the left; 4 chars: a 2×2 grid. The hand's own tai
// tops out around 70 (天胡＋大四喜＋字一色…), so two-digit numbers cover it; the dealer's 連莊 tai are per payment.
const DIGITS='零一二三四五六七八九';
export function taiNumeral(n){
 n=Math.max(0,Math.floor(n));if(n<=10)return n===10?'十':DIGITS[n];
 if(n<20)return '十'+DIGITS[n%10];
 if(n<100)return DIGITS[Math.floor(n/10)]+'十'+(n%10?DIGITS[n%10]:'');
 return String(n);
}
export function sealChars(n){return [...(taiNumeral(n)+'台')];}
