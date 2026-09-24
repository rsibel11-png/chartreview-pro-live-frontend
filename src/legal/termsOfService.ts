// termsOfService.ts — chartreview-pro-live-frontend
// Updated: 2026-09-24 (v3) — Per Roman's request: (1) split the old "Governing Law and
// Dispute Resolution" section into a standalone Section 21 "Governing Law" plus a new
// Section 22 "Arbitration and Class Action Waiver" (binding individual arbitration under
// the FAA, administered by the AAA in Clark County, Nevada; jury-trial and class/
// representative-action waiver; small-claims and IP/confidentiality injunctive-relief
// carve-outs; severability specific to the class waiver). (2) Rewrote Section 19
// "Indemnification" to be maximally strong: broader indemnified-party list (officers,
// directors, employees, contractors, affiliates, licensors, agents), broader claim types,
// seven specific trigger categories (up from four), an assumption-of-defense/control
// clause, and an explicit survival clause. Sections 23-25 renumbered accordingly (25
// total). Section 20's post-termination survival list updated to include 21-22.
// Bumped TOS_VERSION to 2026-09-24-v3.
//
// NOTE re: arbitration administrator — AAA (American Arbitration Association) was chosen
// as a standard, common default since Roman did not specify one; swap to JAMS or another
// administrator if preferred.
//
// Company: ChartReview Pro LLC; governing law: Nevada / venue Clark County, Nevada;
// support: support@chartreviewpro.com.
// Rendered by Login.tsx's "terms" view (shown from a link on the Create Account form) and
// gates signup: TOS_VERSION is sent to POST /users/accept-terms right after a new user
// verifies their email, so every acceptance record stays tied to the exact text version the
// user actually saw. Bump TOS_VERSION any time TOS_SECTIONS changes so historical acceptance
// records remain meaningful.
//
// NOTE: this text has NOT been reviewed by an attorney. Roman made the explicit call to
// publish it live ahead of that review (2026-09-23) — see chat for context. Replace this
// content (and bump TOS_VERSION) once counsel has reviewed it.

export const TOS_VERSION = '2026-09-24-v3';
export const TOS_LAST_UPDATED = 'September 24, 2026';

export interface TosSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  closing?: string[]; // rendered as paragraphs AFTER bullets (e.g. Section 19's defense/survival text)
}

