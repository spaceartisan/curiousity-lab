"""Convert a window of quantized note events (384 ticks/quarter) into ABC + playback events."""
from fractions import Fraction as F
LET='CDEFGAB'; LPC=[0,2,4,5,7,9,11]
SHARPS='FCGDAEB'
KEYS={'C':0,'G':1,'D':2,'A':3,'E':4,'B':5,'F#':6,'C#':7,'F':-1,'Bb':-2,'Eb':-3,'Ab':-4,'Db':-5,'Gb':-6,'Cb':-7,
 'Am':0,'Em':1,'Bm':2,'F#m':3,'C#m':4,'G#m':5,'D#m':6,'Dm':-1,'Gm':-2,'Cm':-3,'Fm':-4,'Bbm':-5,'Ebm':-6}
def keymap(key):
  n=KEYS[key]; m={l:0 for l in LET}
  if n>0:
    for l in SHARPS[:n]: m[l]=1
  else:
    for l in SHARPS[::-1][:-n]: m[l]=-1
  return m
def tonic_pc(key):
  base=key.rstrip('m') if key.endswith('m') else key
  l=base[0]; a={'#':1,'b':-1}.get(base[1:2],0)
  return (LPC[LET.index(l)]+a)%12
def spell(p,key):
  km=keymap(key); pc=p%12; n=KEYS[key]; minor=key.endswith('m')
  for i,l in enumerate(LET):
    if (LPC[i]+km[l])%12==pc: return l,km[l],(p-LPC[i]-km[l])//12-1
  # chromatic
  if minor and pc==(tonic_pc(key)-1)%12:
    tl=key[0]; l=LET[(LET.index(tl)-1)%7]
  else:
    prefer=1 if n>=0 else -1
    if n==0 and pc==10: prefer=-1
    cands=[(L,a) for i,L in enumerate(LET) for a in (-1,0,1) if (LPC[i]+a)%12==pc]
    cands.sort(key=lambda c:(0 if c[1]==0 else 1 if c[1]==prefer else 2))
    l=cands[0][0]
  i=LET.index(l)
  alter=((pc-LPC[i]+6)%12)-6
  octv=(p-LPC[i]-alter)//12-1
  return l,alter,octv
def pitch_abc(l,alter,octv,state,key):
  acc=''
  st=state.get((l,octv),keymap(key)[l])
  if alter!=st:
    acc={2:'^^',1:'^',0:'=',-1:'_',-2:'__'}[alter]; state[(l,octv)]=alter
  if octv>=5: s=l.lower()+"'"*(octv-5)
  else: s=l+","*(4-octv)
  return acc+s
# durations in 32nds (L:1/32); a quarter is 384 ticks = 8 units => 48 ticks/unit
OK=[64,48,32,24,16,12,8,6,4,3,2,1]
def split_units(u):
  out=[]
  while u>0:
    for o in OK:
      if o<=u: out.append(o); u-=o; break
  return out
def voices_for(notes,lo,hi):
  """notes: [on,dur,pitch,vel] clipped to window; group chords; assign to voices."""
  groups={}
  for on,d,p,v in notes:
    g=groups.setdefault((on,d),[])
    if p not in g: g.append(p)
  voices=[]
  for (on,d),ps in sorted(groups.items(),key=lambda x:(x[0][0],-max(x[1]))):
    for vc in voices:
      if vc[-1][0]+vc[-1][1]<=on: vc.append((on,d,sorted(ps)));break
    else: voices.append([(on,d,sorted(ps))])
  # order voices by mean pitch desc
  voices.sort(key=lambda vc:-sum(sum(g[2])/len(g[2]) for g in vc)/len(vc))
  return voices
