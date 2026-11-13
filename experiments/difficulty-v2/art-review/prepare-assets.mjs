import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const sharp=require(process.argv[2]?path.join(process.argv[2],'sharp'):'sharp');
const source=path.join(here,'sources'),out=path.join(here,'assets');
const runtime=path.join(here,'../client/assets/environment');
await fs.mkdir(out,{recursive:true});await fs.mkdir(runtime,{recursive:true});
const manifest={version:1,props:[],decals:[],rain:[],puddles:[],bomb:[],shockwave:[]};
async function cells(file,cols,rows,prefix,target,{runtimeCopy=false,max=384}={}){
 const input=path.join(source,file),meta=await sharp(input).metadata();
 const result=[];
 for(let i=0;i<cols*rows;i++){
  const left=Math.round(i%cols*meta.width/cols),top=Math.round(Math.floor(i/cols)*meta.height/rows);
  const width=Math.round((i%cols+1)*meta.width/cols)-left,height=Math.round((Math.floor(i/cols)+1)*meta.height/rows)-top;
  const {data,info}=await sharp(input).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let x0=width,y0=height,x1=-1,y1=-1,edgePixels=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>24){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);if(x<2||y<2||x>=width-2||y>=height-2)edgePixels++;}
  if(x1<0)throw Error('Empty sprite '+prefix+i);
  // Crop the user-requested atlas, retaining a safety border around each object.
  const pad=8,l=Math.max(0,x0-pad),t=Math.max(0,y0-pad),w=Math.min(width,x1+pad+1)-l,h=Math.min(height,y1+pad+1)-t;
  const name=prefix+'-'+String(i+1).padStart(2,'0')+'.webp';
  const image=await sharp(data,{raw:info}).extract({left:l,top:t,width:w,height:h}).resize({width:max,height:max,fit:'inside',withoutEnlargement:true}).webp({quality:88,alphaQuality:100}).toBuffer();
  await fs.writeFile(path.join(out,name),image);if(runtimeCopy)await fs.writeFile(path.join(runtime,name),image);
  result.push({file:name,index:i,width:w,height:h,edgePixels});
 }
 manifest[target].push(...result);return result;
}
await cells('props-normal.png',3,4,'normal','props',{runtimeCopy:true});
await cells('props-ruined.png',3,4,'ruined','props');
await cells('wasteland-decals.png',3,2,'ash','decals',{max:512});
await cells('rain-source.png',4,2,'rain','rain',{runtimeCopy:true,max:192});
await cells('puddles-muted.png',4,2,'puddle','puddles',{runtimeCopy:true,max:384});
await cells('bomb-source.png',4,1,'bomb','bomb',{max:384});
// One generated clean master, rendered into 24 aligned frames. No AI-grid bleed.
const ringPath=path.join(source,'shockwave-ring.png');
const ringMeta=await sharp(ringPath).metadata();
const ring=await sharp(ringPath).trim({threshold:8}).png().toBuffer();
const ringInfo=await sharp(ring).metadata();
await fs.writeFile(path.join(out,'shockwave-master.webp'),await sharp(ring).webp({quality:95,alphaQuality:100}).toBuffer());
const side=768,frames=[];
for(let i=0;i<24;i++){
 const t=i/23,d=Math.round(22+530*t),opacity=Math.min(1,(1-t)*5);
 const {data,info}=await sharp(ring).resize(d,d,{fit:'contain',background:'#00000000'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let n=3;n<data.length;n+=4)data[n]=Math.round(data[n]*opacity);
 const sprite=await sharp(data,{raw:info}).png().toBuffer(),frame=await sharp({create:{width:side,height:side,channels:4,background:'#00000000'}}).composite([{input:sprite,left:Math.round((side-d)/2),top:Math.round((side-d)/2)}]).png().toBuffer();
 const name='shock-'+String(i+1).padStart(2,'0')+'.png';await fs.writeFile(path.join(out,name),frame);frames.push(frame);
 manifest.shockwave.push({file:name,index:i,width:side,height:side,diameter:d,opacity,delayMs:35});
}
await sharp({create:{width:side*6,height:side*4,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%6*side,top:Math.floor(i/6)*side}))).png().toFile(path.join(out,'shockwave-24-atlas.png'));
await sharp(path.join(source,'wasteland-base.png')).webp({quality:92}).toFile(path.join(out,'wasteland-base.webp'));
await sharp(path.join(source,'night-source.png')).webp({quality:85,alphaQuality:100}).toFile(path.join(out,'night-mask.webp'));
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({props:manifest.props.length,frames:manifest.shockwave.length,sourceRing:[ringMeta.width,ringMeta.height],croppedRing:[ringInfo.width,ringInfo.height],edgeSprites:manifest.props.filter(x=>x.edgePixels>0),output:out}));
