import {ICHIKA_PROFILE,MIMI_PROFILE,HARUMI_PROFILE,GONDO_PROFILE} from './character-profiles.mjs';
import {decodeImage} from './asset-loader.mjs';
export const CHARACTER_MEDIA=Object.freeze({
 mimi:{name:'蜜蜜',image:'./assets/cast-v23/mimi-chibi.png',motion:{base:'./assets/mimi-motion-v1',width:270,height:336,columns:8,clips:Object.keys(MIMI_PROFILE.clips),voices:['chi','pon','kan','ready','tap'],profile:MIMI_PROFILE}},
 ichika:{name:'春日莓香',image:'./assets/cast-v23/ichika-chibi.png',motion:{base:'./assets/ichika-motion-v1',width:270,height:336,columns:8,clips:['idle','call','pon','kan','ready','look','apron','tap'],voices:['chi','pon','kan','ready','tap'],profile:ICHIKA_PROFILE}},
 harumi:{name:'金田珍美',image:'./assets/cast-v23/harumi-chibi.png',motion:{base:'./assets/harumi-motion-v1',width:270,height:336,columns:8,clips:Object.keys(HARUMI_PROFILE.clips),voices:['chi','pon','kan','ready','tap'],profile:HARUMI_PROFILE}},
 gondo:{name:'權藤龍藏',image:'./assets/cast-v23/gondo-chibi.png',motion:{base:'./assets/gondo-motion-v1',width:270,height:336,columns:8,clips:Object.keys(GONDO_PROFILE.clips),voices:['chi','pon','kan','ready','tap'],profile:GONDO_PROFILE}}
});
export async function loadCharacterMotion(id){
 const motion=CHARACTER_MEDIA[id]?.motion;if(!motion)return null;
 const images=Object.fromEntries(await Promise.all(motion.clips.map(async clip=>{const image=new Image();image.src=motion.base+'/'+clip+'.webp';await decodeImage(image);return [clip,image];})));
 return {images,motion};
}
// Shared by the game and the developer preview so frame cropping and blending match.
export function paintCharacterPose(ctx,images,pose,{width=270,height=336,columns=8}={}){
 const frame=(p,alpha=1)=>{ctx.globalAlpha=alpha;ctx.drawImage(images[p.clip],p.frame%columns*width,Math.floor(p.frame/columns)*height,width,height,0,0,width,height);};
 ctx.clearRect(0,0,width,height);const breathing=pose.breath&&Math.abs(pose.breath-1)>.00001;if(breathing){ctx.save();ctx.translate(0,height);ctx.scale(1,pose.breath);ctx.translate(0,-height);}
 frame(pose);if(pose.previous)frame(pose.previous,pose.previousMix);if(pose.next)frame(pose.next,pose.nextMix);ctx.globalAlpha=1;if(breathing)ctx.restore();
}
