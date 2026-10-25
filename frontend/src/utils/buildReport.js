/**
 * buildReport.js
 * Builds the 12-section contract report from REAL data returned by your backend:
 *   contract     -> GET /contracts/{id}        (fields + clauses)
 *   risks        -> GET /risks/contract/{id}   (risk findings)
 *   policies     -> GET /policies
 *   allContracts -> GET /contracts             (used for version history)
 * Nothing here is hardcoded per contract: every section is computed from that data.
 */

// ---------- small helpers ----------
export const norm = (s) => String(s || '').toLowerCase().replace(/_/g, ' ').trim();

export const levelOf = (v) => {
  const s = norm(v);
  if (s.startsWith('h') || s.includes('critical')) return 'High';
  if (s.startsWith('m')) return 'Medium';
  return 'Low';
};

export const scoreLevel = (score) => (score >= 60 ? 'High' : score >= 25 ? 'Medium' : 'Low');

/** Returns: violation | compliant | review | missing */
export const statusOf = (r) => {
  const s = norm(r.compliance_status);
  if (/not found|missing|not applicable|n\/a/.test(s)) return 'missing';
  if (/non|violat|fail|breach/.test(s)) return 'violation';
  if (/review|uncertain|unclear/.test(s)) return 'review';
  if (/compliant|pass|meets/.test(s)) return 'compliant';
  return 'review';
};

/** Map any category text to a stable key */
export const catKey = (cat) => {
  const s = norm(cat);
  if (/penalt|late fee|liquidated/.test(s)) return 'penalties';
  if (/indemn/.test(s)) return 'indemnification';
  if (/pay|fee|invoice/.test(s)) return 'payment';
  if (/terminat/.test(s)) return 'termination';
  if (/liab/.test(s)) return 'liability';
  if (/confiden|nda/.test(s)) return 'confidentiality';
  if (/govern|jurisdiction/.test(s)) return 'governing_law';
  if (/data|privacy|gdpr/.test(s)) return 'data_protection';
  if (/intellect|\bip\b|copyright|patent/.test(s)) return 'ip';
  if (/dispute|arbitrat/.test(s)) return 'dispute';
  if (/notice/.test(s)) return 'notice';
  if (/renew/.test(s)) return 'renewal';
  if (/support|maint|warrant|sla/.test(s)) return 'support';
  if (/scope|service|deliver|work/.test(s)) return 'scope';
  return 'other';
};

export const CAT_LABEL = {
  payment: 'Payment Terms', penalties: 'Penalties', termination: 'Termination',
  liability: 'Liability', indemnification: 'Indemnification', confidentiality: 'Confidentiality',
  governing_law: 'Governing Law', data_protection: 'Data Protection', ip: 'Intellectual Property',
  dispute: 'Dispute Resolution', notice: 'Notice Period', renewal: 'Renewal',
  support: 'Support & Maintenance', scope: 'Scope of Work', other: 'Other',
};

// Clauses most contracts contain; used to detect "missing information"
const EXPECTED = ['scope', 'payment', 'termination', 'liability', 'confidentiality',
  'governing_law', 'data_protection', 'ip', 'dispute', 'support'];

// Typical impact per category (a general, category-level explanation)
const IMPACT = {
  payment: 'Cash-flow pressure and possible late-payment charges.',
  penalties: 'Direct financial penalties and increased cost liability.',
  termination: 'Business disruption, loss of resources and costly transition.',
  liability: 'Large or unlimited financial exposure if something goes wrong.',
  indemnification: "You may have to cover the other party's losses and legal costs.",
  confidentiality: 'Leak of sensitive information with little legal protection.',
  governing_law: 'Disputes may be decided under an unfamiliar legal system.',
  data_protection: 'Regulatory fines and loss of customer trust.',
  ip: 'Unclear ownership of work, code or other created material.',
  dispute: 'Slow or expensive dispute handling.',
  notice: 'Too little time to react to contract changes or termination.',
  renewal: 'Unwanted automatic renewal or loss of an exit window.',
  support: 'Unclear obligations for support, leading to service gaps.',
  scope: 'Disagreements about what is actually being delivered.',
  other: 'May affect obligations or costs; reviewer attention recommended.',
};

// ---------- dependency graph ----------
// Row (layer) of each category in the graph, and which category can influence which.
const LAYER = { payment: 0, ip: 0, confidentiality: 0, support: 0, scope: 0,
  penalties: 1, liability: 1, data_protection: 1,
  indemnification: 2, notice: 2, governing_law: 2, dispute: 2, other: 2,
  termination: 3, renewal: 3 };
