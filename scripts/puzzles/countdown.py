"""Countdown numbers rounds: six numbers, a three-digit target, and one verified solution.
Large numbers 25, 50, 75, 100 (one each); small numbers two each of 1-10. Only whole-number
intermediate results are allowed, as on the television show."""
import json, random, sys

def solve(nums, target):
    best = None
    seen = set()
    def rec(items):  # items: tuple of (value, expression, steps)
        nonlocal best
        key = tuple(sorted(v for v, _, _ in items))
        if key in seen: return
        seen.add(key)
        for v, e, s in items:
            if v == target and (best is None or len(s) < len(best)): best = s
        if best is not None and len(best) <= 2: return
        n = len(items)
        for i in range(n):
            for j in range(n):
                if i == j: continue
                a, ea, sa = items[i]; b, eb, sb = items[j]
                if a < b: continue
                rest = [items[k] for k in range(n) if k not in (i, j)]
                for op in '+-*/':
                    if op == '+' and i > j: continue
                    if op == '*' and (i > j or a == 1 or b == 1): continue
                    if op == '-':
                        if a == b: continue
                        r = a - b
                    elif op == '/':
                        if b == 1 or a % b: continue
                        r = a // b
                    elif op == '+': r = a + b
                    else: r = a * b
                    step = (a, op, b, r)
                    rec(tuple(rest + [(r, None, sa + sb + [step])]))
    rec(tuple((n, None, []) for n in nums))
    return best

def rounds(count, seed):
    rng = random.Random(seed); out = []
    while len(out) < count:
        large = rng.choice([0, 1, 1, 2, 2, 3, 4])
        nums = rng.sample([25, 50, 75, 100], large) + rng.sample([n for n in range(1, 11) for _ in range(2)], 6 - large)
        target = rng.randint(101, 999)
        steps = solve(nums, target)
        if steps and len(steps) >= 3:
            out.append({'id': f'numbers-{len(out) + 1:03d}', 'numbers': sorted(nums, reverse=True), 'target': target,
                        'solution': [list(s) for s in steps]})
            print(len(out), nums, target, len(steps), file=sys.stderr)
    return out

if __name__ == '__main__':
    json.dump(rounds(int(sys.argv[2]), 7), open(sys.argv[1], 'w'), separators=(',', ':'))
