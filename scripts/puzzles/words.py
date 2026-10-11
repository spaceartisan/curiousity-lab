"""Letter Hive sets and Word Ladders from SCOWL word lists (via the wordlist-english npm package).
Common words (SCOWL size <= 35) are the expected answers; size <= 50 words are accepted as bonus words.
Run with: python3 scripts/puzzles/words.py <path to node_modules/wordlist-english> src/content"""
import json, os, random, sys
from collections import deque

BLOCK = set('''
anal anus arse arses bastard bitch bitches boob boobs butt butts crap damn damned dick dicks dildo dyke fag fags fart farts fuck
fucked fucker fucking hell homo horny jizz kike nazi nigger nude nudes orgasm penis piss pissed poop porn porno prick pussy queer
rape raped rapist rectum semen sex sexy shit shits slut sluts spic suck sucked sucks tit tits turd twat vagina whore wank wanker
'''.split())

def load(root, maxsize):
    words = set()
    for variety in ('english', 'american'):
        for size in (10, 20, 35, 40, 50, 55):
            if size > maxsize: continue
            path = os.path.join(root, f'{variety}-words-{size}.json')
            if os.path.exists(path):
                words.update(w for w in json.load(open(path)) if w.isalpha() and w.islower() and w.isascii())
    return {w for w in words if w not in BLOCK}

def hives(common, extended, rng, count=60):
    pangrams = sorted({w for w in common if len(set(w)) == 7 and 's' not in w and len(w) >= 7})
    rng.shuffle(pangrams); out = []; used_sets = set()
    for p in pangrams:
        letters = ''.join(sorted(set(p)))
        if letters in used_sets: continue
        for center in rng.sample(letters, 7):
            ok = lambda w: len(w) >= 4 and center in w and set(w) <= set(letters)
            answers = sorted(w for w in common if ok(w))
            if not 18 <= len(answers) <= 45: continue
            bonus = sorted(w for w in extended if ok(w) and w not in answers)
            pang = [w for w in answers if set(w) == set(letters)]
            out.append({'id': f'hive-{len(out) + 1:02d}', 'center': center,
                        'letters': ''.join(sorted(c for c in letters if c != center)),
                        'answers': answers, 'bonus': bonus, 'pangrams': pang})
            used_sets.add(letters); break
        if len(out) >= count: break
    return out

def ladder_words(common, n):
    return sorted(w for w in common if len(w) == n)

def neighbors(word, wordset):
    for i in range(len(word)):
        for ch in 'abcdefghijklmnopqrstuvwxyz':
            if ch != word[i]:
                w = word[:i] + ch + word[i + 1:]
                if w in wordset: yield w

def shortest(a, b, wordset):
    prev = {a: None}; q = deque([a])
    while q:
        w = q.popleft()
        if w == b:
            path = []
            while w: path.append(w); w = prev[w]
            return path[::-1]
        for n in neighbors(w, wordset):
            if n not in prev: prev[n] = w; q.append(n)
    return None

CARROLL = [  # Lewis Carroll, "Doublets" (1879): his puzzles and published answers.
    ('HEAD', 'TAIL', 'Change HEAD into TAIL', ['head', 'heal', 'teal', 'tell', 'tall', 'tail']),
    ('PIG', 'STY', 'Drive PIG into STY', ['pig', 'wig', 'wag', 'way', 'say', 'sty']),
    ('APE', 'MAN', 'Evolve MAN from APE', ['ape', 'apt', 'opt', 'oat', 'mat', 'man']),
    ('FOUR', 'FIVE', 'Raise FOUR to FIVE', ['four', 'foul', 'fool', 'foot', 'fort', 'fore', 'fire', 'five']),
]

def ladders(common, extended, rng, everyday):
    out = []
    for a, b, title, path in CARROLL:
        out.append({'id': f'carroll-{a.lower()}-{b.lower()}', 'from': a.lower(), 'to': b.lower(), 'title': title,
                    'carroll': path, 'par': len(path) - 1, 'length': len(a)})
    for n, count in ((4, 26), (5, 14)):
        pool = ladder_words(common, n); wordset = set(pool); made = 0; tries = 0
        # Endpoints: everyday words, no plurals or -ed/-ing forms.
        ends = [w for w in pool if w in everyday and not (w.endswith('s') and not w.endswith('ss')) and not w.endswith('ed')]
        while made < count and tries < 40000:
            tries += 1
            a, b = rng.sample(ends, 2)
            if sum(x != y for x, y in zip(a, b)) < n - 1: continue
            path = shortest(a, b, wordset)
            if path and 4 <= len(path) - 1 <= (6 if n == 4 else 7):
                out.append({'id': f'ladder-{n}-{made + 1:02d}', 'from': a, 'to': b, 'title': f'Change {a.upper()} into {b.upper()}',
                            'example': path, 'par': len(path) - 1, 'length': n})
                made += 1
    return out

if __name__ == '__main__':
    root, outdir = sys.argv[1], sys.argv[2]
    rng = random.Random(41)
    common = load(root, 35); extended = load(root, 50)
    for w in ['head', 'heal', 'teal', 'tell', 'tall', 'tail', 'pig', 'wig', 'wag', 'way', 'say', 'sty', 'ape', 'apt', 'opt', 'oat', 'mat', 'man',
              'four', 'foul', 'fool', 'foot', 'fort', 'fore', 'fire', 'five']:
        assert w in extended, w
    h = hives(common, extended, rng)
    l = ladders(common, extended, rng, load(root, 20))
    # Valid ladder steps: every 3-5 letter word in the extended list.
    dictionary = {str(n): sorted(w for w in extended if len(w) == n) for n in (3, 4, 5)}
    json.dump({'hives': h}, open(os.path.join(outdir, 'hives.json'), 'w'), separators=(',', ':'))
    json.dump({'ladders': l, 'dictionary': dictionary}, open(os.path.join(outdir, 'ladders.json'), 'w'), separators=(',', ':'))
    print(len(h), 'hives;', len(l), 'ladders;', {k: len(v) for k, v in dictionary.items()}, 'dictionary words')
