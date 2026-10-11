"""Prepare laboratory media from public sources into public/media/lab and public/media/cells.

Sources (not committed; fetched separately):
  CDC PHIL lores JPEGs saved as <pid>.jpg in --phil
  PBC dataset (Acevedo et al. 2020, CC BY 4.0) zip at --pbc
Outputs: cropped/resized JPEGs + manifest JSON with provenance and SHA-256 for every file.
"""
import argparse, hashlib, io, json, os, random, re, zipfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
PHIL = json.load(open(os.path.join(HERE, 'phil-images.json')))

def save(im, path, max_side, quality=82):
  im = im.convert('RGB')
  im.thumbnail((max_side, max_side), Image.LANCZOS)
  buf = io.BytesIO(); im.save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
  data = buf.getvalue(); open(path, 'wb').write(data)
  return hashlib.sha256(data).hexdigest(), im.size

def phil(src):
  out = os.path.join(ROOT, 'public', 'media', 'lab'); os.makedirs(out, exist_ok=True)
  manifest = []
  for item in PHIL:
    im = Image.open(os.path.join(src, item['pid'] + '.jpg'))
    if item.get('mask'):
      im = im.convert('RGB'); bg = im.getpixel((5, 5))
      for box in item['mask']: im.paste(bg, tuple(box))
    if item.get('circle'):  # keep only the dish; repaint everything outside it with the backdrop colour
      from PIL import ImageDraw
      im = im.convert('RGB'); cx, cy, r = item['circle']
      keep = Image.new('L', im.size, 0); ImageDraw.Draw(keep).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
      im = Image.composite(im, Image.new('RGB', im.size, im.getpixel((8, 240))), keep)
    if item.get('crop'): im = im.crop(tuple(item['crop']))
    name = item['file']
    sha, size = save(im, os.path.join(out, name), 900)
    manifest.append({**item, 'sha256': sha, 'pixelDimensions': list(size),
      'sourceUrl': f"https://wwwn.cdc.gov/phil/Details.aspx?pid={item['pid']}",
      'sourceName': 'CDC Public Health Image Library', 'license': 'Public domain (CDC PHIL); credit CDC',
      'changes': ('Cropped/masked to remove printed labels; ' if item.get('crop') or item.get('mask') or item.get('circle') else '') + 'resized and recompressed'})
  json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
  print('phil', len(manifest))

# How many images of each kind to keep for building differentials.
POOL = {'SNE': 80, 'BNE': 30, 'LY': 70, 'MO': 30, 'EO': 30, 'BA': 14, 'MMY': 14, 'MY': 14, 'PMY': 8, 'ERB': 14}
LABEL = {'SNE': 'seg', 'BNE': 'band', 'LY': 'lymph', 'MO': 'mono', 'EO': 'eos', 'BA': 'baso', 'MMY': 'meta', 'MY': 'myelo', 'PMY': 'pro', 'ERB': 'nrbc'}

def cells(zip_path):
  out = os.path.join(ROOT, 'public', 'media', 'cells'); os.makedirs(out, exist_ok=True)
  z = zipfile.ZipFile(zip_path)
  names = sorted(n for n in z.namelist() if n.endswith('.jpg') and '__MACOSX' not in n)
  rng = random.Random(20201)
  manifest = []
  for prefix, count in POOL.items():
    group = [n for n in names if re.match(prefix + r'_\d', n.split('/')[-1])]
    for i, n in enumerate(sorted(rng.sample(group, count))):
      file = f"{LABEL[prefix]}-{i + 1:02d}.jpg"
      sha, size = save(Image.open(io.BytesIO(z.read(n))), os.path.join(out, file), 224, 78)
      manifest.append({'file': file, 'cell': LABEL[prefix], 'sourceFile': n.split('/', 1)[1], 'sha256': sha,
        'pixelDimensions': list(size)})
  json.dump({'source': 'Acevedo A, Merino A, Alférez S, Molina Á, Boldú L, Rodellar J. A dataset of microscopic peripheral blood cell images for development of automatic recognition systems. Data in Brief 30 (2020) 105474. Mendeley Data, doi:10.17632/snkd93bnjr.1',
    'license': 'CC BY 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/',
    'changes': 'Selected subset; resized to 240 px and recompressed. Labels are the dataset’s expert annotations.',
    'cells': manifest}, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
  print('cells', len(manifest))

if __name__ == '__main__':
  a = argparse.ArgumentParser(); a.add_argument('--phil'); a.add_argument('--pbc'); args = a.parse_args()
  if args.phil: phil(args.phil)
  if args.pbc: cells(args.pbc)
