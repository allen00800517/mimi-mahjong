// Project the original card artwork into the renderer's destination plane.
export function planeTransform(corners,width,height){
 if(!(width>0&&height>0)||corners.length!==4||corners.some(p=>p.some(v=>!Number.isFinite(v))))throw Error('Invalid card plane');
 const [p0,p1,p2,p3]=corners,dx1=p1[0]-p2[0],dx2=p3[0]-p2[0],dx3=p0[0]-p1[0]+p2[0]-p3[0],dy1=p1[1]-p2[1],dy2=p3[1]-p2[1],dy3=p0[1]-p1[1]+p2[1]-p3[1],det=dx1*dy2-dx2*dy1;
 const g=Math.abs(det)<1e-9?0:(dx3*dy2-dx2*dy3)/det,h=Math.abs(det)<1e-9?0:(dx1*dy3-dx3*dy1)/det;
 const a=p1[0]-p0[0]+g*p1[0],b=p3[0]-p0[0]+h*p3[0],d=p1[1]-p0[1]+g*p1[1],e=p3[1]-p0[1]+h*p3[1];
 return 'matrix3d('+[a/width,d/width,0,g/width,b/height,e/height,0,h/height,0,0,1,0,p0[0],p0[1],0,1].join(',')+')';
}
export function flightFrames(width,height,target){
 const start=[[0,0],[width,0],[width,height],[0,height]];
 return [0,.3,.72,1].map(p=>({offset:p,transform:planeTransform(start.map((q,i)=>[q[0]+(target[i][0]-q[0])*p,q[1]+(target[i][1]-q[1])*p-Math.sin(Math.PI*p)*18]),width,height),opacity:1}));
}
