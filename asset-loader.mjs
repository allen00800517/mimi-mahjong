// decode() can reject spuriously under memory pressure even though the image loaded fine;
// accept a fully loaded image instead of failing the whole table.
export async function decodeImage(img){
 try{await img.decode();}catch(error){
  if(img.complete&&img.naturalWidth>0)return img;
  await new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',()=>reject(error),{once:true});if(img.complete&&img.naturalWidth>0)resolve();});
 }
 return img;
}
export function textureSize(width,height,max){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Invalid image dimensions');
 const scale=Math.min(1,max/Math.max(width,height));
 return [Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale))];
}
export function createImageLoader({decode=async url=>{const img=new Image();img.src=url;await decodeImage(img);return img;},resize=(img,w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);return c;}}={}){
 const cache=new Map();
 return function load(url,max=256){const key=max+':'+url;if(!cache.has(key)){
  const request=Promise.resolve().then(()=>decode(url)).then(img=>{const [w,h]=textureSize(img.width,img.height,max);return w===img.width&&h===img.height?img:resize(img,w,h);});
  cache.set(key,request);request.catch(()=>{if(cache.get(key)===request)cache.delete(key);});
 }return cache.get(key);};
}
