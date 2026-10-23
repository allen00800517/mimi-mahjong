// v1.81 · Three volume channels the player sets in the menu: 音樂 (table and win themes), 音效 (tiles, dice, stamps,
// cues) and 角色語音 (call lines, taps, ロン／ツモ, cut-in lines, 珍英's slurp). Every sound path connects to its channel
// instead of straight to the speakers. Levels are 0–100; 100 keeps the mix exactly as tuned before.
export const MIX_KINDS=Object.freeze(['music','sfx','voice']);
export const MIX_DEFAULT=Object.freeze({music:100,sfx:100,voice:100});
const levels={...MIX_DEFAULT};
const buses=new Map(); // AudioContext → {music,sfx,voice} gain nodes

// Perceived loudness follows the square of the slider, so the middle of the slider sounds like the middle.
export const mixGain=v=>{const x=Math.max(0,Math.min(100,Number(v)||0))/100;return x*x;};
export const mixLevels=()=>({...levels});

// The node a sound of `kind` connects to (made on first use for each audio context).
export function mixBus(ctx,kind){
 if(!MIX_KINDS.includes(kind))throw Error('Unknown mix channel '+kind);
 let set=buses.get(ctx);
 if(!set){
  set={};for(const k of MIX_KINDS){const g=ctx.createGain();g.gain.value=mixGain(levels[k]);g.connect(ctx.destination);set[k]=g;}
  buses.set(ctx,set);
  // A reset sound system closes its old context; forget it so it is not kept alive.
  for(const old of [...buses.keys()])if(old!==ctx&&old.state==='closed')buses.delete(old);
 }
 return set[kind];
}

export function setMixLevel(kind,value){
 if(!MIX_KINDS.includes(kind))return;
 levels[kind]=Math.max(0,Math.min(100,Math.round(Number(value))||0));
 const g=mixGain(levels[kind]);
 for(const [ctx,set] of buses){try{const now=ctx.currentTime;set[kind].gain.cancelScheduledValues(now);set[kind].gain.setTargetAtTime(g,now,.03);}catch{set[kind].gain.value=g;}}
}

// Saved preferences may be missing, old or hand-edited: fall back to 100 for anything that is not a number.
export function loadMixLevels(saved){
 for(const k of MIX_KINDS){const v=Number(saved?.[k]);setMixLevel(k,Number.isFinite(v)?v:MIX_DEFAULT[k]);}
 return mixLevels();
}
