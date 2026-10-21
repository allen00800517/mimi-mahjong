import {seededRandom,rollDice} from './deal.mjs';
export const characters=['mimi','gondo','ichika','harumi','jinying'];
export function validateCharacters(c){
 if(!Array.isArray(c)||c.length!==4||new Set(c).size!==4||c.some(k=>!characters.includes(k)))throw new TypeError('角色座位紀錄不正確');
 return [...c];
}
// App opening ceremony, separate from each hand's opening-wall dice and scoring winds.
// The human's camera remains at seat 0; the wind draw changes relative opponents.
export function drawSeats(seed,roster){
 validateCharacters(roster);
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new TypeError('抓位種子不正確');
 const random=seededRandom((seed^0x5ea710)>>>0),winds=[0,1,2,3];
 for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[winds[i],winds[j]]=[winds[j],winds[i]];}
 const seats=Array(4);roster.forEach((id,i)=>{seats[(winds[i]-winds[0]+4)%4]=id;});
 const dice=rollDice((seed^0x57a27e)>>>0),east=(4-winds[0])%4;
 return {seed,roster:[...roster],winds,seats,dice,starter:(east+dice.reduce((a,b)=>a+b,0)-1)%4};
}
export function validateSeating(record,cast,match){
 if(record===null)return;
 const expected=drawSeats(record?.seed,record?.roster);
 if(JSON.stringify(record)!==JSON.stringify(expected)||JSON.stringify(cast)!==JSON.stringify(expected.seats)||match.seed!==record.seed||match.starter!==record.starter)throw new TypeError('抓位紀錄與場次不符');
}