const EDGES = [
  ['payment', 'penalties'], ['penalties', 'termination'],
  ['liability', 'indemnification'], ['liability', 'termination'], ['indemnification', 'termination'],
  ['notice', 'termination'], ['notice', 'renewal'],
  ['confidentiality', 'data_protection'], ['ip', 'liability'], ['support', 'termination'],
];

const rank = { High: 3, Medium: 2, Low: 1 };

// ---------- dates ----------
export const parseDate = (value) => {
  if (!value) return null;
  const str = String(value).trim();
  const dmy = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return isNaN(d) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
};

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec';
const DATE_RE = new RegExp(
  `(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{4}|(?:${MONTHS})\\.? \\d{1,2}(?:st|nd|rd|th)?,? \\d{4}|\\d{1,2}(?:st|nd|rd|th)? (?:${MONTHS})\\.?,? \\d{4})`, 'gi');

export const fmtDate = (d) =>
  d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not found';

const daysBetween = (a, b) => Math.round((b - a) / 86400000);

// ---------- what-if ----------
const DROP = { High: 20, Medium: 10, Low: 5 };

/**
 * Estimates the new risk score if one finding is changed to `newValue`.
 * This is an ESTIMATE using transparent rules, not a legal conclusion.
 */
export function simulate(item, newValue, currentScore) {
  const num = parseFloat(String(newValue).replace(/,/g, ''));
  if (isNaN(num)) return { ok: false, message: 'Enter a number to simulate.' };
  const { threshold } = item;
  let satisfied = null;
  if (threshold != null) {
    if (item.direction === 'min') satisfied = num >= threshold;
    else if (item.direction === 'max') satisfied = num <= threshold;
    else satisfied = num === threshold;
  }
  let drop = 0;
  if (satisfied === true) drop = DROP[item.level];
  else if (satisfied === null) drop = Math.round(DROP[item.level] / 2); // cannot verify -> half credit
  const after = Math.max(0, Math.min(100, currentScore - drop));
  const word = item.direction === 'min' ? 'minimum' : item.direction === 'max' ? 'maximum' : 'required value';
  return {
    ok: true, satisfied, before: currentScore, after, drop,
    beforeLevel: scoreLevel(currentScore), afterLevel: scoreLevel(after),
    message:
      satisfied === true
        ? `A value of ${num} meets the company rule, so this finding would be resolved.`
        : satisfied === false
        ? `A value of ${num} still does not meet the company rule (${word}: ${threshold}).`
        : 'This company rule has no numeric limit, so only partial improvement is assumed.',
  };
}

const parseThreshold = (text) => {
  const t = String(text || '');
  const m = t.match(/(\d+(?:\.\d+)?)/);
  if (!m) return { threshold: null, direction: null };
  const low = t.toLowerCase();
  let direction = null;
  if (/≥|>=|at least|minimum|min\b|not less|no less|or more|or longer/.test(low)) direction = 'min';
  else if (/≤|<=|at most|maximum|max\b|not exceed|no more|within|up to|or less|or shorter/.test(low)) direction = 'max';
  return { threshold: parseFloat(m[1]), direction };
};

// ---------- version grouping ----------
export const versionKey = (c) => {
  let s = (c.title || c.filename || '').toLowerCase().replace(/\.[a-z0-9]+$/, '');
  let prev;
  do {
    prev = s;
    s = s.replace(/[\s_-]*(v\d+|final|copy|draft|revised|\(\d+\)|\d{4}[-_]\d{2}[-_]\d{2})$/i, '');
  } while (s !== prev);
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
};

