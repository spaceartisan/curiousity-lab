import json,os
from toabc import to_abc
EV=json.load(open(os.path.join(os.path.dirname(__file__),'sources','openhymnal','events.json')))
def hymn_excerpt(k,nbars,tempo=None):
  h=EV[k]; num,den=h['ts']; bar=384*4*num//den; pk=h['pickup']
  up={'notes':sorted([on,d,p,80] for tr in h['tracks'][:2] for on,d,p in tr),'clef':'treble','pedal':[]}
  lo={'notes':sorted([on,d,p,72] for tr in h['tracks'][2:] for on,d,p in tr),'clef':'bass','pedal':[]}
  bars=[0]+([pk] if pk else [])
  while len(bars)<nbars+1+(1 if pk else 0): bars.append(bars[-1]+bar)
  end=bars[-1]; trim=end-pk if pk else end
  st=[]
  for s in (up,lo):
    ns=[[on,min(d,end-on),p,v] for on,d,p,v in s['notes'] if on<trim]
    st.append({'notes':ns,'clef':s['clef'],'pedal':[]})
  q=tempo or h['q']
  abc=to_abc('',st,h['key'],(num,den),bars,q)
  ev=sorted([round(on/384,4),round(d/384,4),p,v,si] for si,s in enumerate(st) for on,d,p,v in s['notes'])
  return {'abc':abc,'events':ev,'pedal':[],'tempo':round(q),'beats':round(end/384,4)}
