/* ============================================================
   LicenseFlow OS — Learning Curriculum + Question Bank
   Educational content (concepts). Not state regulatory claims.
   Each module: LEARN → TRY → CHECK → PROVE micro-flow.
   ============================================================ */

export const MODULES = [
  {
    key: "m1", n: 1, title: "Insurance Basics", topic: "Foundations", minutes: 12,
    learn: [
      { h: "What insurance really is", p: "Insurance is a contract that transfers the financial risk of a loss from an individual to an insurer in exchange for a premium. The insurer pools premiums from many people to pay the claims of the few who experience a loss." },
      { h: "Core principles", p: "Four ideas underpin everything: insurable interest (you must stand to lose something), indemnity (restore, don't profit), utmost good faith (both sides deal honestly), and risk pooling (spreading loss across many)." },
      { h: "Why it matters for your exam", p: "Most exam questions build on these definitions. If risk, premium, indemnity, and insurable interest are second nature, the harder questions get much easier." },
    ],
    try: { q: "A policy that pays more than the actual loss would violate which principle?", options: ["Insurable interest", "Indemnity", "Utmost good faith", "Risk pooling"], answer: 1,
      explain: "Indemnity means restoring the insured to their pre-loss position — not letting them profit from a loss." },
    check: [
      { q: "Insurable interest must exist at the time of:", options: ["Only the claim", "Application (for life insurance)", "Renewal only", "Never"], answer: 1 },
      { q: "The payment made to keep a policy in force is the:", options: ["Claim", "Premium", "Dividend", "Reserve"], answer: 1 },
    ],
  },
  {
    key: "m2", n: 2, title: "Types of Life Insurance", topic: "Policy Types", minutes: 16,
    learn: [
      { h: "Term life", p: "Pure protection for a set period (e.g., 10/20/30 years). Low cost, no cash value. Pays only if death occurs during the term." },
      { h: "Whole life", p: "Permanent coverage with a fixed premium, a guaranteed death benefit, and cash value that grows on a guaranteed schedule." },
      { h: "Universal life", p: "Permanent and flexible — adjustable premiums and death benefit, with cash value tied to a credited interest rate." },
    ],
    try: { q: "Which policy provides protection for a set number of years with no cash value?", options: ["Whole life", "Universal life", "Term life", "Variable life"], answer: 2,
      explain: "Term life is pure, temporary protection with no cash-value component." },
    check: [
      { q: "Which policy has the most premium flexibility?", options: ["Term", "Whole life", "Universal life", "None"], answer: 2 },
      { q: "Guaranteed level premium and guaranteed cash value describe:", options: ["Term", "Whole life", "Variable", "Group"], answer: 1 },
    ],
  },
  {
    key: "m3", n: 3, title: "Policy Provisions & Riders", topic: "Policy Provisions", minutes: 15,
    learn: [
      { h: "Standard provisions", p: "Grace period (time to pay a late premium without lapse), incontestability (insurer can't contest after ~2 years), and reinstatement (restoring a lapsed policy under conditions)." },
      { h: "Common riders", p: "Riders customize a policy: waiver of premium, accidental death benefit, guaranteed insurability, and accelerated death benefit." },
    ],
    try: { q: "After the incontestability period, the insurer generally cannot:", options: ["Pay claims", "Contest the policy for misstatements", "Collect premiums", "Cancel for fraud in all cases"], answer: 1,
      explain: "Incontestability bars the insurer from contesting the policy (except typically for fraud) after the stated period." },
    check: [
      { q: "The grace period protects against:", options: ["Overpayment", "Policy lapse", "Rate increases", "Taxation"], answer: 1 },
      { q: "A rider that keeps a policy in force if the insured becomes disabled is:", options: ["ADB", "Waiver of premium", "GIO", "Term rider"], answer: 1 },
    ],
  },
  {
    key: "m4", n: 4, title: "Beneficiaries & Settlement", topic: "Beneficiaries", minutes: 14,
    learn: [
      { h: "Designations", p: "Primary beneficiaries are first in line; contingent beneficiaries receive proceeds only if all primaries have predeceased the insured. Designations can be revocable or irrevocable." },
      { h: "Settlement options", p: "Beneficiaries can take proceeds as a lump sum, interest only, fixed period, fixed amount, or life income." },
    ],
    try: { q: "A contingent beneficiary receives proceeds when:", options: ["Anytime they ask", "The primary beneficiary is alive", "All primary beneficiaries have died", "The policy lapses"], answer: 2,
      explain: "Contingent beneficiaries are next in line only after all primaries are deceased." },
    check: [
      { q: "An irrevocable beneficiary designation:", options: ["Can be changed freely", "Requires the beneficiary's consent to change", "Is illegal", "Expires yearly"], answer: 1 },
      { q: "Which pays the beneficiary income they cannot outlive?", options: ["Fixed period", "Life income", "Interest only", "Lump sum"], answer: 1 },
    ],
  },
  {
    key: "m5", n: 5, title: "Annuities", topic: "Annuities", minutes: 16,
    learn: [
      { h: "Purpose", p: "Annuities convert a sum of money into a stream of income — the mirror image of life insurance (they protect against outliving your money)." },
      { h: "Types", p: "Fixed (guaranteed rate), variable (subaccounts, market risk, requires securities registration), and indexed (returns linked to an index with floors/caps)." },
    ],
    try: { q: "Which annuity exposes the owner to market risk and requires securities registration to sell?", options: ["Fixed", "Immediate", "Variable", "Indexed"], answer: 2,
      explain: "Variable annuities invest in subaccounts and are securities, requiring proper registration to sell." },
    check: [
      { q: "The annuity phase where income is paid out is:", options: ["Accumulation", "Annuitization", "Surrender", "Free-look"], answer: 1 },
      { q: "An annuity primarily protects against:", options: ["Dying too soon", "Outliving your income", "Disability", "Property loss"], answer: 1 },
    ],
  },
  {
    key: "m6", n: 6, title: "Underwriting & Applications", topic: "Underwriting", minutes: 15,
    learn: [
      { h: "The application", p: "The application is the primary source of underwriting information. Accuracy matters — misstatements can affect claims. The producer is the 'field underwriter.'" },
      { h: "Risk classification", p: "Underwriters classify risk as preferred, standard, or substandard (rated), or may decline. Tools include the MIB, medical exams, and attending physician statements." },
    ],
    try: { q: "The producer's role in gathering accurate application information is called:", options: ["Claims adjusting", "Field underwriting", "Actuarial review", "Reinsurance"], answer: 1,
      explain: "Producers perform field underwriting by collecting and verifying application information." },
    check: [
      { q: "A 'rated' policy typically means:", options: ["Lower premium", "Higher premium for higher risk", "No premium", "Guaranteed issue"], answer: 1 },
      { q: "Which shares coded medical info among insurers?", options: ["MIB", "FINRA", "NAIC", "DOI"], answer: 0 },
    ],
  },
  {
    key: "m7", n: 7, title: "Taxation of Life Insurance", topic: "Taxation", minutes: 14,
    learn: [
      { h: "Death benefit", p: "Life insurance death benefits paid to a named beneficiary are generally received income-tax-free." },
      { h: "Cash value & MECs", p: "Cash value grows tax-deferred. A policy that fails the 7-pay test becomes a Modified Endowment Contract (MEC), changing the tax treatment of distributions." },
    ],
    try: { q: "A life insurance death benefit paid to a named beneficiary is generally:", options: ["Fully taxable", "Income-tax-free", "Taxed as capital gains", "Subject to FICA"], answer: 1,
      explain: "Death benefits paid to a named beneficiary are generally income-tax-free." },
    check: [
      { q: "A policy failing the 7-pay test becomes a:", options: ["Term policy", "MEC", "Group policy", "Annuity"], answer: 1 },
      { q: "Cash value growth is generally:", options: ["Taxed yearly", "Tax-deferred", "Never taxed under any circumstance", "Taxed as wages"], answer: 1 },
    ],
  },
  {
    key: "m8", n: 8, title: "Ethics, Suitability & State Law", topic: "Ethics & Compliance", minutes: 13,
    learn: [
      { h: "Suitability", p: "Recommendations must fit the client's needs and situation. Replacing existing coverage triggers specific disclosure rules to protect the consumer." },
      { h: "Producer duties", p: "Avoid misrepresentation, twisting, and rebating. Handle client funds with fiduciary care. Follow your state's marketing and licensing rules." },
    ],
    try: { q: "Convincing a client to replace a policy to their detriment using misleading comparisons is:", options: ["Twisting", "Underwriting", "Annuitization", "Indemnity"], answer: 0,
      explain: "Twisting is misrepresentation used to induce a replacement that may harm the client." },
    check: [
      { q: "Offering something of value not in the contract to induce a sale is:", options: ["Rebating", "Suitability", "Disclosure", "Reinsurance"], answer: 0 },
      { q: "Suitability primarily protects:", options: ["The insurer", "The producer", "The consumer", "The regulator"], answer: 2 },
    ],
  },
];