// ---------- main builder ----------
export function buildReport({ contract, risks = [], policies = [], allContracts = [] }) {
  const clauses = contract.clauses || [];
  const score = Number(contract.overall_risk_score) || 0;
  const level = contract.overall_risk_level || scoreLevel(score);

  // enrich every risk finding
  const policyByName = {};
  policies.forEach((p) => { policyByName[norm(p.name)] = p; });
  const findings = risks.map((r) => {
    const policy = policyByName[norm(r.matched_policy_rule)];
    let threshold = policy && policy.numeric_threshold != null && policy.numeric_threshold !== ''
      ? Number(policy.numeric_threshold) : null;
    const parsed = parseThreshold(`${r.matched_policy_rule || ''} ${policy?.expected_condition || ''}`);
    if (threshold == null) threshold = parsed.threshold;
    const key = catKey(r.category || policy?.category);
    return { ...r, key, status: statusOf(r), level: levelOf(r.risk_level), threshold,
      direction: parsed.direction, title: r.risk_title || CAT_LABEL[key] };
  });

  const issues = findings.filter((f) => f.status === 'violation' || f.status === 'review');
  const violations = findings.filter((f) => f.status === 'violation');
  const compliant = findings.filter((f) => f.status === 'compliant');
  const sortedIssues = [...issues].sort((a, b) => rank[b.level] - rank[a.level]);

  // missing information = expected clause types absent from the contract
  const present = new Set(clauses.map((c) => catKey(c.category)));
  const notFoundByEngine = findings.filter((f) => f.status === 'missing').map((f) => f.key);
  const missing = EXPECTED.filter((k) => !present.has(k)).map((k) => ({
    key: k, label: CAT_LABEL[k],
    detail: notFoundByEngine.includes(k)
      ? 'Required by company policy but not found in this contract.'
      : 'No clause of this type was identified.',
  }));

  // clause table: risk level comes from findings of the same category
  const levelByCat = {};
  issues.forEach((f) => {
    if (!levelByCat[f.key] || rank[f.level] > rank[levelByCat[f.key]]) levelByCat[f.key] = f.level;
  });
  const clauseRows = clauses.map((c) => {
    const key = catKey(c.category);
    return { id: c.id, key, label: CAT_LABEL[key], title: c.clause_title || CAT_LABEL[key],
      text: c.clause_text, page: c.page_number, level: levelByCat[key] || 'Low' };
  });

  // 1. executive summary
  const parties = contract.parties || 'Not found';
  const type = contract.contract_type || 'contract';
  const bits = [
    `This is a ${type} between ${parties}.`,
    contract.effective_date
      ? `It is effective from ${contract.effective_date}${contract.expiration_date ? ` and runs until ${contract.expiration_date}` : ''}.`
      : null,
    contract.payment_terms_summary ? `Payment terms: ${contract.payment_terms_summary}.` : null,
    contract.notice_period_summary ? `Notice period: ${contract.notice_period_summary}.` : null,
    contract.governing_law ? `Governing law: ${contract.governing_law}.` : null,
  ].filter(Boolean);
  const top = sortedIssues[0];
  const summary = {
    text: bits.join(' '),
    concern: top
      ? `${top.title}: ${top.mismatch_reason || 'Needs reviewer attention.'}`
      : 'No policy violations were detected against the active company policies.',
    concernLevel: top ? top.level : 'Low',
    extra: missing.length
      ? `${missing.length} expected clause type(s) were not found: ${missing.map((m) => m.label).join(', ')}.`
      : '',
  };

  // 2. dependency graph
  const nodeMap = {};
  issues.forEach((f) => {
    const n = nodeMap[f.key];
    if (!n || rank[f.level] > rank[n.level]) {
      nodeMap[f.key] = { key: f.key, label: f.title, sub: CAT_LABEL[f.key], page: f.source_page, level: f.level };
    }
  });
  const nodes = Object.values(nodeMap);
  const edges = EDGES.filter(([a, b]) => nodeMap[a] && nodeMap[b]).map(([from, to]) => ({
    from, to,
    text: `A change in ${CAT_LABEL[from].toLowerCase()} can indirectly affect ${CAT_LABEL[to].toLowerCase()}.`,
  }));

  // 3. simulator items
  const simulatorItems = sortedIssues.map((f, i) => ({
    id: String(i), label: f.title, rule: f.matched_policy_rule, level: f.level,
    threshold: f.threshold, direction: f.direction, reason: f.mismatch_reason,
  }));

  // 7. compliance table
  const complianceRows = findings.filter((f) => f.matched_policy_rule).map((f) => ({
    rule: f.matched_policy_rule,
    clause: f.key === 'other' ? (f.category || 'N/A') : CAT_LABEL[f.key],
    page: f.source_page, status: f.status,
    detail: f.mismatch_reason || (f.status === 'compliant' ? 'Meets requirement' : 'Needs review'),
  }));

  // 9. insights
  const recs = [...new Set(sortedIssues.map((f) => f.suggested_action).filter(Boolean))].slice(0, 5);
  missing.slice(0, 2).forEach((m) => recs.push(`Clarify or add the ${m.label.toLowerCase()} clause.`));
  const verdict = score >= 60 ? 'Overall, this contract requires legal review before approval.'
    : score >= 25 ? 'Overall, this contract needs reviewer attention before approval.'
    : 'Overall, this contract looks low risk, but a routine review is still recommended.';

  // 10 & 11. important dates and deadline tracker
  const now = new Date();
  const events = [];
  const eff = parseDate(contract.effective_date);
  const exp = parseDate(contract.expiration_date);
  if (eff) events.push({ label: 'Contract effective / signing', date: eff, kind: 'signing' });
  clauses.filter((c) => catKey(c.category) === 'payment').forEach((c) => {
    const found = (c.clause_text || '').match(DATE_RE) || [];
    found.slice(0, 4).forEach((m) => {
      const d = parseDate(m.replace(/(\d)(st|nd|rd|th)/, '$1').replace(/\./g, ''));
      if (d) events.push({ label: `Payment date (${c.clause_title || 'Payment clause'})`, date: d, kind: 'payment' });
    });
  });
  if (exp) events.push({ label: 'Contract expiry / end date', date: exp, kind: 'expiry' });
  const seen = new Set();
  const uniqueEvents = events.filter((e) => {
    const k = `${e.label}|${e.date.toDateString()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a, b) => a.date - b.date);

  const start = eff || (contract.created_at ? new Date(contract.created_at) : now);
  const statusFor = (left, kind) =>
    (left < 0 ? (kind === 'signing' ? 'Completed' : kind === 'expiry' ? 'Expired' : 'Overdue') : left <= 30 ? 'At Risk' : 'On Track');
  const dates = uniqueEvents.map((e) => {
    const left = daysBetween(now, e.date);
    return { label: e.label, date: fmtDate(e.date), left, status: statusFor(left, e.kind) };
  });
  const deadlines = uniqueEvents.map((e) => {
    const total = Math.max(1, daysBetween(start, e.date));
    const used = Math.min(total, Math.max(0, daysBetween(start, now)));
    const left = daysBetween(now, e.date);
    return { label: e.label, used, total, left, status: statusFor(left, e.kind) };
  });

  // 12. risk explanations
  const explanations = sortedIssues.map((f) => ({
    title: f.title, level: f.level, risk: f.mismatch_reason,
    clause: `${f.key === 'other' ? (f.category || 'Clause') : CAT_LABEL[f.key]}${f.source_page ? ` (page ${f.source_page})` : ''}`,
    clauseText: f.original_clause_text, rule: f.matched_policy_rule, reason: f.mismatch_reason,
    impact: IMPACT[f.key], action: f.suggested_action, ai: f.ai_explanation,
  }));

  // 6. version history (same title / filename family)
  const myKey = versionKey(contract);
  const family = allContracts
    .filter((c) => c.id === contract.id || (versionKey(c) === myKey && c.processing_status === 'analyzed'))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const versions = family.map((c, i) => ({
    id: c.id, label: c.id === contract.id ? 'Current' : `v${i + 1}`,
    score: Number(c.overall_risk_score) || 0, filename: c.filename, date: c.created_at,
  }));

  return {
    header: {
      title: contract.title || contract.filename, filename: contract.filename, parties,
      date: contract.effective_date || fmtDate(contract.created_at ? new Date(contract.created_at) : null),
      pages: contract.page_count, status: contract.processing_status,
    },
    score, level,
    kpis: {
      clauses: clauses.length, risks: issues.length,
      high: issues.filter((f) => f.level === 'High').length,
      medium: issues.filter((f) => f.level === 'Medium').length,
      low: issues.filter((f) => f.level === 'Low').length,
      violations: violations.length, missing: missing.length,
    },
    summary, graph: { nodes, edges, layers: LAYER }, simulatorItems,
    clauseRows, issues: sortedIssues, violations, missing, complianceRows,
    complianceCounts: {
      compliant: compliant.length, violated: violations.length,
      review: findings.filter((f) => f.status === 'review').length,
    },
    insights: { top: sortedIssues.slice(0, 4), recs, verdict },
    dates, deadlines, explanations, versions,
  };
}

/** Compare two contracts' clauses (current vs. another version). */
export function compareVersions(current, other) {
  const group = (cl) => {
    const m = {};
    (cl || []).forEach((c) => {
      const k = catKey(c.category);
      m[k] = m[k] ? { ...m[k], text: `${m[k].text}\n${c.clause_text}` } : { title: c.clause_title, text: c.clause_text };
    });
    return m;
  };
  const a = group(current.clauses);
  const b = group(other.clauses);
  const clean = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const added = Object.keys(a).filter((k) => !b[k]);
  const removed = Object.keys(b).filter((k) => !a[k]);
  const modified = Object.keys(a).filter((k) => b[k] && clean(a[k].text) !== clean(b[k].text));
  const sA = Number(current.overall_risk_score) || 0;
  const sB = Number(other.overall_risk_score) || 0;
  return {
    added: added.map((k) => ({ key: k, label: CAT_LABEL[k], now: a[k].text })),
    removed: removed.map((k) => ({ key: k, label: CAT_LABEL[k], before: b[k].text })),
    modified: modified.map((k) => ({ key: k, label: CAT_LABEL[k], before: b[k].text, now: a[k].text })),
    scoreBefore: sB, scoreAfter: sA, scoreChange: sA - sB,
  };
}
