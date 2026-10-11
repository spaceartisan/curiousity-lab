"""Generate src/content/repertoire.json from public-domain sources.
Run: node scripts/music/hymn-events.cjs && python3 scripts/music/gen.py  (needs: pip install mido)"""
import json, os
from midiload import load
from build import excerpt
from hymns import hymn_excerpt, EV
from toabc import to_abc
from catalog import PIECES
HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', '..', 'src', 'content', 'repertoire.json')
M = json.load(open(os.path.join(HERE, 'mutopia.json')))

def moonlight():
  # Beethoven Op. 27 No. 2, bars 1-4. Pitches verified against Mutopia's guitar-duo edition (in D minor),
  # transposed down a semitone to the original C# minor, with the bass doubled at the octave as in the piano score.
  meta, st = load(os.path.join(HERE, 'sources', 'mutopia', 'moonlight-guitar-duo.mid'))
  end = 4 * 1536
  rh = [[on, d, p - 1, 70] for on, d, p, v in st[0]['notes'] if on < end]
  lh = []
  for on, d, p, v in st[1]['notes']:
    if on < end: lh += [[on, d, p - 1, 64], [on, d, p - 13, 64]]
  staves = [{'notes': rh, 'clef': 'treble', 'pedal': []}, {'notes': lh, 'clef': 'bass', 'pedal': []}]
  bars = [0, 1536, 3072, 4608, 6144]
  abc = to_abc('', staves, 'C#m', (4, 4), bars, 54)
  ev = sorted([round(on / 384, 4), round(d / 384, 4), p, v, si] for si, s in enumerate(staves) for on, d, p, v in s['notes'])
  return {'abc': abc, 'events': ev, 'pedal': [[0, 1], [11.95, 0], [12, 1]], 'tempo': 54, 'beats': 16}

out = []
for pid, meta in PIECES.items():
  if pid == 'moonlight':
    e = moonlight(); src = {'name': 'Mutopia Project (guitar-duo edition, transposed)', 'url': M['urls']['moonlight'], 'license': 'Public domain'}
  elif pid in M['excerpts']:
    e = excerpt(os.path.join(HERE, 'sources', 'mutopia', pid + '.mid'), **M['excerpts'][pid])
    src = {'name': 'Mutopia Project', 'url': M['urls'][pid], 'license': 'Public domain'}
  else:
    h = EV[pid]; num, den = h['ts']
    e = hymn_excerpt(pid, 4 if num in (6, 9) or (num == 3 and den == 2) else 8)
    src = {'name': 'Open Hymnal Project', 'url': 'http://openhymnal.org/', 'license': 'Public domain'}
  out.append({'id': pid, **meta, **e, 'source': src})
json.dump(out, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
print(f'Wrote {len(out)} excerpts to {os.path.relpath(OUT)} ({os.path.getsize(OUT)//1024} KB)')