export const TOS_SECTIONS: TosSection[] = [
  {
    heading: '1. Acceptance of Terms',
    paragraphs: [
      'These Terms of Service ("Terms") govern your access to and use of ChartReview Pro, including the website at chartreviewpro.com and all related upload, processing, summary-generation, and account features (collectively, the "Service"), operated by ChartReview Pro LLC ("ChartReview Pro," "we," "us," or "our"). By creating an account, uploading a document, or otherwise using the Service, you agree to these Terms. If you are using the Service on behalf of an organization (e.g., a law firm, medical practice, or other entity), you represent that you have authority to bind that organization, and "you" refers to both you and the organization.',
    ],
  },
  {
    heading: '2. Description of the Service',
    paragraphs: [
      'ChartReview Pro allows users to upload documents (including PDFs, images, and ZIP archives), which are processed using optical character recognition and artificial intelligence (including large language models operating on third-party infrastructure) to generate structured clinical/visit summaries, indexes, and related outputs ("Outputs"). The Service is intended to assist with reviewing and organizing lengthy records — it is a productivity tool, not a substitute for professional medical or legal judgment.',
    ],
  },
  {
    heading: '3. Eligibility and Accounts',
    paragraphs: [
      'You must be at least 18 years old and able to form a binding contract to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Notify us promptly of any unauthorized use.',
    ],
  },
  {
    heading: '4. AI-Generated Content — No Warranty; Human Review and Final Sign-Off Required',
    paragraphs: [
      'Outputs are generated using automated OCR and AI models and may contain errors, omissions, misclassifications, or inaccuracies, including incorrect dates, providers, or clinical details, and may fail to capture information present in the source documents.',
      'OUTPUTS ARE PROVIDED FOR REFERENCE AND WORKFLOW-ASSISTANCE PURPOSES ONLY.',
      'You acknowledge and agree that:',
    ],
    bullets: [
      'Outputs do not constitute medical advice, a medical record, a legal opinion, or professional advice of any kind.',
      'You are solely responsible for independently reviewing and verifying any Output against the original source documents before relying on it, filing it, submitting it, or providing it to any third party (including a court, opposing counsel, client, employer, insurer, regulator, or any other person or entity) for any clinical, legal, billing, litigation, or other decision or filing.',
      "By using, relying on, submitting, or providing any Output to a third party, you affirmatively represent that you (or, if you are using the Service on behalf of an organization, that organization) have reviewed that Output and are the party ultimately responsible for, and are knowingly signing off on, its accuracy and completeness before it goes to that third party. ChartReview Pro's role is limited to providing a drafting and organizational aid; final review, verification, and sign-off responsibility for any Output rests solely with you, not with ChartReview Pro.",
      'ChartReview Pro is not a party to, and assumes no responsibility for, any medical, legal, or business decision made using an Output.',
      'You will not represent an Output as an official medical record or as having been reviewed or certified by a licensed clinician unless you have in fact performed that review yourself.',
      "ChartReview Pro does not provide medical expert opinions, causation opinions, disability assessments, impairment ratings, life-care planning, future treatment opinions, standard-of-care opinions, or any other expert conclusions. Outputs are organizational summaries only and must not be relied upon as a substitute for a qualified expert's independent review and professional judgment.",
      'ChartReview Pro does not guarantee that every page, provider, diagnosis, treatment event, imaging study, procedure, medication, billing entry, date, or record contained within uploaded materials will appear in the generated Output.',
      "Optical character recognition (\"OCR\") technology used by the Service may incorrectly interpret handwritten, faded, redacted, poorly scanned, rotated, or partially obscured documents. ChartReview Pro is not responsible for errors resulting from source-document quality or OCR limitations.",
      'You may not represent that any expert opinion, medical opinion, legal opinion, or other professional conclusion was generated, approved, endorsed, or verified by ChartReview Pro.',
    ],
  },
  {
    heading: '5. No Legal, Medical, or Expert Advice; Not a Medical Device',
    paragraphs: [
      'The Service does not constitute medical advice, healthcare services, legal advice, clinical decision-making, diagnostic services, or treatment recommendations. You should seek independent professional judgment for all medical, legal, and clinical decisions rather than relying on the Service.',
      'ChartReview Pro is not a medical device, a diagnostic device, a clinical decision support system, a treatment recommendation system, a healthcare provider, or a provider of medical services. The Service is intended solely as an administrative, organizational, and productivity tool.',
    ],
  },
  {
    heading: '6. Source Material and Data Completeness Disclaimer',
    paragraphs: [
      'ChartReview Pro is not responsible for the completeness or accuracy of the documents you upload, including missing, incomplete, duplicate, misfiled, corrupted, password-protected, damaged, improperly scanned, or misidentified records, or other inaccuracies in the materials you supply. You are solely responsible for ensuring that the records you upload are complete and accurate.',
      'Consistent with Section 4, ChartReview Pro does not guarantee that every page, provider, diagnosis, treatment event, imaging study, procedure, medication, billing entry, date, or record contained in your uploaded materials will appear in the generated Output; you must independently review the source records to confirm completeness.',
    ],
  },
  {
    heading: '7. Litigation and Evidentiary Disclaimer',
    paragraphs: [
      'ChartReview Pro does not certify, authenticate, validate, preserve, or establish chain of custody for any document, and makes no representation regarding the admissibility, discoverability, evidentiary sufficiency, or authenticity of any document or Output, or their compliance with court rules, evidence rules, or other litigation or regulatory requirements.',
      'If you use the Service in connection with litigation, an administrative proceeding, or any regulatory matter, you remain solely responsible for satisfying all applicable litigation, evidentiary, administrative, and regulatory obligations.',
    ],
  },
  {
    heading: '8. Your Content; No Training on Your Data',
    paragraphs: [
      '"User Content" means any document, file, or data you upload to the Service. As between you and us, you retain all ownership rights in your User Content. You grant us a limited, non-exclusive license to access, copy, process, and transmit your User Content solely as necessary to provide the Service to you (e.g., OCR, AI processing, storage, and display back to you).',
      "We do not use your User Content or Outputs to train, fine-tune, or otherwise improve any artificial intelligence or machine-learning model (whether ours or a third party's), and we do not sell your User Content or Outputs or share them with third parties, except (a) with subprocessors who perform OCR, AI processing, storage, or similar functions solely to provide the Service to you, or (b) as required by law.",
      'You represent and warrant that you have all rights, consents, and authority necessary to upload each item of User Content, including any protected health information ("PHI") or other personal or confidential information it contains, and that your use of the Service complies with applicable law, including HIPAA, state privacy laws, and any professional or ethical obligations that apply to you.',
    ],
  },
  {
    heading: '9. Protected Health Information and HIPAA',
    paragraphs: [
      'If your use of the Service involves uploading PHI on behalf of a HIPAA Covered Entity or as a Business Associate, a separate Business Associate Agreement ("BAA") must be executed between you and ChartReview Pro before you upload any such PHI. The BAA, not this section, governs the parties\' respective HIPAA obligations where it applies. Nothing in these Terms limits or expands either party\'s obligations under an executed BAA.',
    ],
  },
  {
    heading: '10. Security',
    paragraphs: [
      'ChartReview Pro maintains commercially reasonable administrative, technical, and physical safeguards designed to protect User Content. However, no electronic transmission, storage system, security measure, or internet-based service can be guaranteed to be completely secure, and ChartReview Pro does not warrant that unauthorized access, cyberattacks, security incidents, data loss, or system compromises will never occur.',
    ],
  },
  {
    heading: '11. Data Retention',
    paragraphs: [
      'ChartReview Pro may retain User Content, account information, system logs, backups, and Outputs for operational, security, audit, legal, compliance, disaster-recovery, and business-continuity purposes. ChartReview Pro may delete data following account termination in accordance with its data retention practices; deleted information may remain in backup systems for a reasonable period before it is fully purged.',
    ],
  },
  {
    heading: '12. Third-Party Service Providers',
    paragraphs: [
      'The Service relies on third-party vendors, including cloud hosting providers, artificial intelligence providers, OCR providers, data storage providers, analytics providers, and payment processors. ChartReview Pro is not responsible for interruptions, outages, delays, security incidents, or failures attributable to these third-party providers.',
    ],
  },
  {
    heading: '13. Fees, Payment, and Credits',
    paragraphs: [
      'Certain features of the Service are billed on a per-page or subscription basis, processed through our third-party payment processor (Stripe). By purchasing credits or a subscription, you authorize us to charge your chosen payment method for all applicable fees. Except as required by law or as expressly stated at the time of purchase, fees and consumed credits are non-refundable, including where an Output has already been generated for the pages in question.',
      'We may change our pricing prospectively at any time; changes will not retroactively affect credits already purchased.',
    ],
  },
  {
    heading: '14. Acceptable Use',
    paragraphs: ['You agree not to:'],
    bullets: [
      'Upload content you do not have the right to upload, or that infringes or violates the rights of any third party;',
      'Use the Service to violate any applicable law, including patient privacy or data protection law;',
      "Attempt to reverse-engineer, scrape, or gain unauthorized access to the Service or other users' data;",
      'Use the Service to build a competing product or to train a competing model;',
      'Interfere with or disrupt the integrity or performance of the Service.',
    ],
  },
  {
    heading: '15. Confidentiality',
    paragraphs: [
      "Each party will protect the other's confidential information (including User Content and Outputs) with at least the same degree of care it uses for its own confidential information of similar nature, and will not disclose it except as needed to provide or use the Service, as required by law, or as otherwise permitted under an applicable BAA.",
    ],
  },
  {
    heading: '16. Intellectual Property',
    paragraphs: [
      'The Service, including its software, design, and underlying technology, is owned by ChartReview Pro and its licensors and is protected by intellectual property laws. Except for the limited rights expressly granted in these Terms, no rights are granted to you in the Service.',
    ],
  },
  {
    heading: '17. Disclaimer of Warranties',
    paragraphs: [
      'THE SERVICE AND ALL OUTPUTS ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY OUTPUT WILL BE COMPLETE OR ACCURATE.',
    ],
  },
  {
    heading: '18. Limitation of Liability',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHARTREVIEW PRO WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE OR ANY OUTPUT, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS WILL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.',
    ],
  },
  {
    heading: '19. Indemnification',
    paragraphs: [
      'You agree to defend, indemnify, and hold harmless ChartReview Pro and its officers, directors, employees, contractors, affiliates, licensors, and agents (collectively, the "ChartReview Pro Parties") from and against any and all claims, demands, suits, actions, proceedings, damages, liabilities, losses, judgments, settlements, costs, and expenses (including reasonable attorneys\' fees and costs of investigation), whether known or unknown, foreseen or unforeseen, arising out of or in any way related to:',
    ],
    bullets: [
      'Your User Content, including any claim that it infringes, misappropriates, or violates the rights of any third party, or that you lacked the authority, consent, or legal right to upload or submit it;',
      "Your access to or use of the Service, or any use of the Service by any person using your account, whether or not authorized by you;",
      'Your breach or alleged breach of these Terms, including any representation or warranty made in them;',
      "Your, or any third party's, use of, reliance on, submission, distribution, or provision of any Output — including providing it to any court, opposing counsel, client, employer, insurer, regulator, or any other third party — without the independent review and professional sign-off required under Section 4;",
      'Any report, testimony, presentation, affidavit, declaration, expert opinion, medical opinion, legal filing, or other work product prepared, submitted, or relied upon using the Service or any Output, and any litigation, arbitration, administrative, or regulatory proceeding arising from or relating to any such Output or work product;',
      'Your violation of any applicable law, regulation, professional or ethical obligation, or third-party right; and',
      'Your negligence, willful misconduct, or fraud.',
    ],
    closing: [
      'ChartReview Pro reserves the right, at your expense, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, in which event you will cooperate with ChartReview Pro in asserting any available defenses. This indemnification obligation will survive termination of these Terms and your use of the Service.',
    ],
  },
  {
    heading: '20. Term, Suspension, and Termination',
    paragraphs: [
      'These Terms remain in effect while you use the Service. We may suspend or terminate your access if you breach these Terms, or for non-payment. You may stop using the Service, and delete your account, at any time. Sections that by their nature should survive termination (e.g., Sections 4-12, 15-19, 21-22) will survive.',
    ],
  },
  {
    heading: '21. Governing Law',
    paragraphs: [
      'These Terms, and any Dispute (as defined in Section 22) between you and ChartReview Pro, are governed by the laws of the State of Nevada, without regard to conflict-of-laws principles.',
    ],
  },
  {
    heading: '22. Arbitration and Class Action Waiver',
    paragraphs: [
      'PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT AND TO HAVE A JURY TRIAL.',
      'Except for disputes that qualify for small claims court, or claims for injunctive or equitable relief to protect intellectual property, confidential information, or to prevent unauthorized access to or misuse of the Service, you and ChartReview Pro agree that any dispute, claim, or controversy arising out of or relating to these Terms, the Service, or any Output (a "Dispute") will be resolved exclusively through final and binding arbitration rather than in court.',
      'The arbitration will be administered by the American Arbitration Association ("AAA") under its Commercial Arbitration Rules then in effect, conducted by a single arbitrator, and will take place in Clark County, Nevada, or remotely by videoconference at the arbitrator\'s discretion. This arbitration agreement is governed by the Federal Arbitration Act. The arbitrator\'s decision will be final and binding on the parties and may be entered as a judgment in any court of competent jurisdiction.',
      'YOU AND CHARTREVIEW PRO EACH WAIVE THE RIGHT TO A JURY TRIAL AND THE RIGHT TO PARTICIPATE IN A CLASS ACTION, CLASS ARBITRATION, PRIVATE ATTORNEY GENERAL ACTION, OR ANY OTHER REPRESENTATIVE OR CONSOLIDATED PROCEEDING, WHETHER AS A PLAINTIFF, CLASS MEMBER, OR OTHERWISE. ALL DISPUTES MUST BE BROUGHT IN AN INDIVIDUAL CAPACITY ONLY. THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON\'S CLAIMS AND MAY NOT OTHERWISE PRESIDE OVER ANY FORM OF A REPRESENTATIVE, CLASS, OR CONSOLIDATED PROCEEDING.',
      'If any part of this arbitration agreement is found unenforceable, the remainder will remain in full force, except that if the class-action and class-arbitration waiver above is found unenforceable as to a particular Dispute, that Dispute (and only that Dispute) may proceed in court, and all other Disputes remain subject to this arbitration agreement.',
    ],
  },
  {
    heading: '23. Changes to These Terms',
    paragraphs: [
      'We may update these Terms from time to time. If we make material changes, we will notify you (e.g., by email or in-app notice) before they take effect. Continued use of the Service after changes take effect constitutes acceptance.',
    ],
  },
  {
    heading: '24. Miscellaneous',
    paragraphs: [
      'If any provision of these Terms is found unenforceable, the remaining provisions remain in full effect. These Terms, together with any executed BAA, constitute the entire agreement between you and ChartReview Pro regarding the Service. You may not assign these Terms without our consent; we may assign these Terms in connection with a merger, acquisition, or sale of assets.',
    ],
  },
  {
    heading: '25. Contact',
    paragraphs: ['Questions about these Terms can be directed to support@chartreviewpro.com.'],
  },
];
