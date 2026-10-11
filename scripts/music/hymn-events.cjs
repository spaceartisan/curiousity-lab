// Reads Open Hymnal ABC sources and writes quantized SATB note events (384 ticks per quarter).
const abcjs = require('abcjs'); const fs = require('fs'); const path = require('path');
const dir = path.join(__dirname, 'sources', 'openhymnal'); const out = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.abc')).sort()) {
  const abc = fs.readFileSync(path.join(dir, f), 'latin1');
  const [tune] = abcjs.parseOnly(abc);
  const audio = tune.setUpAudio({});
  let secondsPerWhole = null;
  for (const line of tune.lines) for (const st of line.staff || []) for (const v of st.voices) for (const el of v)
    if (!secondsPerWhole && el.el_type === 'note' && el.midiPitches?.length && !el.pitches[0].startTie) secondsPerWhole = el.midiPitches[0].duration / el.duration;
  const scale = 1536 / secondsPerWhole, grid = x => Math.round(x * scale / 48) * 48;
  const meter = tune.getMeterFraction(), key = tune.getKeySignature();
  const q = abc.match(/Q:\s*(\d+)\/(\d+)\s*=\s*(\d+)/);
  out[f.replace('.abc', '')] = {
    ts: [meter.num, meter.den], key: key.root + key.acc + (key.mode === 'm' ? 'm' : ''),
    pickup: Math.round(tune.getPickupLength() * 1536), q: q ? (+q[3] * +q[1] * 4) / +q[2] : 100,
    tracks: audio.tracks.map(tr => tr.filter(e => e.cmd === 'note').map(e => [grid(e.start), grid(e.start + e.duration) - grid(e.start), e.pitch])),
  };
}
fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify(out));
console.log(`Wrote events for ${Object.keys(out).length} hymns.`);
