export const quickScenarios = [
  {
    id: "Q01", name: "Monthly ecommerce PDP production", category: "ecommerce PDP content production",
    context: "An ecommerce content team compares its accepted product-detail pages with an AI-assisted authoring workflow.", period: "monthly", acceptanceMode: "direct",
    input: { currentOutcomes: 1800, currentCost: 126000, aiAttempts: 2500, successRate: 78, aiCost: 82000 },
    sources: { currentOutcomes: "PIM publication and approval records", currentCost: "loaded content-team labor, agency invoices, and QA expense", aiAttempts: "workflow forecast based on monthly SKU intake", successRate: "representative pilot acceptance log", aiCost: "model, workflow, review, and integration operating budget" },
    interpretation: "The modeled AI workflow produces enough accepted pages at a materially lower equivalent-output cost.", expectedDecision: "Modeled savings",
  },
  {
    id: "Q02", name: "Quarterly marketplace listing optimization", category: "marketplace listing optimization",
    context: "A marketplace operations group tests listing-title, bullet, and attribute optimization across a seasonal quarter.", period: "quarterly", acceptanceMode: "direct",
    input: { currentOutcomes: 8000, currentCost: 440000, aiAttempts: 10000, successRate: 72, aiCost: 390000 },
    sources: { currentOutcomes: "marketplace content approval queue", currentCost: "quarterly operating ledger and contractor invoices", aiAttempts: "planned listing backlog", successRate: "quality-review sample", aiCost: "quarterly platform and review forecast" },
    interpretation: "The case is slightly favorable, but the narrow margin warrants sensitivity testing before scaling.", expectedDecision: "Modeled savings",
  },
  {
    id: "Q03", name: "Monthly retail-media campaign analysis", category: "retail-media campaign analysis",
    context: "A retail-media analytics team compares completed campaign readouts with AI-assisted first-pass analyses.", period: "monthly", acceptanceMode: "direct",
    input: { currentOutcomes: 120, currentCost: 180000, aiAttempts: 150, successRate: 68, aiCost: 105000 },
    sources: { currentOutcomes: "campaign closeout tracker", currentCost: "analyst labor and measurement-tool allocation", aiAttempts: "monthly campaign calendar", successRate: "manager-reviewed pilot readouts", aiCost: "analysis tooling, review, and operations estimate" },
    interpretation: "Despite rejected drafts, the accepted AI-assisted analyses remain lower cost at equivalent output.", expectedDecision: "Modeled savings",
  },
  {
    id: "Q04", name: "Monthly customer-service response drafting", category: "customer-service response drafting",
    context: "A service operation uses a pilot helper to estimate acceptance of AI-drafted email and chat responses.", period: "monthly", acceptanceMode: "pilot",
    pilot: { attempts: 1000, accepted: 850 },
    input: { currentOutcomes: 45000, currentCost: 540000, aiAttempts: 60000, successRate: 85, aiCost: 420000 },
    sources: { currentOutcomes: "resolved-contact QA records", currentCost: "loaded agent labor and support-software allocation", aiAttempts: "contact forecast", successRate: "850 accepted responses from 1,000 pilot attempts", aiCost: "monthly AI, QA, escalation, and platform forecast" },
    interpretation: "The pilot-derived rate supports a favorable model, subject to continued quality and escalation monitoring.", expectedDecision: "Modeled savings",
  },
  {
    id: "Q05", name: "Quarterly creative-variant production", category: "product-image or creative-variant production",
    context: "A creative studio compares approved product-image variants with generated and human-corrected alternatives.", period: "quarterly", acceptanceMode: "direct",
    input: { currentOutcomes: 3600, currentCost: 720000, aiAttempts: 6500, successRate: 48, aiCost: 520000 },
    sources: { currentOutcomes: "digital-asset approval system", currentCost: "studio, retouching, and agency spend", aiAttempts: "generation plan", successRate: "brand and legal review sample", aiCost: "generation, retouching, review, and governance budget" },
    interpretation: "A low acceptance rate still clears break-even because the current accepted creative is expensive.", expectedDecision: "Modeled savings",
  },
  {
    id: "Q06", name: "Annual catalog enrichment", category: "catalog enrichment",
    context: "A large retailer models attribute, taxonomy, and description enrichment across its annual catalog refresh.", period: "annual", acceptanceMode: "direct",
    input: { currentOutcomes: 250000, currentCost: 3750000, aiAttempts: 320000, successRate: 82.5, aiCost: 2300000 },
    sources: { currentOutcomes: "PIM completion records", currentCost: "annual catalog operations budget", aiAttempts: "SKU and attribute work plan", successRate: "sample audit across priority categories", aiCost: "annual technology, review, and correction forecast" },
    interpretation: "The high-volume enrichment model shows meaningful cost headroom at the entered quality rate.", expectedDecision: "Modeled savings",
  },
  {
    id: "Q07", name: "Quarterly translation and localization", category: "translation/localization",
    context: "A regional commerce team compares approved localized assets with machine-assisted translation plus linguistic review.", period: "quarterly", acceptanceMode: "direct",
    input: { currentOutcomes: 12000, currentCost: 960000, aiAttempts: 15000, successRate: 70, aiCost: 700000 },
    sources: { currentOutcomes: "translation-management approval records", currentCost: "language-service invoices and internal review labor", aiAttempts: "quarterly localization demand plan", successRate: "linguistic QA pilot", aiCost: "translation technology and reviewer forecast" },
    interpretation: "The model is favorable but depends on maintaining the same linguistic acceptance standard.", expectedDecision: "Modeled savings",
  },
  {
    id: "Q08", name: "Annual SEO content refresh", category: "SEO content refreshes",
    context: "A content organization compares accepted annual refreshes with AI-assisted briefs, drafts, and editorial review.", period: "annual", acceptanceMode: "direct",
    input: { currentOutcomes: 1800, currentCost: 450000, aiAttempts: 2400, successRate: 60, aiCost: 410000 },
    sources: { currentOutcomes: "CMS publication and editorial acceptance records", currentCost: "editorial labor and agency spend", aiAttempts: "annual refresh inventory", successRate: "editorial pilot", aiCost: "AI, SEO tooling, editing, and governance estimate" },
    interpretation: "The AI-assisted unit cost is higher, so the team should improve acceptance or reduce all-in cost before expansion.", expectedDecision: "Modeled loss",
  },
  {
    id: "Q09", name: "Monthly executive reporting at parity", category: "executive reporting",
    context: "A strategy office compares board-ready reports with AI-assisted analysis and executive review.", period: "monthly", acceptanceMode: "direct",
    input: { currentOutcomes: 36, currentCost: 126000, aiAttempts: 48, successRate: 75, aiCost: 126000 },
    sources: { currentOutcomes: "monthly reporting calendar", currentCost: "loaded analyst and leadership review time", aiAttempts: "planned report and scenario runs", successRate: "quality review of draft packages", aiCost: "analysis tooling, verification, and review estimate" },
    interpretation: "The modeled costs are at parity; non-cost considerations and a tighter pilot should drive the decision.", expectedDecision: "Approximately break-even",
  },
  {
    id: "Q10", name: "Monthly invoice document processing", category: "invoice or document processing",
    context: "A shared-services team compares validated invoices with AI-assisted extraction and exception handling.", period: "monthly", acceptanceMode: "direct",
    input: { currentOutcomes: 350000, currentCost: 350000, aiAttempts: 400000, successRate: 92.5, aiCost: 340000 },
    sources: { currentOutcomes: "accounts-payable posting records", currentCost: "processing labor, OCR, and exception cost", aiAttempts: "monthly invoice volume forecast", successRate: "field-level and posting-level validation sample", aiCost: "automation, exception review, and operations budget" },
    interpretation: "Small per-document improvement becomes material at high monthly volume.", expectedDecision: "Modeled savings",
  },
  {
    id: "Q11", name: "Quarterly high-cost professional workflow", category: "low-volume high-cost professional workflow",
    context: "A specialist advisory team compares accepted research packages with AI-assisted work requiring senior review.", period: "quarterly", acceptanceMode: "direct",
    input: { currentOutcomes: 24, currentCost: 720000, aiAttempts: 36, successRate: 55, aiCost: 630000 },
    sources: { currentOutcomes: "engagement delivery records", currentCost: "loaded specialist time and external research", aiAttempts: "quarterly engagement pipeline", successRate: "partner-reviewed pilot", aiCost: "research platforms, senior review, and governance estimate" },
    interpretation: "The all-in AI cost per accepted package exceeds the current process despite the small workflow volume.", expectedDecision: "Modeled loss",
  },
  {
    id: "Q12", name: "Annual high-volume low-cost moderation", category: "high-volume low-cost workflow",
    context: "A marketplace operations team compares accepted moderation decisions across millions of low-cost items.", period: "annual", acceptanceMode: "direct",
    input: { currentOutcomes: 12000000, currentCost: 6000000, aiAttempts: 15000000, successRate: 88, aiCost: 5500000 },
    sources: { currentOutcomes: "annual moderation decision ledger", currentCost: "operations and quality-control budget", aiAttempts: "annual item forecast", successRate: "stratified QA sample", aiCost: "automation, reviewer, appeals, and platform forecast" },
    interpretation: "A small unit-cost advantage produces substantial annual savings at plausible marketplace scale.", expectedDecision: "Modeled savings",
  },
];

