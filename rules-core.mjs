// Independent Taiwan 16-tile rule kernel. No UI, wall/deal engine or full scoring.
export class UnresolvedRuleError extends Error {
  constructor(id) { super("Unresolved rule: " + id); this.name = "UnresolvedRuleError"; this.ruleId = id; }
}
const states = ["S0", "S1", "S2", "S3"];
const kinds = ["sequence", "triplet", "concealedKan", "openKan"];
function requireValue(ok, message) { if (!ok) throw new TypeError(message); }
function stateCheck(state) { requireValue(states.includes(state), "Invalid declaration state"); }
function index(tile) {
  requireValue(typeof tile === "string" && /^[1-9][mps]$|^[1-7]z$/.test(tile), "Invalid tile: " + tile);
  return "mpsz".indexOf(tile[1]) * 9 + Number(tile[0]) - 1;
}
const tileName = i => String(i % 9 + 1) + "mpsz"[Math.floor(i / 9)];
export function parseHand(notation) {
  requireValue(typeof notation === "string", "Expected compact tile notation");
  if (!notation.trim()) return [];
  return notation.trim().split(/\s+/).flatMap(group => {
    requireValue(/^[1-9]+[mpsz]$/.test(group), "Invalid tile group");
    return [...group.slice(0, -1)].map(n => { const t = n + group.at(-1); index(t); return t; });
  });
}
function inspect(hand, melds, effectiveCount) {
  requireValue(Array.isArray(hand) && Array.isArray(melds) && melds.length <= 5, "Invalid hand or melds");
  const concealed = Array(34).fill(0), owned = Array(34).fill(0);
  for (const t of hand) { const i = index(t); concealed[i]++; owned[i]++; }
  for (const m of melds) {
    requireValue(m && kinds.includes(m.kind) && Array.isArray(m.tiles), "Invalid meld");
    const ids = m.tiles.map(index).sort((a,b) => a-b);
    const quad = m.kind.endsWith("Kan");
    requireValue(ids.length === (quad ? 4 : 3), "Invalid meld size");
    if (m.kind === "sequence") {
      requireValue(ids[0] < 27 && ids[0] % 9 <= 6 &&
        ids[1] === ids[0]+1 && ids[2] === ids[0]+2, "Invalid sequence");
    } else requireValue(ids.every(i => i === ids[0]), "Invalid triplet or kan");
    for (const i of ids) owned[i]++;
  }
  requireValue(owned.every(n => n <= 4), "More than four copies of a tile");
  requireValue(hand.length + 3*melds.length === effectiveCount, "Wrong effective hand size");
  return { concealed, owned };
}
function canComplete(counts, sets) {
  const memo = new Map();
  function solve(left, pairUsed) {
    const i = counts.findIndex(n => n > 0);
    if (i === -1) return left === 0 && pairUsed;
    const key = counts.join("") + ":" + left + ":" + pairUsed;
    if (memo.has(key)) return memo.get(key);
    let ok = false;
    if (!pairUsed && counts[i] >= 2) {
      counts[i] -= 2; ok = solve(left, true); counts[i] += 2;
    }
    if (!ok && left > 0 && counts[i] >= 3) {
      counts[i] -= 3; ok = solve(left-1, pairUsed); counts[i] += 3;
    }
    if (!ok && left > 0 && i < 27 && i%9 < 7 && counts[i+1] && counts[i+2]) {
      counts[i]--; counts[i+1]--; counts[i+2]--;
      ok = solve(left-1, pairUsed);
      counts[i]++; counts[i+1]++; counts[i+2]++;
    }
    memo.set(key, ok);
    return ok;
  }
  return solve(sets, false);
}
export function isWinningShape(hand, melds = []) {
  const { concealed } = inspect(hand, melds, 17);
  return canComplete(concealed, 5-melds.length);
}
export function waitingTiles(hand, melds = []) {
  const { concealed, owned } = inspect(hand, melds, 16);
  const result = [];
  for (let i=0; i<34; i++) {
    if (owned[i] === 4) continue;
    concealed[i]++;
    if (canComplete(concealed, 5-melds.length)) result.push(tileName(i));
    concealed[i]--;
  }
  return result;
}
// Only normal hand wins; special flower choices require the unresolved event policy.
export function ordinaryWinOffer({state, eligible, passed = false}) {
  stateCheck(state);
  requireValue(typeof eligible === "boolean" && typeof passed === "boolean", "Expected boolean eligibility");
  if (!eligible || passed) return { actions: [], automaticClaim: false };
  const forced = state === "S2" || state === "S3";
  return { actions: forced ? ["win"] : ["win", "pass"], automaticClaim: forced };
}
export function afterDiscard({state, handAfterDiscard, melds = [], discarded, passed}) {
  stateCheck(state); index(discarded);
  requireValue(typeof passed === "boolean", "Expected pass state");
  // The current discard is also an owned tile before it leaves the hand.
  inspect([...handAfterDiscard, discarded], melds, 17);
  const waits = waitingTiles(handAfterDiscard, melds);
  return { state, passed: passed && waits.includes(discarded) };
}
export function declaredKan({
  state, handBeforeDraw, melds = [], drawnTile, kind, tile = drawnTile,
  replacementAvailableAfterReserve, passed = false
}) {
  stateCheck(state);
  requireValue(state !== "S0", "Use the undeclared action engine for S0");
  requireValue(["concealedKan", "addedKan"].includes(kind), "Unsupported kan kind");
  requireValue(typeof replacementAvailableAfterReserve === "boolean" && typeof passed === "boolean", "Expected boolean guards");
  index(tile); index(drawnTile);
  inspect([...handBeforeDraw, drawnTile], melds, 17);
  const reject = reason => ({ allowed: false, reason });
  if (state === "S2" || state === "S3") return reject("SPECIAL_DECLARATION_KAN_FORBIDDEN");
  if (tile !== drawnTile) return reject("FOURTH_TILE_MUST_BE_NEW_DRAW");
  if (!replacementAvailableAfterReserve) return reject("NO_LEGAL_REPLACEMENT");
  const before = waitingTiles(handBeforeDraw, melds);
  if (!before.length) return reject("DECLARED_HAND_NOT_READY");
  // Choosing kan instead of a legal win constitutes pass; a caller may not bypass it.
  if (!passed && isWinningShape([...handBeforeDraw, drawnTile], melds))
    return reject("RESOLVE_WIN_OR_PASS_FIRST");
  let nextHand = [...handBeforeDraw];
  const nextMelds = melds.map(m => ({kind:m.kind, tiles:[...m.tiles]}));
  if (kind === "concealedKan") {
    if (nextHand.filter(t => t === tile).length !== 3) return reject("NO_CONCEALED_TRIPLET");
    nextHand = nextHand.filter(t => t !== tile);
    nextMelds.push({kind:"concealedKan", tiles:Array(4).fill(tile)});
  } else {
    const at = nextMelds.findIndex(m => m.kind === "triplet" && m.tiles[0] === tile);
    if (at < 0) return reject("NO_EXPOSED_TRIPLET");
    nextMelds[at] = {kind:"openKan", tiles:Array(4).fill(tile)};
  }
  const after = waitingTiles(nextHand, nextMelds);
  if (before.join(",") !== after.join(",")) return reject("WAIT_SET_CHANGED");
  return {
    allowed:true, beforeWaits:before, afterWaits:after,
    requiresRobKanWindow:kind === "addedKan",
    candidate:{hand:nextHand, melds:nextMelds, state, passed}
  };
}
// Tile membership must still be checked by the hand engine before asking for these group points.
export function declarationGroupTai({state, method, menzen}) {
  stateCheck(state);
  requireValue(["ron","tsumo","rob_added_kan"].includes(method), "Unsupported win method");
  requireValue(typeof menzen === "boolean", "Expected menzen flag");
  if (state === "S2" || state === "S3") {
    requireValue(menzen, "Special declaration cannot have exposed melds");
    return (state === "S2" ? 4 : 8) + (method === "tsumo" ? 2 : 0);
  }
  return (state === "S1" ? 1 : 0) + (method === "tsumo" ? (menzen ? 3 : 1) : (menzen ? 1 : 0));
}
function seat(x) { requireValue(Number.isInteger(x) && x >= 0 && x < 4, "Invalid seat"); }
export function dealerTai({dealer, winner, payer, repeats}) {
  [dealer,winner,payer].forEach(seat);
  requireValue(winner !== payer && Number.isSafeInteger(repeats) && repeats >= 0, "Invalid payment or repeat count");
  const amount = 1 + 2*repeats;
  requireValue(Number.isSafeInteger(amount), "Repeat count exceeds exact numeric range");
  return dealer === winner || dealer === payer ? amount : 0;
}
// Seats 0,1,2,3 MUST be numbered in play order. Not a physical compass mapping.
export function resolveRon({discarder, claims}) {
  seat(discarder);
  requireValue(Array.isArray(claims), "Expected claims");
  const seen = new Set(), accepted = [];
  for (const c of claims) {
    seat(c.seat); stateCheck(c.state);
    requireValue(c.seat !== discarder && !seen.has(c.seat), "Invalid or duplicate claimant");
    seen.add(c.seat);
    requireValue(typeof c.eligible === "boolean" && typeof c.passed === "boolean", "Expected claim guards");
    const offer = ordinaryWinOffer(c);
    if (!offer.actions.length) {
      requireValue(c.choice === undefined, "Ineligible player cannot choose win or pass");
      continue;
    }
    if (offer.automaticClaim) {
      requireValue(c.choice === undefined || c.choice === "win", "Special declaration cannot pass");
      accepted.push(c.seat);
    } else {
      requireValue(["win","pass"].includes(c.choice), "An optional claimant must respond");
      if (c.choice === "win") accepted.push(c.seat);
    }
  }
  accepted.sort((a,b) => ((a-discarder+4)%4)-((b-discarder+4)%4));
  return {winner:accepted[0] ?? null, blockedClaims:accepted.slice(1)};
}
export function requireResolvedRule(config, id) {
  if (config.pending.some(r => r.id === id)) throw new UnresolvedRuleError(id);
  const rule = config.rules.find(r => r.id === id);
  if (!rule) throw new UnresolvedRuleError(id);
  return rule.value;
}

