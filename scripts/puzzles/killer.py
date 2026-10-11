"""Generate Killer Sudoku puzzles with a verified unique solution.
A random solved grid is cut into connected cages; a bitmask solver with cage-sum pruning
counts solutions (stopping at 2). Only unique puzzles are kept."""
import json, random, sys, time

def solved_grid(rng):
    base = [[(3 * (r % 3) + r // 3 + c) % 9 + 1 for c in range(9)] for r in range(9)]
    digits = list(range(1, 10)); rng.shuffle(digits)
    rows = [b * 3 + r for b in rng.sample(range(3), 3) for r in rng.sample(range(3), 3)]
    cols = [b * 3 + c for b in rng.sample(range(3), 3) for c in rng.sample(range(3), 3)]
    g = [[digits[base[r][c] - 1] for c in cols] for r in rows]
    if rng.random() < 0.5: g = [list(x) for x in zip(*g)]
    return [v for row in g for v in row]

def neighbors(i):
    r, c = divmod(i, 9)
    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if 0 <= r + dr < 9 and 0 <= c + dc < 9: yield (r + dr) * 9 + c + dc

def make_cages(grid, rng, sizes):
    cage_of = [-1] * 81; cages = []
    order = list(range(81)); rng.shuffle(order)
    for start in order:
        if cage_of[start] >= 0: continue
        target = rng.choice(sizes); cells = [start]; cage_of[start] = len(cages); used = {grid[start]}
        while len(cells) < target:
            options = [n for c in cells for n in neighbors(c) if cage_of[n] < 0 and grid[n] not in used]
            if not options: break
            n = rng.choice(options); cells.append(n); cage_of[n] = len(cages); used.add(grid[n])
        cages.append(sorted(cells))
    return cages

def count_solutions(cages, limit=2):
    peers = []
    for i in range(81):
        r, c = divmod(i, 9); b = (r // 3) * 3 + c // 3
        peers.append((r, c, b))
    cage_of = [0] * 81
    for k, cells in enumerate(cages):
        for i in cells: cage_of[i] = k
    sums = [None] * len(cages)
    row = [0] * 9; col = [0] * 9; box = [0] * 9
    vals = [0] * 81
    cage_sum = [0] * len(cages); cage_left = [len(c) for c in cages]; cage_used = [0] * len(cages)
    target = [0] * len(cages)
    return row, col, box, vals, cage_of, peers, cage_sum, cage_left, cage_used, target

class Solver:
    def __init__(self, cages, totals):
        self.cages = cages; self.totals = totals
        self.cage_of = [0] * 81
        for k, cells in enumerate(cages):
            for i in cells: self.cage_of[i] = k
    def feasible(self, k, extra_digit, used_mask, left, current):
        # remaining after placing extra: can the rest reach the total with distinct unused digits?
        need = self.totals[k] - current
        if left == 0: return need == 0
        free = [d for d in range(1, 10) if not used_mask >> d & 1]
        if len(free) < left: return False
        lo = sum(free[:left]); hi = sum(free[-left:])
        return lo <= need <= hi
    def count(self, limit=2):
        self.row = [0] * 9; self.col = [0] * 9; self.box = [0] * 9
        self.csum = [0] * len(self.cages); self.cleft = [len(c) for c in self.cages]; self.cmask = [0] * len(self.cages)
        self.vals = [0] * 81; self.found = 0; self.limit = limit; self.nodes = 0
        self._search()
        return self.found
    def candidates(self, i):
        r, c = divmod(i, 9); b = (r // 3) * 3 + c // 3; k = self.cage_of[i]
        taken = self.row[r] | self.col[c] | self.box[b] | self.cmask[k]
        out = []
        for d in range(1, 10):
            if taken >> d & 1: continue
            if self.feasible(k, d, self.cmask[k] | (1 << d), self.cleft[k] - 1, self.csum[k] + d): out.append(d)
        return out
    def _search(self):
        if self.found >= self.limit: return
        self.nodes += 1
        if self.nodes > 400000: self.found = self.limit; return  # too hard to settle: treat as not unique
        best = None; best_c = None
        for i in range(81):
            if self.vals[i]: continue
            cs = self.candidates(i)
            if not cs: return
            if best is None or len(cs) < len(best_c):
                best, best_c = i, cs
                if len(cs) == 1: break
        if best is None:
            self.found += 1; return
        i = best; r, c = divmod(i, 9); b = (r // 3) * 3 + c // 3; k = self.cage_of[i]
        for d in best_c:
            bit = 1 << d
            self.vals[i] = d; self.row[r] |= bit; self.col[c] |= bit; self.box[b] |= bit
            self.cmask[k] |= bit; self.csum[k] += d; self.cleft[k] -= 1
            self._search()
            self.vals[i] = 0; self.row[r] ^= bit; self.col[c] ^= bit; self.box[b] ^= bit
            self.cmask[k] ^= bit; self.csum[k] -= d; self.cleft[k] += 1
            if self.found >= self.limit: return

def generate(seed, sizes):
    rng = random.Random(seed)
    grid = solved_grid(rng)
    for attempt in range(60):
        cages = make_cages(grid, rng, sizes)
        totals = [sum(grid[i] for i in cells) for cells in cages]
        s = Solver(cages, totals)
        if s.count(2) == 1:
            return {'solution': grid, 'cages': [{'cells': c, 'sum': t} for c, t in zip(cages, totals)], 'nodes': s.nodes}
    return None

if __name__ == '__main__':
    out = []; seed = 1
    plan = [('Gentle', [2, 2, 3, 3], 12), ('Classic', [2, 3, 3, 4], 12), ('Challenging', [2, 3, 3, 4, 4, 5], 10)]
    for tier, sizes, n in plan:
        made = 0
        while made < n:
            t = time.time(); p = generate(seed, sizes); seed += 1
            if p:
                p['tier'] = tier; p['id'] = f'killer-{tier.lower()}-{made + 1:02d}'; out.append(p); made += 1
                print(tier, made, p['nodes'], f'{time.time()-t:.1f}s', len(p['cages']), file=sys.stderr)
    json.dump(out, open(sys.argv[1], 'w'), separators=(',', ':'))
