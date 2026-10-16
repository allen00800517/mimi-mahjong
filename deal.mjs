// Seats advance counterclockwise (player turns). Wall traversal is clockwise.
export function seededRandom(seed) {
 let a=seed>>>0;
 return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}
export function firstDealer(seed){return Math.floor(seededRandom((seed^0x16d3a1)>>>0)()*4);}
export function rollDice(seed){const r=seededRandom((seed^0xd1ce301)>>>0);return Array.from({length:3},()=>1+Math.floor(r()*6));}
export function dealPlan(dealer,dice) {
 if(!Number.isInteger(dealer)||dealer<0||dealer>3||!Array.isArray(dice)||dice.length!==3||!dice.every(n=>Number.isInteger(n)&&n>=1&&n<=6))throw new TypeError('開門設定錯誤');
 const total=dice.reduce((a,b)=>a+b,0),doorSeat=(dealer+total-1)%4;
 // Each wall has 18 stacks, top then bottom. Seat walls in traversal order: 0,3,2,1.
 const cutIndex=(((4-doorSeat)%4)*36+total*2)%144;
 return {dice:[...dice],total,doorSeat,cutIndex,firstWallSeat:total===18?(doorSeat+3)%4:doorSeat,firstStack:total===18?1:total+1};
}
export const createDeal=(seed,dealer)=>dealPlan(dealer,rollDice(seed));
export function cutWall(wall,plan){
 if(!Array.isArray(wall)||wall.length!==144)throw new TypeError('牌牆必須有 144 張');
 return [...wall.slice(plan.cutIndex),...wall.slice(0,plan.cutIndex)];
}
export function validateDeal(plan,seed,dealer,windOrigin){
 const expected=createDeal(seed,dealer);
 if(!plan||Object.keys(plan).length!==Object.keys(expected).length||Object.keys(expected).some(k=>JSON.stringify(plan[k])!==JSON.stringify(expected[k]))||windOrigin!==expected.doorSeat)throw new TypeError('存檔無效：骰子／開門與門風不符');
}
