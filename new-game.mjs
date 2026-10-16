function randomUint32(){return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];}
export function freshSeed(previous,random=randomUint32){
 for(let attempt=0;attempt<16;attempt++){
  const seed=random();
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new TypeError('隨機牌局編號無效');
  if(seed!==previous)return seed;
 }
 throw Error('無法產生新的牌局編號，請稍後再試');
}
export function newGameSeed(value,previous,random=randomUint32){
 if(String(value).trim()==='')return freshSeed(previous,random);
 const seed=Number(value);
 if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new TypeError('請輸入 0～4294967295 的整數牌局編號，或留白隨機開局');
 return seed;
}
