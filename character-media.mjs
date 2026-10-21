import {ICHIKA_PROFILE,MIMI_PROFILE,HARUMI_PROFILE,GONDO_PROFILE,JINYING_PROFILE} from './character-profiles.mjs';
import {decodeImage} from './asset-loader.mjs';
import {ClipCache,residentClips} from './clip-cache.mjs';
export const CHARACTER_MEDIA=Object.freeze({
 mimi:{name:'蜜蜜',image:'./assets/cast-v23/mimi-chibi.webp',motion:{base:'./assets/mimi-motion-v1',width:270,height:336,columns:8,clips:Object.keys(MIMI_PROFILE.clips),voices:['chi','pon','kan','ready','tap','poke','ron'],profile:MIMI_PROFILE}},
 ichika:{name:'春日莓香',image:'./assets/cast-v23/ichika-chibi.webp',motion:{base:'./assets/ichika-motion-v1',width:270,height:336,columns:8,clips:['idle','call','pon','kan','ready','look','apron','tap','poke','hair','cake'],voices:['chi','pon','kan','ready','tap','poke','ron'],profile:ICHIKA_PROFILE}},
 harumi:{name:'金田珍美',image:'./assets/cast-v23/harumi-chibi.webp',motion:{base:'./assets/harumi-motion-v1',width:270,height:336,columns:8,clips:Object.keys(HARUMI_PROFILE.clips),voices:['chi','pon','kan','ready','tap','poke','ron'],profile:HARUMI_PROFILE}},
 gondo:{name:'權藤龍藏',image:'./assets/cast-v23/gondo-chibi.webp',motion:{base:'./assets/gondo-motion-v1',width:270,height:336,columns:8,clips:Object.keys(GONDO_PROFILE.clips),voices:['chi','pon','kan','ready','tap','poke','ron'],profile:GONDO_PROFILE}},
 jinying:{name:'金田珍英',image:'./assets/cast-v23/jinying-chibi.webp',motion:{base:'./assets/jinying-motion-v1',width:270,height:336,columns:8,clips:Object.keys(JINYING_PROFILE.clips),voices:['chi','pon','kan','ready','tap','poke','ron'],profile:JINYING_PROFILE}}
});
export async function loadCharacterMotion(id){
 const motion=CHARACTER_MEDIA[id]?.motion;if(!motion)return null;
 const images=Object.fromEntries(await Promise.all(motion.clips.map(async clip=>{const image=new Image();image.src=motion.base+'/'+clip+'.webp';await decodeImage(image);return [clip,image];})));
 return {images,motion};
}
// v0.96 · The table uses this: clips stay compressed and are decoded on demand (see clip-cache.mjs).
// assets.images is the cache's live table of decoded clips, so painting code is unchanged.
export async function loadCharacterClips(id,options={}){
 const motion=CHARACTER_MEDIA[id]?.motion;if(!motion)return null;
 const cache=new ClipCache({base:motion.base,clips:motion.clips,resident:residentClips(motion.profile),...options});
 try{await cache.load();}catch(e){cache.close();throw e;}
 return {get images(){return cache.images;},motion,cache};
}
// Shared by the game and the developer preview so frame cropping and blending match.
export function paintCharacterPose(ctx,images,pose,{width=270,height=336,columns=8}={}){
 // A clip that is still decoding shows the standing pose instead of a blank canvas.
 const frame=(p,alpha=1)=>{if(!images[p.clip]){if(p.clip==='idle'||!images.idle)return;p={clip:'idle',frame:0};}ctx.globalAlpha=alpha;ctx.drawImage(images[p.clip],p.frame%columns*width,Math.floor(p.frame/columns)*height,width,height,0,0,width,height);};
 ctx.clearRect(0,0,width,height);const breathing=pose.breath&&Math.abs(pose.breath-1)>.00001;if(breathing){ctx.save();ctx.translate(0,height);ctx.scale(1,pose.breath);ctx.translate(0,-height);}
 frame(pose);if(pose.previous)frame(pose.previous,pose.previousMix);if(pose.next)frame(pose.next,pose.nextMix);ctx.globalAlpha=1;if(breathing)ctx.restore();
}
