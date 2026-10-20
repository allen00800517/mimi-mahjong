// v0.97 · Win presentation, tier 1 (一般胡 / 自摸). The grade of a win is set by how rare its patterns are, never by
// the total tai (many small tai can add up without the hand being special). Higher tiers reuse this skeleton.
// Art (generated, keyed): assets/win-v1/<id>-hu.webp portraits, brush-hu.png, seal-frame.png. Until a file exists the
// presentation falls back to the existing half-body portrait and a typeset character, so nothing ever shows blank.
export const WIN_TIMING=Object.freeze({ron:1500,tsumo:2000,rowGap:260,rowFirst:350,sealAfter:220});
export const WIN_COLORS=Object.freeze({mimi:'#e0566f',ichika:'#c8323a',harumi:'#7b3fb0',gondo:'#b8892e'});
export const WIN_ART=Object.freeze({portrait:id=>'./assets/win-v1/'+id+'-hu.webp',burst:id=>'./assets/win-v1/'+id+'-tsumo.webp',stamp:'./assets/win-v1/brush-hu.png',stampTsumo:'./assets/win-v1/brush-tsumo.webp',seal:'./assets/win-v1/seal-frame.png'});

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
// v1.06 · Pattern words (tier 2 brush calligraphy, gold like 自摸). Temporary until the big-hand effects exist; a pattern without art yet is
// typeset instead, so nothing is ever blank. ratio = width/height of the keyed art (height 200).
export const YAKU_ART=Object.freeze({
 碰碰胡:{file:'pengpeng',ratio:2.41},混一色:{file:'hunyise',ratio:2.35},小三元:{file:'xiaosanyuan',ratio:2.6},
 四暗刻:{file:'siankee',ratio:2.33},全求人:{file:'quanqiuren',ratio:2.39},槓上開花:{file:'gangshang',ratio:2.9},
 海底撈月:{file:'haidi',ratio:2.675},河底撈魚:{file:'hedi',ratio:2.835},搶槓:{file:'qianggang',ratio:1.865},
});
// v1.11 · the shadow and glow are baked into the art (yaku2/, PAD of the glyph height added on every side): a CSS
// drop-shadow on an animated word was sometimes clipped to a visible rectangle on iPhone.
export const YAKU_PAD=36/200;
export const yakuUrl=name=>YAKU_ART[name]?'./assets/win-v1/yaku2/'+YAKU_ART[name].file+'.webp':null;
// v1.08 · The 胡／自摸 stamp always comes first; once it has been seen it flies off and the pattern words take the
// whole stage, stamped one at a time (each with its own thud), smallest first so the biggest pattern lands last.
// Words stack in a column; times are ms from the moment the 胡／自摸 stamp lands.
export const YAKU_SHOW=Object.freeze({away:700,first:850,step:480,land:270,hold:1600,height:[132,106,80,62],maxWidth:{anim:440,still:620}});
const TIER_OF=n=>TIER4.includes(n)?4:TIER3.includes(n)?3:2;
export function yakuWords(result,{anim=false}={}){
 if(!winGrade(result)?.patterns.length)return [];
 const rows=result.score?.rows??[],tai=n=>rows.find(r=>(SHOWN[r.name]||r.name)===n)?.tai??0;
 const names=winGrade(result).patterns.map((name,i)=>({name,i,tier:result.method==='flower'&&i===0?5:TIER_OF(Object.keys(SHOWN).find(k=>SHOWN[k]===name)||name),tai:tai(name)}));
 names.sort((a,b)=>a.tier-b.tier||a.tai-b.tai||a.i-b.i);
 const list=names.slice(-4),max=anim?YAKU_SHOW.maxWidth.anim:YAKU_SHOW.maxWidth.still,base=YAKU_SHOW.height[list.length-1];
 return list.map(({name},k)=>{const ratio=YAKU_ART[name]?.ratio??name.length*.95;
  return {name,url:yakuUrl(name),ratio,height:Math.floor(Math.min(base,max/ratio)),delay:YAKU_SHOW.first+k*YAKU_SHOW.step,last:k===list.length-1};});
}
// How long after the stamp the moment lasts when there are pattern words.
export const yakuSpan=words=>words.length?words.at(-1).delay+YAKU_SHOW.land+YAKU_SHOW.hold:0;
// v1.12 · Cut-in (カットイン): from tier 2 up, pressing 胡 first flashes the winner's eyes across the screen (with the
// character's line), then the 胡／自摸 stamp lands, then the pattern words. It replaces the 自摸 clip for those hands
// (a bigger hand outranks the ordinary 自摸 show). Tier 2 = a slanted band with just the eyes; tier 3+ = a wedge
// slashing in from the right with most of the face. Placeholder art: the burst portrait, cropped around the eyes
// (eye = centre in image px, span = eye-to-eye width); the final art will be a Flow clip per character.
export const CUTIN_TIMING=Object.freeze({ms:1300,in:200,out:200,glint:420});
export const CUTIN_ART=Object.freeze({
 mimi:{w:340,h:760,eye:[165,280],span:110},ichika:{w:475,h:760,eye:[215,155],span:120},
 harumi:{w:413,h:760,eye:[220,105],span:95},gondo:{w:788,h:760,eye:[332,112],span:100},
});
const CUTIN_SHAPES=Object.freeze({band:{fill:.62,at:[427,202]},wedge:{fill:.32,at:[600,170]}});
export function cutinFor(result){const t=winGrade(result)?.tier??1;return t>=2?{shape:t>=3?'wedge':'band'}:null;}
// Background size/position (stage px) that put the eyes at the shape's focus point.
export function cutinCrop(id,shape){
 const a=CUTIN_ART[id],sh=CUTIN_SHAPES[shape];if(!a||!sh)return null;
 const k=854*sh.fill/a.span;
 return {url:WIN_ART.burst(id),at:sh.at,size:[a.w*k,a.h*k],pos:[sh.at[0]-a.eye[0]*k,sh.at[1]-a.eye[1]*k],glint:[sh.at[0]-a.span*k*.28,sh.at[1]]};
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
 // v1.02 · every end spot moved 24px right (cx and portraitLeft together, so the hand-off stays seamless): on an iPhone
 // held sideways the Dynamic Island covered the left edge of the character.
 // 權藤 moves only 12px and is a little smaller (frameH 324) so his open fan still stops short of the score column (x 318).
 // (cx = frame centre on the 854 stage, frameH = the clip's height on the stage, portraitH = the figure's height there).
 // v1.00 · all clips share one scale (frameH 394) so the four look the same size; only 權藤 is smaller (337) because his
 // open fan would otherwise cover the score rows.
 // slide: layout C glides the clip from the centre to the hand-off spot during the big move (ms into the clip).
 ichika:{video:'./assets/win-v1/ichika-tsumo.mp4',stampAt:2600,handoff:{cx:116,frameH:394,portraitH:332,portraitLeft:18},slide:{from:900,to:2600}},
 // 蜜蜜: take 2 (gag-face suspense, trembling from the first frame). She glides only while airborne (2.38–3.18 s) and the
 // stamp lands with her landing; she ends 40 px further right than the others (her raised arm hugs the left edge),
 // so her settlement portrait moves with her (portraitLeft, default -6).
 mimi:{video:'./assets/win-v1/mimi-tsumo.mp4',stampAt:3200,handoff:{cx:139,frameH:394,portraitH:382,portraitLeft:58},slide:{from:2380,to:3180}},
 // 珍美: take 1 (the tile leaves her hand during the turn; accepted by the user 2026-10-18). Stamp with the laugh.
 harumi:{video:'./assets/win-v1/harumi-tsumo.mp4',stampAt:2000,handoff:{cx:115,frameH:394,portraitH:341,portraitLeft:18},slide:{from:1000,to:2000}},
 // 權藤: motion from take A, voice from take B (the fan snaps line up within ~50 ms); the stamp lands with 「ツモじゃ」.
 gondo:{video:'./assets/win-v1/gondo-tsumo.mp4',stampAt:3050,handoff:{cx:134,frameH:324,portraitH:302,portraitLeft:6},slide:{from:1800,to:2900}},
});
// Where the clip stands on the 854×394 stage: 'B' puts the figure where the settlement portrait will be (no jump at
// the hand-off; a clip's own handoff.cx wins), 'A' centres it. frameH = height of the 16:9 video frame on the stage.
export const ANIM_LAYOUTS=Object.freeze({A:{cx:427,frameH:362,stampX:672,label:'A 置中'},B:{cx:205,frameH:394,stampX:512,label:'B 靠左（接結算不跳）'},C:{cx:427,frameH:394,stampX:512,slide:true,label:'C 中間登場→邊動邊滑到左'}});
// Ease used for the C glide: slow start, slow landing.
export const easeInOut=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
export function slideCx(anim,ms,from=427){const to=anim?.handoff?.cx??205,sl=anim?.slide;if(!sl)return to;const p=Math.min(1,Math.max(0,(ms-sl.from)/(sl.to-sl.from)));return from+(to-from)*easeInOut(p);}
// v1.00 · The tai seal is set like a real carved seal (朱文): Chinese numerals + 台, read in columns right→left.
// It shows everything the winner collected this hand, in tai, exactly as the score table adds it up: the sum of every
// payment's tai (hand tai plus that payment's dealer/連莊 tai). Up to 4 characters fit the square seal (2 stack; 3 =
// number on the right, a tall 台 on the left; 4 = a 2×2 grid); 5–6 characters (from 一百零一台) switch to a tall seal
// with a 2×3 grid. 999 tai is out of reach in practice.
const DIGITS='零一二三四五六七八九';
export function taiNumeral(n){
 n=Math.max(0,Math.floor(n));if(n<=10)return n===10?'十':DIGITS[n];
 if(n<20)return '十'+DIGITS[n%10];
 if(n<100)return DIGITS[Math.floor(n/10)]+'十'+(n%10?DIGITS[n%10]:'');
 if(n<1000){const h=Math.floor(n/100),r=n%100;return DIGITS[h]+'百'+(r===0?'':r<10?'零'+DIGITS[r]:DIGITS[Math.floor(r/10)]+'十'+(r%10?DIGITS[r%10]:''));}
 return String(n);
}
export function sealChars(n){return [...(taiNumeral(n)+'台')];}
export function winTaiTotal(result){return (result?.payments??[]).filter(p=>p.to===result.winner).reduce((n,p)=>n+(p.tai||0),0);}
// v1.00 · Settlement rows add up to the seal. After the hand's own rows come, read top to bottom as a running sum:
// the dealer's tai when a dealer payment is involved (莊家 / 連N拉N), and for 自摸 a "三家各付 ×3" line. A dealer who
// wins pays-in-all gets the dealer row before ×3 (every payer adds it); a non-dealer's 自摸 puts it after ×3, because
// only the dealer's own payment carries it.
export function tallyRows(result,{dealer,repeats=0,names=[]}={}){
 const rows=(result?.score?.rows??[]).map(r=>({name:r.name,value:r.tai+' 台'}));
 const paid=(result?.payments??[]).filter(p=>p.to===result.winner),d=paid.reduce((n,p)=>Math.max(n,p.dealerTai||0),0);
 const label=repeats>0?'莊家　連'+taiNumeral(repeats)+'拉'+taiNumeral(repeats):'莊家';
 const tsumo=paid.length>1;
 if(!tsumo){if(d)rows.push({name:label,value:d+' 台',extra:'dealer'});return rows;}
 if(result.winner===dealer){if(d)rows.push({name:label,value:d+' 台',extra:'dealer'});rows.push({name:'自摸　三家各付',value:'×3',extra:'mult'});}
 else{rows.push({name:'自摸　三家各付',value:'×3',extra:'mult'});if(d)rows.push({name:label+'（'+(names[dealer]??'莊家')+'付）',value:d+' 台',extra:'dealer'});}
 return rows;
}
// v1.34 · Big-hand screen (tier 3/4, agreed with the user 2026-10-20): after the cut-in's white flash, one ink-and-gold
// background per tier (3 = paper, 4 = night ink with dragon and phoenix) between the same 龍鳳柱, the winner's own
// big-win figure, the leading pattern in big letters, the other patterns under it, a 雙大牌 seal when two big patterns
// meet, and the other three players' chibi meltdown faces. It waits for a tap, then the usual settlement follows.
// The leading pattern: highest tier, then most tai, then this fixed order (only one main effect is ever shown).
export const BIG_ART=Object.freeze({bg:t=>'./assets/bigwin-v1/bg'+(t>=4?4:3)+'.webp',portrait:id=>'./assets/bigwin-v1/'+id+'-bigwin.webp',crash:id=>'./assets/bigwin-v1/'+id+'-crash.webp'});
// where each winner's figure stands on the 854×394 stage (px), tuned with the user on the mockups
export const BIG_POSE=Object.freeze({mimi:{left:66,top:4,h:400},ichika:{left:88,top:10,h:446},harumi:{left:170,top:10,h:462},gondo:{left:58,top:12,h:436}});
// v1.38 · a big-win figure can come alive (green-screen Flow clip, keyed live like the 自摸 clips): it plays once from
// the still's pose and lands back on it, then holds its last frame. frame = clip size (px); box = the figure's bounding
// box in the clip's first frame, which is matched to where the still stands (BIG_POSE), so the swap is invisible.
export const BIG_CLIP=Object.freeze({
 ichika:{video:'./assets/bigwin-v1/ichika-bigwin.mp4',frame:[652,1170],box:[12,26,554,1126]}, // 莓香 twirl (user's Flow clip, 2026-10-20)
});
export function bigClipRect(id){
 const c=BIG_CLIP[id],p=BIG_POSE[id];if(!c||!p)return null;const k=p.h/c.box[3];
 return {left:p.left-c.box[0]*k,top:p.top-c.box[1]*k,width:c.frame[0]*k,height:c.frame[1]*k};
}
// v1.39 · the leading pattern in gold-leaf brush calligraphy over a black ink edge (one art per pattern, readable on the
// paper and the night background alike); ratio = width/height of the keyed art. A pattern without art is typeset.
export const BIG_WORDS=Object.freeze({
 清一色:{file:'qingyise',ratio:2.207},字一色:{file:'ziyise',ratio:2.303},大三元:{file:'dasanyuan',ratio:2.577},小四喜:{file:'xiaosixi',ratio:2.417},
 天聽:{file:'tianting',ratio:2.02},地聽:{file:'diting',ratio:2.05},人胡:{file:'renhu',ratio:2.14},
 天胡:{file:'tianhu',ratio:2.027},地胡:{file:'dihu',ratio:2.207},大四喜:{file:'dasixi',ratio:2.417},八仙過海:{file:'baxian',ratio:3.177},七搶一:{file:'qiqiangyi',ratio:2.857},
 五暗刻:{file:'wuanke',ratio:2.61}, // redrawn: the first art read 五晴刻
});
export const BIG_SEAL='./assets/bigwin-v1/words/shuangdapai.webp';
export const bigWordUrl=n=>BIG_WORDS[n]?'./assets/bigwin-v1/words/'+BIG_WORDS[n].file+'.webp':null;
// height (px) of the word art on the stage: as tall as the typeset title, never wider than maxW
export const bigWordHeight=(n,maxW=440,h=124)=>BIG_WORDS[n]?Math.round(Math.min(h,maxW/BIG_WORDS[n].ratio)):0;
export const BIG_PRIORITY=Object.freeze(['天胡','地胡','大四喜','八仙過海','七搶一','大三元','字一色','小四喜','五暗刻','清一色','人胡','天聽','地聽']);
// ms from the screen's first frame: figure slides in, main word slams, tai label, then each sub line, the seal, faces
export const BIG_TIMING=Object.freeze({main:700,tai:980,sub:1250,step:380,face:130,ready:450});
export function bigHand(result){
 const g=winGrade(result);if(!g||g.tier<3)return null;
 const rows=result.score?.rows??[],tai=n=>rows.find(r=>(SHOWN[r.name]||r.name)===n)?.tai??0;
 const tierOf=n=>n==='八仙過海'||n==='七搶一'?4:TIER_OF(Object.keys(SHOWN).find(k=>SHOWN[k]===n)||n);
 const pri=n=>{const i=BIG_PRIORITY.indexOf(n);return i<0?99:i;};
 const list=g.patterns.map((name,i)=>({name,tier:tierOf(name),tai:tai(name),i}));
 list.sort((a,b)=>b.tier-a.tier||b.tai-a.tai||pri(a.name)-pri(b.name)||a.i-b.i);
 const t4=g.tier>=4,subs=list.slice(1,t4?3:4);
 return {tier:g.tier,main:list[0],subs,double:list.filter(p=>p.tier>=3).length>=2};
}
// Schedule (ms) of everything that lands on the big-hand screen, so sounds and CSS delays share one source.
export function bigPlan(b){
 const T=BIG_TIMING,subs=b.subs.map((s,i)=>T.sub+i*T.step);
 const seal=b.double?T.sub+b.subs.length*T.step:null;
 const faceStart=(seal??(subs.at(-1)??T.tai))+T.step,faces=[0,1,2].map(i=>faceStart+i*T.face);
 return {main:T.main,tai:T.tai,subs,seal,faces,ready:faces.at(-1)+T.ready};
}
// v1.40 · Settlement reactions (user, 2026-10-21): every hand's score card shows the player's chibi face — gained points
// → happy (cropped from the happy full-body art), lost points → the meltdown face, nothing → the everyday chibi. The
// end-of-match standings show the full bodies by rank: up → happy, down → sad.
export const SETTLE_ART=Object.freeze({happy:id=>'./assets/settle-v1/'+id+'-happy.webp',sad:id=>'./assets/settle-v1/'+id+'-sad.webp',happyFace:id=>'./assets/settle-v1/'+id+'-happy-face.webp'});
export function settleMood(delta){return delta>0?'happy':delta<0?'sad':'calm';}
export function settleFace(id,delta){const m=settleMood(delta);return m==='happy'?SETTLE_ART.happyFace(id):m==='sad'?BIG_ART.crash(id):null;}
// full-body height (stage px) on the final standings: sitting / kneeling poses are shorter by nature
export const SETTLE_BODY_H=Object.freeze({happy:{mimi:228,ichika:214,harumi:218,gondo:214},sad:{mimi:168,ichika:172,harumi:212,gondo:212}});
