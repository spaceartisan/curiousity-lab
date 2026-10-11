from midiload import load
from toabc import to_abc, normalize
def staves_of(st):
  def mean(s): return sum(n[2] for n in s['notes'])/len(s['notes'])
  names_low=('down','lower','lh','left','bass','two','izquierda')
  up=[];low=[]
  for s in st:
    nm=s['name'].lower()
    (low if any(nm.startswith(x) for x in names_low) else up if any(nm.startswith(x) for x in ('up','rh','right','treble','one','derecha')) else (up if mean(s)>=60 else low)).append(s)
  if not up: up=[low.pop(0)]
  merge=lambda ss:{'notes':sorted(n for s in ss for n in s['notes']),'pedal':sorted(p for s in ss for p in s['pedal'])}
  out=[merge(up)]; out[0]['clef']='treble'
  if low: out.append(merge(low)); out[1]['clef']='bass'
  return out
def excerpt(fn,start,pickup,nbars,tempo=None,trim=None,ts=None,key=None,clefs=None):
  meta,st=load(fn); st=staves_of(st)
  for s in st: s['notes']=normalize(s['notes'])
  num,den=ts or meta['ts']; bar=384*4*num//den
  bars=[start]+([start+pickup] if pickup else [])
  while len(bars)<nbars+1+(1 if pickup else 0): bars.append(bars[-1]+bar)
  if trim is None and pickup: trim=bars[-1]-pickup
  if trim is not None:  # drop notes starting at/after trim tick (phrase end), keep rests
    for s in st: s['notes']=[n for n in s['notes'] if n[0]<trim]
    for s in st:
      for n in s['notes']: n[1]=min(n[1],bars[-1]-n[0])
  q=tempo or meta['tempo']
  abc=to_abc('',st,key or meta['key'] or 'C',(num,den),bars,q,clefs)
  ev=[]
  for si,s in enumerate(st):
    for on,d,p,v in s['notes']:
      if bars[0]<=on<bars[-1]: ev.append([round((on-bars[0])/384,4),round(min(d,bars[-1]-on)/384,4),p,v,si])
  ped=[]
  for s in st[:1]+st[1:]:
    for t,down in s['pedal']:
      if bars[0]<=t<bars[-1]: ped.append([round((t-bars[0])/384,4),1 if down else 0])
  ped.sort()
  return {'abc':abc,'events':sorted(ev),'pedal':ped,'tempo':round(q),'beats':round((bars[-1]-bars[0])/384,4)}
