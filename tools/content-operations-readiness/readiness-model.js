export const READINESS_VERSION = "1.0.0";

export const QUESTIONS = [
  { key: "productTruth", domain: "Truth foundation", label: "Product truth", text: "Can the team identify one approved record for product facts, claims, qualifiers, and channel variations used in this workflow?" },
  { key: "brandTruth", domain: "Truth foundation", label: "Brand truth", text: "Are current voice, terminology, design, prohibited-language, and claim rules documented and accessible?" },
  { key: "assetControl", domain: "Truth foundation", label: "Asset control", text: "Can the team quickly find the current approved asset, version, rights, and usage restrictions?" },
  { key: "workflow", domain: "Workflow control", label: "Workflow", text: "Is one repeated content workflow documented from request through publication and measurement?" },
  { key: "ownership", domain: "Workflow control", label: "Ownership", text: "Does every handoff, exception, and final approval have a named accountable owner?" },
  { key: "exceptions", domain: "Workflow control", label: "Exceptions", text: "Are common exceptions defined and routed to the specialist authorized to resolve them?" },
  { key: "approvedAIInputs", domain: "AI governance", label: "Approved AI inputs", text: "For claim-bearing work, can AI access only approved source material?" },
  { key: "humanApproval", domain: "AI governance", label: "Human approval", text: "Is it explicit what AI may prepare and what a qualified person must decide or approve?" },
  { key: "measurement", domain: "Measurement and learning", label: "Measurement", text: "Are baseline time, approval, correction, quality, and attributable-cost measures available?" },
  { key: "learning", domain: "Measurement and learning", label: "Learning", text: "Are approved components reused, corrections captured, and weak workflows reviewed or retired?" },
];

export const ANSWERS = [
  { label: "Absent", score: 0 }, { label: "Inconsistent", score: 1 },
  { label: "Working", score: 2 }, { label: "Controlled", score: 3 },
];

const STAGES = ["Scattered", "Documented", "Connected", "AI-assisted", "Agent-enabled", "Measured"];
const ORDER = ["productTruth", "ownership", "humanApproval", "approvedAIInputs", "workflow", "assetControl", "exceptions", "brandTruth", "measurement", "learning"];

const PLANS = {
  productTruth: ["Name an owner and inventory facts and claims.", "Establish approved records and qualifiers.", "Pilot one workflow against that source."],
  brandTruth: ["Gather current rules and prohibited language.", "Consolidate templates and review criteria.", "Measure brand corrections."],
  assetControl: ["Inventory versions and rights.", "Create a governed library and metadata.", "Evaluate DAM capability only if recurring complexity remains."],
  workflow: ["Map one real process.", "Remove avoidable handoffs.", "Pilot limited automation."],
  ownership: ["Name step and approval owners.", "Document escalation and backup authority.", "Audit decision time and exceptions."],
  exceptions: ["Record common exceptions.", "Route them to specialists.", "Test failure, rollback, and recovery."],
  approvedAIInputs: ["Restrict sources.", "Test retrieval and missing-data stops.", "Pilot claim-bearing work with logs."],
  humanApproval: ["Define the boundary.", "Document approval evidence.", "Test override and escalation."],
  measurement: ["Establish a baseline.", "Compare pilot and baseline.", "Decide whether to scale, redesign, or stop."],
  learning: ["Capture corrections.", "Build reusable approved components.", "Retire weak templates and automations."],
};

function rawStage(score) {
  if (score <= 8) return 0;
  if (score <= 14) return 1;
  if (score <= 20) return 2;
  if (score <= 25) return 3;
  if (score <= 28) return 4;
  return 5;
}

function validate(answers) {
  return QUESTIONS.every(({ key }) => Number.isInteger(answers[key]) && answers[key] >= 0 && answers[key] <= 3);
}

function stageCap(answers) {
  let cap = 5;
  if (["productTruth", "ownership", "approvedAIInputs", "humanApproval"].some((key) => answers[key] === 0)) cap = Math.min(cap, 1);
  if (["productTruth", "workflow", "ownership", "approvedAIInputs", "humanApproval"].some((key) => answers[key] < 2)) cap = Math.min(cap, 2);
  if (answers.exceptions < 3 || answers.humanApproval < 3) cap = Math.min(cap, 3);
  if (answers.measurement < 3 || answers.learning < 3) cap = Math.min(cap, 4);
  return cap;
}

function domainResults(answers) {
  const groups = {};
  for (const question of QUESTIONS) {
    groups[question.domain] ||= [];
    groups[question.domain].push(answers[question.key]);
  }
  return Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, values.reduce((a, b) => a + b, 0) / values.length]));
}

function bottlenecks(answers, domains) {
  let candidates = ORDER.filter((key) => answers[key] <= 1);
  if (!candidates.length) {
    const lowestAverage = Math.min(...Object.values(domains));
    const lowDomains = new Set(Object.keys(domains).filter((key) => domains[key] === lowestAverage));
    candidates = ORDER.filter((key) => lowDomains.has(QUESTIONS.find((question) => question.key === key).domain));
  }
  const primary = candidates[0];
  const primaryDomain = QUESTIONS.find((question) => question.key === primary).domain;
  const secondary = ORDER.find((key) => key !== primary && QUESTIONS.find((question) => question.key === key).domain !== primaryDomain && answers[key] === Math.min(...ORDER.filter((candidate) => QUESTIONS.find((question) => question.key === candidate).domain !== primaryDomain).map((candidate) => answers[candidate])));
  return { primary, secondary };
}

export function assessReadiness(answers) {
  if (!validate(answers)) return { ok: false, errors: [{ message: "Answer all ten questions." }] };
  const score = QUESTIONS.reduce((total, { key }) => total + answers[key], 0);
  const raw = rawStage(score);
  const cap = stageCap(answers);
  const stageIndex = Math.min(raw, cap);
  const domains = domainResults(answers);
  const { primary, secondary } = bottlenecks(answers, domains);
  const primaryQuestion = QUESTIONS.find((question) => question.key === primary);
  const secondaryQuestion = QUESTIONS.find((question) => question.key === secondary);
  return {
    ok: true,
    version: READINESS_VERSION,
    score,
    rawStage: STAGES[raw],
    stage: STAGES[stageIndex],
    gateApplied: stageIndex < raw,
    gateExplanation: stageIndex < raw ? `The raw score maps to ${STAGES[raw]}, but required control gates cap the result at ${STAGES[stageIndex]}.` : "No stage gate reduced the raw stage.",
    domains,
    primaryBottleneck: primaryQuestion.label,
    secondaryBottleneck: secondaryQuestion?.label ?? "None",
    recommendation: PLANS[primary][0],
    plan: { day30: PLANS[primary][0], day60: PLANS[primary][1], day90: PLANS[primary][2] },
    relevantChapters: {
      productTruth: [1, 2, 5], brandTruth: [2, 5], assetControl: [3, 5], workflow: [3, 4], ownership: [2, 3, 6], exceptions: [6, 9], approvedAIInputs: [5, 6], humanApproval: [2, 6], measurement: [8, 10], learning: [8, 9],
    }[primary],
    qualification: "This is an original sequencing and decision aid. It is not an industry benchmark, certification, percentile, or independently validated maturity model.",
  };
}
