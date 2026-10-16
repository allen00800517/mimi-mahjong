// Compact table symbols are independent of the selected enlarged artwork.
export const FLOWER_SYMBOLS=['春','夏','秋','冬','梅','蘭','菊','竹'];
export function compactFlowerSVG(id){
 if(!/^[1-8]f$/.test(id))throw new Error('Invalid flower');
 const n=Number(id[0]),color=n<=4?'#25365e':'#a62929';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="176" viewBox="0 0 128 176"><text x="9" y="55" font-family="Arial,sans-serif" font-size="54" font-weight="700" fill="'+color+'">'+((n-1)%4+1)+'</text><text x="65" y="163" text-anchor="middle" font-family="Microsoft JhengHei,PingFang TC,Noto Sans CJK TC,sans-serif" font-size="100" font-weight="700" fill="'+color+'">'+FLOWER_SYMBOLS[n-1]+'</text></svg>';
}
