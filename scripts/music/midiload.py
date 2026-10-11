import mido
NAMES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
def nm(p): return NAMES[p%12]+str(p//12-1)
def load(fn):
  f=mido.MidiFile(fn); tpb=f.ticks_per_beat
  meta={'key':None,'ts':None,'tempo':None}; staves=[]
  for t in f.tracks:
    tick=0;on={};notes=[];ped=[]
    for msg in t:
      tick+=msg.time
      if msg.is_meta:
        if msg.type=='key_signature' and meta['key'] is None: meta['key']=msg.key
        if msg.type=='time_signature' and meta['ts'] is None: meta['ts']=(msg.numerator,msg.denominator)
        if msg.type=='set_tempo' and meta['tempo'] is None: meta['tempo']=mido.tempo2bpm(msg.tempo)
        continue
      if msg.type=='control_change' and msg.control==64: ped.append((tick*384//tpb,msg.value>=64))
      if msg.type=='note_on' and msg.velocity>0: on.setdefault(msg.note,[]).append((tick,msg.velocity))
      elif msg.type in('note_off','note_on') and on.get(msg.note):
        s,v=on[msg.note].pop(0); notes.append([s*384//tpb,(tick-s)*384//tpb,msg.note,v])
    if notes: staves.append({'name':t.name,'notes':sorted(notes),'pedal':ped})
  return meta,staves
