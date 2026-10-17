import {rectOf} from './viewport.mjs';
import {compactFlowerSVG} from './flower-display.mjs';
import {createImageLoader,decodeImage} from './asset-loader.mjs';
import {TILE} from './table-layout.mjs';
import {smallManFace} from './small-face.mjs';
// One palette for textured backs, plain walls and the green body layer.
export const PALETTE=Object.freeze({felt:[.161,.306,.275],wood:[.38,.23,.12],jade:[.278,.580,.494],cream:[.949,.922,.847],shadow:[.012,.022,.020],backReferenceGreen:.32});
export const MATERIAL={radius:.095,cream:PALETTE.cream,green:PALETTE.jade,thickness:TILE.thickness};
const L=TILE.length,T=TILE.thickness,R=MATERIAL.radius;
const normalize=v=>{const d=Math.hypot(...v)||1;return v.map(x=>x/d)};
function geometry(){
 const half=[.5,L/2,T/2],out=[];
 for(const f of [{axis:2,sign:-1,u:0,v:1,face:2},{axis:0,sign:-1,u:1,v:2,face:0},{axis:0,sign:1,u:1,v:2,face:0},{axis:1,sign:1,u:0,v:2,face:0},{axis:1,sign:-1,u:0,v:2,face:0},{axis:2,sign:1,u:0,v:1,face:1}]){
  function vertex(i,j){const p=[0,0,0];p[f.axis]=half[f.axis]*f.sign;const coord=(a,k)=>[-half[a],-half[a]+R*.3,-half[a]+R,half[a]-R,half[a]-R*.3,half[a]][k];p[f.u]=coord(f.u,i);p[f.v]=coord(f.v,j);const core=p.map((v,a)=>Math.max(-half[a]+R,Math.min(half[a]-R,v))),n=normalize(p.map((v,a)=>v-core[a])),q=core.map((v,a)=>v+n[a]*R);return [...q,...n,(q[0]+.5),(q[1]+L/2)/L,f.face];}
  for(let i=0;i<5;i++)for(let j=0;j<5;j++){const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i+1,j+1),d=vertex(i,j+1);out.push(...a,...b,...c,...a,...c,...d);}
 }return new Float32Array(out);
}
const mesh=geometry(),sourceImage=createImageLoader();
const vs='precision mediump float;attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;attribute float aFace;uniform vec2 uViewport,uOrigin,uU,uV,uD,uFlip;uniform float uDepth,uKind;varying vec3 vNormal,vLocal;varying vec2 vUV;varying float vFace;void main(){vec2 p;float z;if(uKind>.5){p=aPosition.xy;z=.95;}else{p=uOrigin+uU*(aPosition.x+.5)+uV*(aPosition.y+'+(L/2)+')/'+L+'+uD*('+T/2+'-aPosition.z)/'+T+';z=-(uDepth+aPosition.z*6.+aPosition.y*.01)/600.;}gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,z,1.);vNormal=vec3(aNormal.x*normalize(uU)+aNormal.y*normalize(uV),aNormal.z);vLocal=aPosition;vUV=mix(aUV,1.-aUV,uFlip);vFace=aFace;}';
const fs=`precision mediump float;
varying vec3 vNormal,vLocal; varying vec2 vUV; varying float vFace;
uniform sampler2D uBody,uFace,uBack;
uniform float uBackTile,uPlainBack,uKind,uAlpha,uSmallMan;
void main(){
 if(uKind>2.5){vec2 q=abs(vUV-.5)*2.;float edge=max(q.x,q.y);gl_FragColor=vec4(SHADOW,uAlpha*(1.-smoothstep(.36,1.,edge)));return;}
 vec3 color;float light=1.;
 if(uKind>.5){color=uKind>1.5?vec3(WOOD):vec3(FELT);if(uKind<1.5)color+=sin(gl_FragCoord.x*1.1+gl_FragCoord.y*.7)*.003;}
 else{
  vec3 n=normalize(vNormal),lamp=normalize(vec3(-.38,-.58,.82));
  float diffuse=max(dot(n,lamp),0.);
  light=.78+.22*diffuse;
  if(vFace>.5&&vFace<1.5){
   if(uBackTile>.5){
    vec4 back=texture2D(uBack,vUV);color=mix(vec3(JADE)*.76,back.rgb,back.a);
    if(color.g>color.r*1.2)color=vec3(JADE)*clamp(color.g/BACK_REFERENCE,.72,1.13);
    if(uPlainBack>.5)color=vec3(JADE)*.94;
    // Soft directional tone separates the panel from matte felt without a white outline.
    color*=.94+.075*(1.-vUV.y)+.025*(1.-vUV.x);
    // Shallow moulded panel: quiet textured material on the recessed centre.
    float edge=min(min(vUV.x,1.-vUV.x),min(vUV.y,1.-vUV.y)*1.375);
    float rim=1.-smoothstep(.020,.065,edge);
    float lip=smoothstep(.015,.038,edge)*(1.-smoothstep(.038,.067,edge));
    color=color*(1.-lip*.12)+vec3(JADE)*.15*rim;
   }else{
    vec2 uv=mix(vec2(190.,165.)/1254.,vec2(1060.,735.)/1254.,vUV);
    color=mix(vec3(CREAM),texture2D(uBody,uv).rgb,.62);
    vec2 art=(vUV-.5)/.98+.5;
    // Preserve original calligraphy. Give the identifying numeral more space at small sizes.
    bool numeral=art.y<.49;
    vec2 center=numeral?vec2(.5,.28):vec2(.5,.72);
    vec2 opticalScale=numeral?vec2(1.15,1.12):vec2(1.,.91);
    art=mix(art,center+(art-center)/opticalScale,uSmallMan);
    vec4 glyph=texture2D(uFace,clamp(art,0.,1.));
    if(uSmallMan>.0){
     if((numeral&&art.y>=.48)||(!numeral&&art.y<.485))glyph.a*=1.-uSmallMan;
     vec3 ink=glyph.r>glyph.b?vec3(.65,.10,.10):vec3(.08,.17,.32);
     glyph.rgb=mix(glyph.rgb,ink,uSmallMan*.65);
    }
    if(any(lessThan(art,vec2(0.)))||any(greaterThan(art,vec2(1.))))glyph.a=0.;
    color=mix(color,glyph.rgb,glyph.a);
   }
   light=.90+.10*diffuse;
  }else{
   float layer=uBackTile>.5?vLocal.z:-vLocal.z;
   float backing=smoothstep(THRESHOLD-.006,THRESHOLD+.006,layer);
   color=mix(vec3(CREAM),vec3(GREEN),backing);
   // A narrow material join, not a painted white edge.
   color*=1.-.065*(1.-smoothstep(.002,.012,abs(layer-THRESHOLD)));
  }
  float glint=pow(max(dot(n,normalize(vec3(-.30,-.46,1.))),0.),18.);
  color+=vec3(1.,.985,.92)*glint*.055;
 }
 gl_FragColor=vec4(color*light,1.);
}`.replaceAll('BACK_REFERENCE',String(PALETTE.backReferenceGreen)).replaceAll('JADE',PALETTE.jade.join(',')).replaceAll('FELT',PALETTE.felt.join(',')).replaceAll('WOOD',PALETTE.wood.join(',')).replaceAll('SHADOW',PALETTE.shadow.join(',')).replaceAll('GREEN',MATERIAL.green.join(',')).replaceAll('CREAM',MATERIAL.cream.join(',')).replaceAll('THRESHOLD',String(T*.10));

