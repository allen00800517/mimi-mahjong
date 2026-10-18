// v0.99 · Plays a green-screen (#00FF00) video with the green keyed out in real time (WebGL), so a Flow clip can stand
// on the live table. Same rule as the still-image keying (work/key_still.py): transparency follows how much green
// outweighs red and blue, so teal tile backs and dark hair stay solid; any green cast left on edges is removed.
// Without WebGL it draws the plain video (the caller can choose to show the still instead).
const VS='attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}';
const FS='precision mediump float;varying vec2 uv;uniform sampler2D t;void main(){vec4 c=texture2D(t,uv);float m=max(c.r,c.b);float d=c.g-m;'+
 'float a=1.-smoothstep(.05,.24,d);float g=d>0.?m:c.g;gl_FragColor=vec4(vec3(c.r,g,c.b)*a,a);}';
export class ChromaVideo{
 constructor(canvas,video){
  this.canvas=canvas;this.video=video;this.gl=null;
  try{this.gl=canvas.getContext('webgl',{premultipliedAlpha:true,alpha:true});}catch{}
  if(this.gl)this.setup();else this.ctx=canvas.getContext('2d');
 }
 get keyed(){return !!this.gl;}
 setup(){
  const gl=this.gl,sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;};
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  this.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.tex);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
 }
 draw(){
  const v=this.video;if(!v.videoWidth)return false;
  if(this.canvas.width!==v.videoWidth||this.canvas.height!==v.videoHeight){this.canvas.width=v.videoWidth;this.canvas.height=v.videoHeight;}
  if(!this.gl){this.ctx.drawImage(v,0,0);return true;}
  const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindTexture(gl.TEXTURE_2D,this.tex);
  try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,v);}catch{return false;}
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return true;
 }
 clear(){if(this.gl){this.gl.clearColor(0,0,0,0);this.gl.clear(this.gl.COLOR_BUFFER_BIT);}else this.ctx?.clearRect(0,0,this.canvas.width,this.canvas.height);}
}
