from collections import Counter


def findMinimumGroups(security):
    if not security:
        return 0

    counts = list(Counter(security).values())
    min_count = min(counts)

    # Iterate from the largest possible group size down.
    # Larger s => fewer groups, so the first feasible s is optimal.
    for s in range(min_count, 0, -1):
        total = 0
        feasible = True
        for f in counts:
            min_groups = (f + s) // (s + 1)   # ceil(f / (s+1))
            max_groups = f // s
            if min_groups > max_groups:
                feasible = False
                break
            total += min_groups
        if feasible:
            return total

    return len(security)