function shader(g,type,src){const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;}
export function faceObject(rect,extra={}){
 const margin=rect.width/64,d=rect.height*.13;
 return {origin:[rect.x+margin,rect.y+margin],u:[rect.width-2*margin,0],v:[0,rect.height-d-2*margin],d:[0,d],depth:rect.y+rect.height,...extra};
}
export class TileRenderer{
 constructor(canvas){
  this.canvas=canvas;const g=this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});if(!g)throw Error('WebGL unavailable');
  const p=this.program=g.createProgram();g.attachShader(p,shader(g,g.VERTEX_SHADER,vs));g.attachShader(p,shader(g,g.FRAGMENT_SHADER,fs));g.linkProgram(p);for(const shader of g.getAttachedShaders(p)){g.detachShader(p,shader);g.deleteShader(shader);}if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));g.useProgram(p);
  this.uniforms=Object.fromEntries(['uBody','uFace','uBack','uBackTile','uPlainBack','uKind','uAlpha','uSmallMan','uViewport','uOrigin','uU','uV','uD','uFlip','uDepth'].map(n=>[n,g.getUniformLocation(p,n)]));
  this.attributes=[['aPosition',3,0],['aNormal',3,3],['aUV',2,6],['aFace',1,8]].map(([n,size,offset])=>({loc:g.getAttribLocation(p,n),size,offset}));
  this.meshBuffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.meshBuffer);g.bufferData(g.ARRAY_BUFFER,mesh,g.STATIC_DRAW);
  this.surfaceBuffer=g.createBuffer();this.surfaceData=new Float32Array(54);this.textures=new Map();this.disposed=false;this.stats={draws:0,resizes:0,meshUploads:1,textureBytes:0};g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);
 }
 dispose(){if(this.disposed)return;this.disposed=true;const g=this.gl;for(const t of this.textures.values())g.deleteTexture(t);this.textures.clear();g.deleteBuffer(this.meshBuffer);g.deleteBuffer(this.surfaceBuffer);g.deleteProgram(this.program);}
 async load(){
  const ids=Array.from({length:9},(_,i)=>i+1).flatMap(n=>['m','p','s'].map(s=>n+s)).concat(Array.from({length:7},(_,i)=>(i+1)+'z'));
  const sources=[['body','assets/table-v34/body-art.png'],['back','assets/table-v52/back-plain.png'],...ids.map(id=>[id,'assets/table-v34/glyphs/'+id+'.png']),...['character','botanical'].flatMap(s=>Array.from({length:8},(_,i)=>[s+'/'+(i+1)+'f','assets/table-v37/'+s+'/'+(i+1)+'f.png']))];
  sources.push(...Array.from({length:8},(_,i)=>['compact/'+(i+1)+'f','data:image/svg+xml;charset=utf-8,'+encodeURIComponent(compactFlowerSVG((i+1)+'f'))]));
  await Promise.all(sources.map(async([id,url])=>{let img;try{img=await sourceImage(url,id==='body'?512:256);}catch(error){if(!id.includes('/')||id.startsWith('compact/'))throw error;img=await sourceImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(compactFlowerSVG(id.split('/')[1])));}
   if(this.disposed)return;const g=this.gl;if(g.isContextLost())throw Error('WebGL context lost');const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,img);this.stats.textureBytes+=img.width*img.height*4;g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);this.textures.set(id,t);}));
 }
 bind(buffer){const g=this.gl;g.bindBuffer(g.ARRAY_BUFFER,buffer);for(const {loc,size,offset} of this.attributes){g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,size,g.FLOAT,false,36,offset*4);}}
 surface(points,kind,alpha=1){
  const g=this.gl;g.uniform1f(this.uniforms.uKind,kind);g.uniform1f(this.uniforms.uAlpha,alpha);g.uniform2f(this.uniforms.uFlip,0,0);
  let k=0;for(const i of [0,1,2,0,2,3])for(const n of [...points[i],0,0,0,1,...[[0,0],[1,0],[1,1],[0,1]][i],0])this.surfaceData[k++]=n;
  this.bind(this.surfaceBuffer);g.bufferData(g.ARRAY_BUFFER,this.surfaceData,g.DYNAMIC_DRAW);g.drawArrays(g.TRIANGLES,0,6);
 }
 shadowPoints(o){
  let p,u,v;
  if(o.kind==='hand'){p=[o.origin[0],o.origin[1]+o.v[1]-1];u=o.u;v=[o.d[0],3.0];}
  else {p=o.origin.map((n,i)=>n+o.d[i]);u=o.u;v=o.v;}
  if(o.flying)p[1]+=o.lift||0; // Keep a moving tile's shadow on the tabletop.
  const lu=Math.hypot(...u)||1,lv=Math.hypot(...v)||1,grow=o.lift?Math.min(4,1.5+o.lift*.09):1.25;
  const uu=u.map(n=>n*(1+grow*2/lu)),vv=v.map(n=>n*(1+grow*2/lv));
  const a=p.map((n,i)=>n-u[i]*grow/lu-v[i]*grow/lv+(i===1?.8:0));
  const pts=[a,a.map((n,i)=>n+uu[i]),a.map((n,i)=>n+uu[i]+vv[i]),a.map((n,i)=>n+vv[i])];
  return pts;
 }
 draw(list,{background=true,viewport=[854,394],pixelScale=null,shadows=true,opticalSizing=true}={}){
  const began=performance.now(),g=this.gl,c=this.canvas,r=rectOf(c),dpr=pixelScale??Math.min(devicePixelRatio||1,2),w=Math.round(pixelScale?viewport[0]*dpr:r.width*dpr),h=Math.round(pixelScale?viewport[1]*dpr:r.height*dpr);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;this.stats.resizes++;}
  g.viewport(0,0,w,h);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.useProgram(this.program);g.uniform2fv(this.uniforms.uViewport,viewport);
  g.uniform1i(this.uniforms.uBody,0);g.uniform1i(this.uniforms.uFace,1);g.uniform1i(this.uniforms.uBack,2);
  for(const[id,unit]of[['body',0],['back',2]]){g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,this.textures.get(id));}
  if(background){this.surface([[236,84],[618,84],[863,394],[-9,394]],2);this.surface([[245,89],[609,89],[846,385],[8,385]],1);}
  // Preserve opaque tabletop alpha while blending translucent contact shadows.
  if(shadows){g.disable(g.DEPTH_TEST);g.depthMask(false);g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);const data=[];for(const o of list){const pts=this.shadowPoints(o);for(const i of [0,1,2,0,2,3])data.push(...pts[i],0,0,0,1,...[[0,0],[1,0],[1,1],[0,1]][i],0);}g.uniform1f(this.uniforms.uKind,3);g.uniform1f(this.uniforms.uAlpha,.31);g.uniform2f(this.uniforms.uFlip,0,0);this.bind(this.surfaceBuffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array(data),g.DYNAMIC_DRAW);g.drawArrays(g.TRIANGLES,0,data.length/9);g.disable(g.BLEND);g.depthMask(true);g.enable(g.DEPTH_TEST);}
  g.uniform1f(this.uniforms.uKind,0);this.bind(this.meshBuffer);
  for(const o of list){
   g.uniform1f(this.uniforms.uSmallMan,opticalSizing?smallManFace(o,r.width/viewport[0]):0);
   g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.textures.get(o.face||'back'));g.uniform1f(this.uniforms.uBackTile,o.back?1:0);g.uniform1f(this.uniforms.uPlainBack,o.kind==='wall'?1:0);
   for(const[n,value]of[['uOrigin',o.origin],['uU',o.u],['uV',o.v],['uD',o.d]])g.uniform2fv(this.uniforms[n],value);
   g.uniform2f(this.uniforms.uFlip,o.flipU?1:0,o.flipV?1:0);g.uniform1f(this.uniforms.uDepth,o.flying?540:o.depth);g.drawArrays(g.TRIANGLES,0,mesh.length/9);
  }
  this.stats.draws++;this.stats.lastDrawMs=Math.round((performance.now()-began)*100)/100;return g.getError();
 }
 async faceImages(){
  const urls=new Map();
  for(const id of this.textures.keys()){if(id==='body')continue;const o=faceObject({x:0,y:0,width:128,height:176},{face:id==='back'?null:id,back:id==='back',kind:'preview'});
   this.draw([o],{background:false,viewport:[128,176],pixelScale:2,shadows:false});
   urls.set(id,this.canvas.toDataURL('image/png'));
  }await Promise.all([...urls.values()].map(async url=>{const img=new Image();img.src=url;await decodeImage(img);}));return urls;
 }
}