// Practice-exam question bank, tagged by topic for readiness analytics.
export const EXAM_BANK = [
  { topic: "Foundations", q: "Risk pooling works because:", options: ["Everyone files a claim", "Losses of the few are paid by premiums of the many", "Insurers avoid all risk", "Premiums are refunded"], answer: 1 },
  { topic: "Foundations", q: "Insurable interest for life insurance must exist at:", options: ["Time of claim", "Time of application", "Renewal", "Never"], answer: 1 },
  { topic: "Policy Types", q: "The cheapest coverage per dollar of death benefit for a young applicant is usually:", options: ["Whole life", "Term life", "Universal life", "Variable life"], answer: 1 },
  { topic: "Policy Types", q: "Adjustable premiums and death benefit describe:", options: ["Term", "Whole life", "Universal life", "Group term"], answer: 2 },
  { topic: "Policy Provisions", q: "The incontestability period is commonly:", options: ["6 months", "1 year", "2 years", "10 years"], answer: 2 },
  { topic: "Policy Provisions", q: "Reinstatement of a lapsed policy generally requires:", options: ["Nothing", "Evidence of insurability and back premiums", "A new medical only", "A higher face amount"], answer: 1 },
  { topic: "Beneficiaries", q: "Proceeds split equally among surviving children by branch describes:", options: ["Per capita", "Per stirpes", "Interest only", "Lump sum"], answer: 1 },
  { topic: "Beneficiaries", q: "A settlement option paying for a guaranteed number of years is:", options: ["Life income", "Fixed period", "Interest only", "Lump sum"], answer: 1 },
  { topic: "Annuities", q: "The accumulation phase of an annuity is when:", options: ["Income is paid out", "Money is paid in and grows", "The contract is surrendered", "The free-look applies"], answer: 1 },
  { topic: "Annuities", q: "Indexed annuities typically include a:", options: ["Guaranteed floor and a cap", "Market loss guarantee", "Securities license waiver", "Zero interest"], answer: 0 },
  { topic: "Underwriting", q: "The primary source of underwriting information is the:", options: ["MIB", "Application", "Credit report", "Social media"], answer: 1 },
  { topic: "Taxation", q: "Death benefits to a named beneficiary are generally:", options: ["Taxable income", "Income-tax-free", "Capital gains", "Estate-tax only always"], answer: 1 },
  { topic: "Ethics & Compliance", q: "Rebating is:", options: ["A legal discount", "Offering value outside the contract to induce a sale", "A claim payment", "A renewal notice"], answer: 1 },
  { topic: "Ethics & Compliance", q: "Replacing a policy requires:", options: ["No disclosure", "Specific replacement disclosures", "A federal license", "A tax filing"], answer: 1 },
];

export const TOTAL_MODULES = MODULES.length;