def tuplet_ok(d): return d%48!=0
def emit_voice(vc,bars,key,primary,beat=384):
  out=[]; 
  items=[]  # (on,dur,pitches or None)
  t=bars[0]
  for on,d,ps in vc:
    if on>t: items.append((t,on-t,None))
    items.append((on,d,ps)); t=on+d
  if t<bars[-1]: items.append((t,bars[-1]-t,None))
  # cut items at barlines
  cut=[]
  for on,d,ps in items:
    while d>0:
      be=min(b for b in bars if b>on)
      seg=min(d,be-on); cut.append([on,seg,ps,d>seg]); on+=seg; d-=seg
  bi=1; state={}; meas=[]; cur=[]
  i=0
  while i<len(cut):
    on,d,ps,tie=cut[i]
    while on>=bars[bi]:
      meas.append(join(cur,bars[bi-1],beat)); cur=[]; state={}; bi+=1
    if tuplet_ok(d):
      # gather a tuplet group up to the next 384/192 boundary that sums to grid
      grp=[]; tot=0; j=i
      while j<len(cut) and tuplet_ok(cut[j][1]) :
        grp.append(cut[j]); tot+=cut[j][1]; j+=1
        if tot%96==0: break
      if tot%96==0:
        r=len(grp); s=[]
        for g in grp:
          u=g[1]*3//2//48
          s.append(tok(g,u,state,key,True))
        cur.append((on,f"(3:2:{r}"+''.join(s))); i=j; continue
      # fallback: snap
      d=max(48,round(d/48)*48); cut[i][1]=d
    u=d//48
    parts=split_units(u)
    toks=[]
    for k,pu in enumerate(parts):
      last=k==len(parts)-1
      toks.append(tok([on,0,ps,tie if last else True],pu,state,key,primary))
    cur.append((on,''.join(toks))); i+=1
  meas.append(join(cur,bars[bi-1],beat))
  while len(meas)<len(bars)-1: meas.append('z'+str((bars[len(meas)+1]-bars[len(meas)])//48))
  return meas
def join(cur,b0,beat):
  out='';prev=None
  for on,t in cur:
    g=(on-b0)//beat
    if prev is not None and (g!=prev or t[0] in 'zx' or out[-1:]=='-' ): out+=' '
    out+=t; prev=g
  return out
def tok(g,u,state,key,primary):
  on,_,ps,tie=g[0],g[1],g[2],g[3]
  ln='' if u==1 else str(u)
  if ps is None: return ('z' if primary else 'x')+ln
  names=[]
  for p in ps:
    l,a,o=spell(p,key); names.append(pitch_abc(l,a,o,state,key))
  body=names[0] if len(names)==1 else '['+''.join(names)+']'
  return body+ln+('-' if tie and ps else '')
def to_abc(title,staves,key,ts,bars,qpm,clefs=None):
  num,den=ts
  hdr=['X:1',f'T:{title}' if title else 'T:',f'M:{num}/{den}','L:1/32',f'Q:1/4={round(qpm)}']
  vlines=[]; score=[]; vid=0
  beat=384*3//2*4//den if (num%3==0 and num>3) else (384*num*4//den if num==3 and den==8 else 384*4//den if den==8 else 384)
  for si,st in enumerate(staves):
    lo,hi=bars[0],bars[-1]
    notes=[[on,min(d,hi-on),p,v] for on,d,p,v in st['notes'] if lo<=on<hi]
    vcs=voices_for(notes,lo,hi) or [[]]
    vcs=vcs[:3]
    clef=clefs[si] if clefs else st.get('clef','treble')
    grp=[]
    for k,vc in enumerate(vcs):
      vid+=1; grp.append(f'V{vid}')
      meas=emit_voice(vc,bars,key,k==0,beat)
      hdr.append(f'V:V{vid} clef={clef}'+(' stem=up' if len(vcs)>1 and k==0 else ' stem=down' if len(vcs)>1 else ''))
      vlines.append((f'V{vid}',meas))
    score.append('('+' '.join(grp)+')' if len(grp)>1 else grp[0])
  hdr.insert(5,'%%score {'+' | '.join(score)+'}')
  hdr.append(f'K:{key}')
  body=[]
  for v,meas in vlines:
    body.append(f'[V:{v}] '+' | '.join(meas)+' |]')
  return '\n'.join(hdr+body)+'\n'

def normalize(notes):
  """Snap LilyPond-performed timing back to notated values; drop grace notes."""
  out=[]
  for on,d,p,v in notes:
    if on%48==0 and d%48==0: out.append([on,d,p,v]); continue
    if on%64==0 and d%64==0 and (on%384)%64==0: out.append([on,d,p,v]); continue
    if d<48: continue
    a=round(on/48)*48; b=round((on+d)/48)*48
    if b>a: out.append([a,b-a,p,v])
  return out