const blankCurrentBuilder = { laborHours: 0, loadedHourlyCost: 0, agencyCost: 0, softwareCost: 0, reworkCost: 0, otherCost: 0 };
const blankAiBuilder = { technologyCost: 0, implementationCost: 0, amortizationYears: 3, reviewMethod: "known", knownReviewCost: 0, reviewRate: 0, reviewMinutes: 0, reviewHourlyCost: 0, otherOperatingCost: 0 };
const advanced = (scenario) => ({
  ...scenario,
  input: { successMethod: "direct", successRate: 80, pilotAttempts: 0, pilotAccepted: 0, currentCostBuilder: { ...blankCurrentBuilder }, aiCostBuilder: { ...blankAiBuilder }, ...scenario.input },
});

export const advancedScenarios = [
  advanced({
    id: "A01", name: "Monthly pilot-derived service response model", category: "pilot-derived acceptance plus multiple optional builders",
    context: "A customer-service group builds monthly AI cost from technology, amortized implementation, time-derived review, and other operations.", period: "monthly",
    input: { currentOutcomes: 50000, currentCostMethod: "known", knownCurrentCost: 650000, aiAttempts: 65000, successMethod: "pilot", pilotAttempts: 500, pilotAccepted: 430, successRate: 0, aiCostMethod: "builder", knownAiCost: 0, aiCostBuilder: { technologyCost: 250000, implementationCost: 600000, amortizationYears: 3, reviewMethod: "calculated", knownReviewCost: 0, reviewRate: 70, reviewMinutes: 2, reviewHourlyCost: 42, otherOperatingCost: 35000 } },
    sources: { currentOutcomes: "service QA completion records", knownCurrentCost: "monthly support cost ledger", aiAttempts: "contact forecast", pilotAttempts: "pilot generation log", pilotAccepted: "accepted pilot responses", technologyCost: "vendor and infrastructure forecast", implementationCost: "integration statement of work", amortizationYears: "finance policy", reviewRate: "pilot review routing", reviewMinutes: "time study", reviewHourlyCost: "loaded reviewer cost", otherOperatingCost: "governance and escalation budget" },
    interpretation: "The pilot-derived quality rate and detailed cost build show strong modeled savings.", expectedDecision: "Modeled savings",
  }),
  advanced({
    id: "A02", name: "Quarterly marketplace optimization at break-even", category: "known-total current and AI costs",
    context: "A marketplace team compares known quarterly totals at an accepted-output rate that exactly reconciles to parity.", period: "quarterly",
    input: { currentOutcomes: 9000, currentCostMethod: "known", knownCurrentCost: 540000, aiAttempts: 12000, successRate: 75, aiCostMethod: "known", knownAiCost: 540000, aiCostBuilder: { ...blankAiBuilder, technologyCost: 999999, reviewRate: 150 } },
    sources: { currentOutcomes: "quarterly listing approval records", knownCurrentCost: "finance close", aiAttempts: "optimization plan", successRate: "reviewed pilot", knownAiCost: "all-in vendor and operating proposal" },
    interpretation: "The entered assumptions land at cost parity, so quality, speed, and risk—not modeled savings—should decide next steps.", expectedDecision: "Approximately break-even",
  }),
  advanced({
    id: "A03", name: "Annual content operation with both cost builders", category: "component-built current cost plus direct human-review cost",
    context: "A content organization derives current cost from labor and direct components, then builds AI cost with known review expense.", period: "annual",
    input: { currentOutcomes: 8000, currentCostMethod: "builder", knownCurrentCost: 9999999, currentCostBuilder: { laborHours: 12000, loadedHourlyCost: 65, agencyCost: 220000, softwareCost: 90000, reworkCost: 160000, otherCost: 50000 }, aiAttempts: 11000, successRate: 72, aiCostMethod: "builder", knownAiCost: 8888888, aiCostBuilder: { technologyCost: 420000, implementationCost: 360000, amortizationYears: 3, reviewMethod: "known", knownReviewCost: 210000, reviewRate: 99, reviewMinutes: 99, reviewHourlyCost: 99, otherOperatingCost: 80000 } },
    sources: { currentOutcomes: "CMS acceptance records", laborHours: "timekeeping", loadedHourlyCost: "finance labor rate", agencyCost: "agency invoices", softwareCost: "contract allocation", reworkCost: "quality-cost ledger", otherCost: "direct operating ledger", aiAttempts: "annual content plan", successRate: "editorial pilot", technologyCost: "platform budget", implementationCost: "launch program budget", amortizationYears: "finance policy", knownReviewCost: "editorial staffing plan", otherOperatingCost: "governance and support plan" },
    interpretation: "Both component builds reconcile once, with modeled savings and no double counting of inactive totals.", expectedDecision: "Modeled savings",
  }),
  advanced({
    id: "A04", name: "Monthly service automation with time-derived review", category: "technology cost plus implementation amortization and time-derived review",
    context: "A service center estimates review cost from every attempt, average review time, and loaded reviewer cost.", period: "monthly",
    input: { currentOutcomes: 60000, currentCostMethod: "known", knownCurrentCost: 720000, aiAttempts: 75000, successRate: 88, aiCostMethod: "builder", knownAiCost: 0, aiCostBuilder: { technologyCost: 320000, implementationCost: 900000, amortizationYears: 5, reviewMethod: "calculated", knownReviewCost: 999999, reviewRate: 100, reviewMinutes: 1.5, reviewHourlyCost: 38, otherOperatingCost: 40000 } },
    sources: { currentOutcomes: "resolved-contact QA ledger", knownCurrentCost: "monthly service P&L", aiAttempts: "contact forecast", successRate: "QA pilot", technologyCost: "monthly platform plan", implementationCost: "integration program estimate", amortizationYears: "approved useful life", reviewRate: "routing design", reviewMinutes: "time study", reviewHourlyCost: "loaded reviewer rate", otherOperatingCost: "monitoring and escalation plan" },
    interpretation: "Even full review remains favorable because review time per attempt is short and current unit cost is higher.", expectedDecision: "Modeled savings",
  }),
  advanced({
    id: "A05", name: "Annual specialist workflow with an unprofitable AI total", category: "unprofitable known-total scenario",
    context: "A low-volume specialist team compares known annual totals where senior review makes the AI-assisted workflow more expensive.", period: "annual",
    input: { currentOutcomes: 40, currentCostMethod: "known", knownCurrentCost: 1800000, currentCostBuilder: { ...blankCurrentBuilder, laborHours: -500 }, aiAttempts: 65, successRate: 60, aiCostMethod: "known", knownAiCost: 2000000, aiCostBuilder: { ...blankAiBuilder, technologyCost: -1 } },
    sources: { currentOutcomes: "accepted engagement records", knownCurrentCost: "annual specialist cost ledger", aiAttempts: "pipeline forecast", successRate: "partner-reviewed pilot", knownAiCost: "all-in technology and senior-review budget" },
    interpretation: "The modeled AI cost is higher at equivalent accepted output; the organization needs cost reduction or better acceptance.", expectedDecision: "Modeled loss",
  }),
  advanced({
    id: "A06", name: "Quarterly creative workflow with low acceptance", category: "low acceptance despite low technology cost",
    context: "A product-creative team models low brand acceptance, modest generation cost, and substantial correction and operating expense.", period: "quarterly",
    input: { currentOutcomes: 2400, currentCostMethod: "known", knownCurrentCost: 600000, aiAttempts: 6000, successRate: 25, aiCostMethod: "builder", knownAiCost: 0, aiCostBuilder: { technologyCost: 180000, implementationCost: 0, amortizationYears: 3, reviewMethod: "known", knownReviewCost: 150000, reviewRate: 0, reviewMinutes: 0, reviewHourlyCost: 0, otherOperatingCost: 70000 } },
    sources: { currentOutcomes: "approved asset ledger", knownCurrentCost: "quarterly studio spend", aiAttempts: "generation plan", successRate: "brand-review pilot", technologyCost: "generation budget", implementationCost: "no new implementation in this period", amortizationYears: "default policy retained", knownReviewCost: "retouching and review staffing", otherOperatingCost: "asset handling and governance budget" },
    interpretation: "Low technology cost does not overcome the low acceptance rate and correction burden.", expectedDecision: "Modeled loss",
  }),
  advanced({
    id: "A07", name: "Annual catalog program with ten-year implementation spread", category: "high implementation cost spread across periods",
    context: "A large catalog program allocates a major integration investment over ten years and combines review and operating cost.", period: "annual",
    input: { currentOutcomes: 350000, currentCostMethod: "known", knownCurrentCost: 5250000, aiAttempts: 500000, successRate: 80, aiCostMethod: "builder", knownAiCost: 0, aiCostBuilder: { technologyCost: 2100000, implementationCost: 12000000, amortizationYears: 10, reviewMethod: "known", knownReviewCost: 600000, reviewRate: 0, reviewMinutes: 0, reviewHourlyCost: 0, otherOperatingCost: 250000 } },
    sources: { currentOutcomes: "annual PIM completion ledger", knownCurrentCost: "catalog operations budget", aiAttempts: "catalog work plan", successRate: "category-stratified audit", technologyCost: "annual platform budget", implementationCost: "approved integration business case", amortizationYears: "finance-approved useful life", knownReviewCost: "quality team plan", otherOperatingCost: "taxonomy and governance operations" },
    interpretation: "The large implementation program remains favorable only after transparent useful-life allocation.", expectedDecision: "Modeled savings",
  }),
  advanced({
    id: "A08", name: "Monthly invoice processing with zero optional costs", category: "zero optional costs",
    context: "A mature shared-services workflow already has integration and review covered elsewhere, so only direct technology cost is entered.", period: "monthly",
    input: { currentOutcomes: 400000, currentCostMethod: "known", knownCurrentCost: 480000, aiAttempts: 500000, successRate: 96, aiCostMethod: "builder", knownAiCost: 0, aiCostBuilder: { technologyCost: 300000, implementationCost: 0, amortizationYears: 3, reviewMethod: "known", knownReviewCost: 0, reviewRate: 0, reviewMinutes: 0, reviewHourlyCost: 0, otherOperatingCost: 0 } },
    sources: { currentOutcomes: "posted-invoice ledger", knownCurrentCost: "monthly AP cost", aiAttempts: "invoice forecast", successRate: "posting validation sample", technologyCost: "monthly automation invoice", implementationCost: "confirmed sunk or absent for this decision", amortizationYears: "default retained", knownReviewCost: "confirmed no incremental review", otherOperatingCost: "confirmed no other incremental cost" },
    interpretation: "The calculator should show savings while explicitly cautioning that three optional cost categories are zero.", expectedDecision: "Modeled savings",
  }),
  advanced({
    id: "A09", name: "Quarterly localization with direct review cost", category: "component-built current cost and direct human-review cost",
    context: "A localization group builds current cost from labor and vendors, then enters a known quarterly linguistic-review total.", period: "quarterly",
    input: { currentOutcomes: 11000, currentCostMethod: "builder", knownCurrentCost: 0, currentCostBuilder: { laborHours: 5000, loadedHourlyCost: 85, agencyCost: 300000, softwareCost: 40000, reworkCost: 90000, otherCost: 25000 }, aiAttempts: 14000, successRate: 76, aiCostMethod: "builder", knownAiCost: 0, aiCostBuilder: { technologyCost: 350000, implementationCost: 240000, amortizationYears: 4, reviewMethod: "known", knownReviewCost: 220000, reviewRate: 100, reviewMinutes: 10, reviewHourlyCost: 200, otherOperatingCost: 45000 } },
    sources: { currentOutcomes: "translation-management approvals", laborHours: "timekeeping", loadedHourlyCost: "finance labor rate", agencyCost: "language-service invoices", softwareCost: "TMS allocation", reworkCost: "linguistic QA ledger", otherCost: "direct program cost", aiAttempts: "quarterly asset plan", successRate: "linguistic pilot", technologyCost: "translation platform estimate", implementationCost: "connector project", amortizationYears: "finance policy", knownReviewCost: "review staffing plan", otherOperatingCost: "glossary and governance operations" },
    interpretation: "The active known-review total is counted once; inactive time-review values must be ignored.", expectedDecision: "Modeled savings",
  }),
  advanced({
    id: "A10", name: "Annual high-volume document extraction", category: "very large plausible values and time-derived review",
    context: "An enterprise document operation models millions of attempts, fractional review minutes, and a multi-year implementation.", period: "annual",
    input: { currentOutcomes: 5000000, currentCostMethod: "known", knownCurrentCost: 7500000, aiAttempts: 6500000, successRate: 91.5, aiCostMethod: "builder", knownAiCost: 0, aiCostBuilder: { technologyCost: 2000000, implementationCost: 1500000, amortizationYears: 5, reviewMethod: "calculated", knownReviewCost: 0, reviewRate: 35, reviewMinutes: 0.4, reviewHourlyCost: 32, otherOperatingCost: 250000 } },
    sources: { currentOutcomes: "annual straight-through-processing ledger", knownCurrentCost: "operations P&L", aiAttempts: "document forecast", successRate: "stratified validation sample", technologyCost: "annual cloud and platform forecast", implementationCost: "program budget", amortizationYears: "approved useful life", reviewRate: "exception-routing data", reviewMinutes: "work measurement", reviewHourlyCost: "loaded operations rate", otherOperatingCost: "monitoring and model-operations budget" },
    interpretation: "Full-precision arithmetic should retain the fractional review cost before display rounding.", expectedDecision: "Modeled savings",
  }),
  advanced({
    id: "A11", name: "Monthly retail-media analysis with other operating cost", category: "other operating costs",
    context: "A retail-media group builds both workflows and includes data licensing, governance, and monitoring as other AI operations.", period: "monthly",
    input: { currentOutcomes: 350, currentCostMethod: "builder", knownCurrentCost: 0, currentCostBuilder: { laborHours: 3000, loadedHourlyCost: 120, agencyCost: 140000, softwareCost: 80000, reworkCost: 60000, otherCost: 20000 }, aiAttempts: 500, successRate: 70, aiCostMethod: "builder", knownAiCost: 0, aiCostBuilder: { technologyCost: 350000, implementationCost: 300000, amortizationYears: 3, reviewMethod: "known", knownReviewCost: 75000, reviewRate: 0, reviewMinutes: 0, reviewHourlyCost: 0, otherOperatingCost: 185000 } },
    sources: { currentOutcomes: "campaign readout approvals", laborHours: "analytics timekeeping", loadedHourlyCost: "finance rate", agencyCost: "measurement partner invoices", softwareCost: "analytics allocation", reworkCost: "QA ledger", otherCost: "direct data preparation", aiAttempts: "monthly campaign plan", successRate: "leadership-reviewed pilot", technologyCost: "analysis platform plan", implementationCost: "data integration budget", amortizationYears: "finance policy", knownReviewCost: "analyst verification plan", otherOperatingCost: "data licensing, governance, and monitoring" },
    interpretation: "Other operating cost is material and must remain visible rather than being hidden inside technology.", expectedDecision: "Modeled savings",
  }),
  advanced({
    id: "A12", name: "Annual executive reporting at exact parity", category: "pilot-derived rate with both builders and decimal costs",
    context: "A strategy office builds current and AI costs and uses a pilot-derived acceptance rate for board-ready reporting packages.", period: "annual",
    input: { currentOutcomes: 120, currentCostMethod: "builder", knownCurrentCost: 9999999, currentCostBuilder: { laborHours: 8000, loadedHourlyCost: 125, agencyCost: 120000, softwareCost: 40000, reworkCost: 30000, otherCost: 10000 }, aiAttempts: 180, successMethod: "pilot", successRate: 0, pilotAttempts: 50, pilotAccepted: 40, aiCostMethod: "builder", knownAiCost: 7777777, aiCostBuilder: { technologyCost: 999999.99, implementationCost: 1200000, amortizationYears: 4, reviewMethod: "calculated", knownReviewCost: 888888, reviewRate: 100, reviewMinutes: 90, reviewHourlyCost: 150, otherOperatingCost: 99500.01 } },
    sources: { currentOutcomes: "board and operating-review calendar", laborHours: "strategy-team timekeeping", loadedHourlyCost: "finance rate", agencyCost: "research partner invoices", softwareCost: "data-tool allocation", reworkCost: "verification time", otherCost: "direct reporting expense", aiAttempts: "annual analysis plan", pilotAttempts: "pilot log", pilotAccepted: "executive-approved pilot packages", technologyCost: "annual platform estimate", implementationCost: "data and workflow integration budget", amortizationYears: "finance policy", reviewRate: "all packages require review", reviewMinutes: "pilot time study", reviewHourlyCost: "loaded executive-review support rate", otherOperatingCost: "governance and data operations" },
    interpretation: "The independently built totals reconcile to exact parity; inactive known totals and known review cost are excluded.", expectedDecision: "Approximately break-even",
  }),
];

export const allScenarios = [...quickScenarios.map((scenario) => ({ ...scenario, mode: "Quick" })), ...advancedScenarios.map((scenario) => ({ ...scenario, mode: "Advanced" }))];
