from pathlib import Path
from PIL import Image, ImageDraw
from scipy import ndimage
import numpy as np,json,hashlib
root=Path('/workspace/sites/poultry-yard-lab')
src=root/'art-recovery/turkey-original.png';out=root/'assets/birds-v2';out.mkdir(parents=True,exist_ok=True)
im=Image.open(src).convert('RGBA');a=np.array(im);alpha=a[:,:,3]
lab,n=ndimage.label(alpha>128);objects=ndimage.find_objects(lab)
cores=[]
for i,s in enumerate(objects):
 if s is not None and np.count_nonzero(lab[s]==i+1)>1000:
  ys,xs=np.where(lab==i+1);cores.append(dict(label=i+1,xc=float(xs.mean()),yc=float(ys.mean()),core_bounds=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]))
assert len(cores)==24
cores.sort(key=lambda c:(int(c['yc']//256),c['xc']))
# Nearest full-opacity component assigns only overlap pixels to their own subject.
# All original RGBA within each padded source crop is retained, except pixels
# belonging to a different subject; no color-keying or background correction.
seed=np.zeros(alpha.shape,dtype=np.int16)
for j,c in enumerate(cores):seed[lab==c['label']]=j+1
_,indices=ndimage.distance_transform_edt(seed==0,return_indices=True)
owner=seed[tuple(indices)]
names=['walk','wing-sweep','stomp','charge-prepare','charge-run','peck-series'];records=[]
canvas=Image.new('RGB',(1024,1656),'#9cab91');d=ImageDraw.Draw(canvas)
for k,c in enumerate(cores):
 row=k//4;col=k%4;x0,y0,x1,y1=c['core_bounds'];bounds=[max(0,x0-5),max(0,y0-5),min(im.width,x1+5),min(im.height,y1+5)]
 l,t,r,b=bounds;crop=a[t:b,l:r].copy();crop[owner[t:b,l:r]!=k+1]=0
 # Same source-pixel scale across all states. Align lowest opaque foot at y480.
 scale=1.4;w=round((r-l)*scale);h=round((b-t)*scale)
 sprite=Image.fromarray(crop).resize((w,h),Image.Resampling.LANCZOS)
 px=round((512-w)/2);py=480-round((y1-t)*scale)
 assert px>=0 and py>=0 and px+w<=512 and py+h<=512,(k,bounds,(px,py,w,h))
 frame=Image.new('RGBA',(512,512));frame.paste(sprite,(px,py))
 stem=f'turkey-{names[row]}-{col+1:02}'
 frame.save(out/(stem+'.png'));frame.save(out/(stem+'.webp'),lossless=True,method=6)
 records.append(dict(file=stem+'.png',source_bounds=bounds,core_bounds=c['core_bounds'],source_scale=scale,canvas=[512,512],paste=[px,py],feet_baseline=480,alpha_original=True))
 thumb=frame.resize((256,256));cx=col*256;cy=row*276;canvas.paste(thumb,(cx,cy),thumb);d.text((cx+3,cy+256),stem,fill='black')
canvas.save(root/'art-recovery/turkey-recut-contact-sheet.png')
manifest=dict(source=str(src.relative_to(root)),source_sha256=hashlib.sha256(src.read_bytes()).hexdigest(),source_size=list(im.size),method='24 alpha>128 connected-component cores; nearest-core subject ownership; unchanged RGBA colors and alpha within 5px padded source bounds; uniform 1.4x scaling; feet baseline y480',frames=records)
(root/'art-recovery/turkey-source-bounds-manifest.json').write_text(json.dumps(manifest,indent=2))
print('Exported',len(records),'PNG + lossless WebP frames. Largest PNG bytes',max((out/r['file']).stat().st_size for r in records))
print(json.dumps([(r['file'],r['source_bounds']) for r in records]))
