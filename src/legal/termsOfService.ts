// termsOfService.ts — chartreview-pro-live-frontend
// Updated: 2026-09-24 (v5) — Merged Roman's Grok-drafted rewrite (attached docx,
// ChartReviewPro_Terms_of_Service_20260924_v5.docx) into the live ToS, per Roman's
// explicit answers to 3 flagged questions:
//   1. KEEP the new Section 5 "Redaction Assistance — Not a Guarantee" and all other
//      redaction-assistance references (service description, Acceptable Use,
//      Indemnification), even though the Redaction page is currently hidden from the
//      live app (App.tsx, since 2026-08-22) — Roman confirmed he wants it covered anyway.
//   2. ADD the new de-identified/aggregated-data carve-out in Section 9: ChartReview Pro
//      may use de-identified or aggregated data (not just "identifiable" content) for
//      quality assurance, security, capacity planning, and product improvement. This is
//      a genuine expansion beyond the prior flat "we never use your data" promise —
//      Roman explicitly approved it.
//   3. DROPPED the physical mailing address Grok added to Section 26 Contact and Notices
//      (Roman couldn't confirm "9500 S Eastern Ave, Suite 160, Las Vegas, NV 89123" is
//      current/correct) — kept only support@chartreviewpro.com and legal@chartreviewpro.com.
//
// Net result vs v4: went from 25 to 26 sections. New: Section 5 Redaction Assistance.
// Section numbering/headings otherwise reflect Grok's cleanup: Section 2 gained a
// definitions paragraph + "no SLA/uptime/turnaround" disclaimer; Section 3 gained a
// per-organization account-sharing clause; Section 9 gained the de-identified-data
// carve-out described above; Section 10 (HIPAA) gained a non-Covered-Entity warranty
// clause and a cross-customer-isolation statement; Section 11 (Security) got more
// specific (encryption in transit/at rest where feasible); Section 12 (Data Retention)
// gained export-on-request language; Section 14 (Fees) gained a turnaround-time
// disclaimer; Section 15 (Acceptable Use) gained PHI-before-BAA and re-identification
// prohibitions; Section 19 (Liability) and Section 23 (Arbitration) each gained an
// enterprise "signed order form / master agreement" carve-out; Section 21 (Termination)
// got a precise survival list instead of "e.g."; Section 25 (Misc) now references order
// forms too. Section 20 (Indemnification) gained a "disclosure of a file after using
// redaction-assistance features" trigger, consistent with keeping redaction in-scope.
//
// Company: ChartReview Pro LLC; governing law: Nevada / venue Clark County, Nevada;
// support: support@chartreviewpro.com; legal notices: legal@chartreviewpro.com.
// Rendered by Login.tsx's "terms" view (shown from a link on the Create Account form) and
// gates signup: TOS_VERSION is sent to POST /users/accept-terms right after a new user
// verifies their email, so every acceptance record stays tied to the exact text version the
// user actually saw. Bump TOS_VERSION any time TOS_SECTIONS changes so historical acceptance
// records remain meaningful.
//
// NOTE: this text has NOT been reviewed by an attorney (Grok's draft was run through by
// Roman as an editing pass, not counsel). Roman made the explicit call to publish it live
// ahead of formal legal review — see chat for context. Replace this content (and bump
// TOS_VERSION) once counsel has reviewed it.

export const TOS_VERSION = '2026-09-24-v5';
export const TOS_LAST_UPDATED = 'September 24, 2026';

export interface TosSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  closing?: string[]; // rendered as paragraphs AFTER bullets (e.g. Section 20's defense/survival text)
}

export const TOS_SECTIONS: TosSection[] = [
  {
    heading: '1. Acceptance of Terms',
    paragraphs: [
      'These Terms of Service ("Terms") govern your access to and use of ChartReview Pro, including the website at chartreviewpro.com and all related upload, redaction-assistance, processing, summary-generation, indexing, and account features (collectively, the "Service"), operated by ChartReview Pro LLC ("ChartReview Pro," "we," "us," or "our"). By creating an account, uploading a document, clicking to accept these Terms, or otherwise using the Service, you agree to these Terms. If you are using the Service on behalf of an organization (for example, a medical practice, law firm, insurance company, or other entity), you represent that you have authority to bind that organization, and "you" refers to both you and the organization.',
      'If you do not agree to these Terms, do not use the Service. If your use involves Protected Health Information, Section 9 and any executed Business Associate Agreement also apply.',
    ],
  },
  {
    heading: '2. Description of the Service; Definitions',
    paragraphs: [
      'ChartReview Pro allows users to upload documents (including PDFs, images, and ZIP archives), which are processed using optical character recognition and artificial intelligence (including large language models operating on third-party infrastructure) to assist with redaction of identifiers, and to generate structured clinical or visit summaries, indexes, and related work product (collectively, "Outputs").',
      'The Service is intended to assist with reviewing and organizing lengthy records. It is a productivity, administrative, and organizational tool. It is not a substitute for professional medical, legal, or expert judgment.',
      '"User Content" means any document, file, data, or other material you upload or submit to the Service. "PHI" means protected health information as defined under HIPAA. "BAA" means a Business Associate Agreement executed between you and ChartReview Pro. Unless a separate written order form or master agreement states otherwise, the Service is provided without a service-level agreement, uptime commitment, or guaranteed turnaround time.',
    ],
  },
  {
    heading: '3. Eligibility and Accounts',
    paragraphs: [
      'You must be at least 18 years old and able to form a binding contract to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Notify us promptly of any unauthorized use.',
      "Accounts are issued per customer organization. You may not share a single account across unaffiliated practices, firms, or entities in a manner that would mix another organization's records or credentials with yours. You are responsible for designating authorized users and for promptly disabling access when a user leaves your organization.",
    ],
  },
  {
    heading: '4. AI-Generated Content — No Warranty; Human Review and Final Sign-Off Required',
    paragraphs: [
      'Outputs are generated using automated OCR and AI models and may contain errors, omissions, misclassifications, or inaccuracies, including incorrect dates, providers, diagnoses, or clinical details, and may fail to capture information present in the source documents.',
      'OUTPUTS ARE PROVIDED FOR REFERENCE AND WORKFLOW-ASSISTANCE PURPOSES ONLY.',
      "By using, relying on, submitting, or providing any Output to a third party, you represent that you (or your organization) have independently reviewed that Output against the original source documents and are the party signing off on its accuracy and completeness. ChartReview Pro's role is limited to providing a drafting and organizational aid. Final review, verification, and sign-off rest solely with you.",
      'You further acknowledge and agree that:',
    ],
    bullets: [
      'Outputs do not constitute medical advice, a medical record, a legal opinion, an expert opinion, or professional advice of any kind.',
      'You are solely responsible for independently reviewing and verifying any Output against the original source documents before relying on it, filing it, submitting it, or providing it to any third party (including a court, opposing counsel, client, employer, insurer, regulator, or any other person) for any clinical, legal, billing, litigation, or other decision or filing.',
      'ChartReview Pro is not a party to, and assumes no responsibility for, any medical, legal, or business decision made using an Output.',
      'You will not represent an Output as an official medical record or as having been reviewed or certified by a licensed clinician unless you have in fact performed that review yourself.',
      'ChartReview Pro does not provide medical expert opinions, causation opinions, disability assessments, impairment ratings, life-care planning, future treatment opinions, standard-of-care opinions, or any other expert conclusions. Outputs are organizational summaries only.',
      'ChartReview Pro does not guarantee that every page, provider, diagnosis, treatment event, imaging study, procedure, medication, billing entry, date, or record in uploaded materials will appear in the generated Output.',
      'OCR may incorrectly interpret handwritten, faded, redacted, poorly scanned, rotated, or partially obscured documents. ChartReview Pro is not responsible for errors resulting from source-document quality or OCR limitations.',
      'Users may not identify ChartReview Pro as the source of any expert opinion, causation opinion, impairment assessment, future treatment recommendation, disability determination, life-care plan, or standard-of-care opinion.',
    ],
  },
  {
    heading: '5. Redaction Assistance — Not a Guarantee',
    paragraphs: [
      'Any redaction, masking, or identifier-removal feature of the Service is an assistance tool only. ChartReview Pro does not warrant that every instance of PHI, personally identifiable information, a signature, or other sensitive content will be detected or removed.',
      'You are solely responsible for reviewing any redacted file before you download, transmit, file, or otherwise disclose it. If you send, file, or disclose a file after using the Service, you — not ChartReview Pro — are the disclosing party. Do not treat a "redacted" or "processed" download as certified de-identification under HIPAA or any other law unless you have independently confirmed that result.',
    ],
  },
  {
    heading: '6. No Legal, Medical, or Expert Advice; Not a Medical Device',
    paragraphs: [
      'The Service does not constitute medical advice, healthcare services, legal advice, clinical decision-making, diagnostic services, or treatment recommendations. You should seek independent professional judgment for all medical, legal, and clinical decisions rather than relying on the Service.',
      'ChartReview Pro is not a medical device, a diagnostic device, a clinical decision support system, a treatment recommendation system, a healthcare provider, or a provider of medical services. The Service is intended solely as an administrative, organizational, and productivity tool.',
    ],
  },
  {
    heading: '7. Source Material and Data Completeness Disclaimer',
    paragraphs: [
      'ChartReview Pro is not responsible for the completeness or accuracy of the documents you upload, including missing, incomplete, duplicate, misfiled, corrupted, password-protected, damaged, improperly scanned, or misidentified records. You are solely responsible for ensuring that the records you upload are complete and accurate.',
      'Consistent with Section 4, ChartReview Pro does not guarantee that every page or data element in your uploaded materials will appear in the generated Output. You must independently review the source records to confirm completeness.',
    ],
  },
  {
    heading: '8. Litigation and Evidentiary Disclaimer',
    paragraphs: [
      'ChartReview Pro does not certify, authenticate, validate, preserve, or establish chain of custody for any document, and makes no representation regarding the admissibility, discoverability, evidentiary sufficiency, or authenticity of any document or Output, or their compliance with court rules, evidence rules, or other litigation or regulatory requirements.',
      'If you use the Service in connection with litigation, an administrative proceeding, or any regulatory matter, you remain solely responsible for satisfying all applicable litigation, evidentiary, administrative, and regulatory obligations.',
    ],
  },
  {
    heading: '9. Your Content; License; No Training on Identifiable Data',
    paragraphs: [
      'As between you and us, you retain all ownership rights in your User Content. You grant us a limited, non-exclusive license to access, copy, process, store, and transmit your User Content and Outputs solely as necessary to provide, secure, maintain, and support the Service for you.',
      "We do not use your identifiable User Content or Outputs to train, fine-tune, or otherwise improve any artificial intelligence or machine-learning model (whether ours or a third party's). We do not sell your User Content or Outputs.",
      'We may use de-identified or aggregated information that cannot reasonably be used to identify an individual or your organization for quality assurance, security, capacity planning, and product improvement. We share User Content and Outputs with subprocessors only as needed to provide the Service (for example, hosting, OCR, AI inference, storage, email, or payment processing), or as required by law.',
      'You represent and warrant that you have all rights, consents, and authority necessary to upload each item of User Content, including any PHI or other confidential information it contains, and that your use of the Service complies with applicable law, including HIPAA where it applies, state privacy laws, and any professional or ethical obligations that apply to you.',
    ],
  },
  {
    heading: '10. Protected Health Information and HIPAA',
    paragraphs: [
      "If your use of the Service involves creating, receiving, maintaining, or transmitting PHI on behalf of a HIPAA Covered Entity or as a Business Associate, a separate BAA must be executed between you and ChartReview Pro before you upload any such PHI. The BAA, not this section, governs the parties' respective HIPAA obligations where it applies. Nothing in these Terms limits or expands either party's obligations under an executed BAA.",
      'If you are not a Covered Entity or Business Associate (for example, a law firm, consultant, or other organization that is not itself a HIPAA regulated entity), you still warrant that you have lawful authority to upload the materials, that your upload and use comply with applicable privacy, confidentiality, and ethical rules, and that you will execute a BAA if and when HIPAA requires one. ChartReview Pro may condition PHI upload features on acceptance of its BAA.',
      "ChartReview Pro designs the Service so that one customer's User Content is not made available to another customer through the Service. You remain responsible for how your authorized users handle downloads and outbound email.",
    ],
  },
  {
    heading: '11. Security',
    paragraphs: [
      'ChartReview Pro maintains administrative, technical, and physical safeguards designed to protect User Content, including encryption of electronic PHI in transit and at rest where feasible, access limited to personnel and subprocessors who need it to operate the Service, and logging appropriate to the Service. Details of HIPAA Security Rule safeguards, where applicable, are addressed in the BAA.',
      'No electronic transmission, storage system, or internet-based service can be guaranteed to be completely secure. ChartReview Pro does not warrant that unauthorized access, cyberattacks, security incidents, data loss, or system compromises will never occur.',
    ],
  },
  {
    heading: '12. Data Retention, Export, and Deletion',
    paragraphs: [
      'While your account is active, you may export available User Content and Outputs through the features we provide. After account termination, ChartReview Pro will delete or return PHI in accordance with the BAA (where a BAA applies) and its then-current retention practices.',
      'ChartReview Pro may retain User Content, account information, system logs, backups, and Outputs for operational, security, audit, legal, compliance, disaster-recovery, and business-continuity purposes, including for a reasonable period in backup systems after deletion from production systems. Retention of PHI is subject to the BAA. Legal holds, unresolved disputes, and backup media may make immediate destruction infeasible.',
    ],
  },
  {
    heading: '13. Third-Party Service Providers',
    paragraphs: [
      'The Service relies on third-party vendors, including cloud hosting providers, artificial intelligence providers, OCR providers, data storage providers, communications providers, analytics providers, and payment processors. ChartReview Pro selects vendors it believes are appropriate for the Service and, where those vendors handle PHI, requires appropriate written assurances (including a BAA where HIPAA requires one).',
      "ChartReview Pro is not responsible for independent interruptions, outages, or failures originating solely from a third-party provider and outside ChartReview Pro's reasonable control. That limitation does not eliminate ChartReview Pro's obligations under these Terms or an applicable BAA, which remain subject to Section 19.",
    ],
  },
  {
    heading: '14. Fees, Payment, and Credits',
    paragraphs: [
      'Certain features of the Service are billed on a per-page, credit, or subscription basis, processed through our third-party payment processor. By purchasing credits or a subscription, you authorize us to charge your chosen payment method for all applicable fees. Except as required by law or as expressly stated at the time of purchase, fees and consumed credits are non-refundable, including where an Output has already been generated for the pages in question.',
      'We may change our pricing prospectively at any time; changes will not retroactively affect credits already purchased. Unless a separate written order form says otherwise, advertised or typical turnaround times are estimates only and are not a service-level commitment.',
    ],
  },
  {
    heading: '15. Acceptable Use',
    paragraphs: ['You agree not to:'],
    bullets: [
      'Upload content you do not have the right to upload, or that infringes or violates the rights of any third party;',
      'Upload PHI before a required BAA is in place;',
      'Use the Service to violate any applicable law, including patient-privacy or data-protection law;',
      'Use, submit, or represent an Output as an expert report, IME opinion, court filing, or certified medical record without the independent licensed review required by Section 4;',
      'Attempt to re-identify de-identified information;',
      "Attempt to reverse-engineer, scrape, or gain unauthorized access to the Service or other users' data;",
      'Use the Service to build a competing product or to train a competing model;',
      'Interfere with or disrupt the integrity or performance of the Service.',
    ],
  },
  {
    heading: '16. Confidentiality',
    paragraphs: [
      "Each party will protect the other's confidential information (including User Content and Outputs) with at least the same degree of care it uses for its own confidential information of similar nature, and will not disclose it except as needed to provide or use the Service, as required by law, or as otherwise permitted under an applicable BAA.",
    ],
  },
  {
    heading: '17. Intellectual Property',
    paragraphs: [
      'The Service, including its software, design, and underlying technology, is owned by ChartReview Pro and its licensors and is protected by intellectual property laws. Except for the limited rights expressly granted in these Terms, no rights are granted to you in the Service. As between the parties, you own your User Content; you do not own the Service or any models, prompts, or software used to generate Outputs.',
    ],
  },
  {
    heading: '18. Disclaimer of Warranties',
    paragraphs: [
      'THE SERVICE AND ALL OUTPUTS ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY OUTPUT OR REDACTION WILL BE COMPLETE OR ACCURATE.',
    ],
  },
  {
    heading: '19. Limitation of Liability',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHARTREVIEW PRO WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE OR ANY OUTPUT, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS WILL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.',
      'Some customers may negotiate a different cap in a signed order form or master agreement. Unless that signed writing exists, this Section 19 applies. Nothing in this Section limits liability that cannot be limited under applicable law.',
    ],
  },
  {
    heading: '20. Indemnification',
    paragraphs: [
      'You agree to defend, indemnify, and hold harmless ChartReview Pro and its officers, directors, employees, contractors, affiliates, licensors, and agents from and against any and all claims, demands, suits, damages, liabilities, losses, judgments, settlements, costs, and expenses (including reasonable attorneys\' fees) arising out of or related to:',
    ],
    bullets: [
      'Your User Content, including any claim that it infringes third-party rights or that you lacked authority to upload it;',
      'Your access to or use of the Service, or any use of the Service by any person using your account;',
      'Your breach of these Terms;',
      "Your, or any third party's, use of, reliance on, submission, distribution, or provision of any Output — including providing it to any court, opposing counsel, client, employer, insurer, or regulator — without the independent review and professional sign-off required under Section 4;",
      'Any report, testimony, affidavit, expert opinion, medical opinion, legal filing, or other work product prepared, submitted, or relied upon using the Service or any Output;',
      'Your disclosure of a file after using redaction-assistance features;',
      'Your violation of any applicable law, regulation, professional or ethical obligation, or third-party right; and',
      'Your negligence, willful misconduct, or fraud.',
    ],
    closing: [
      'ChartReview Pro reserves the right, at your expense, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, in which event you will cooperate in asserting available defenses. This obligation survives termination of these Terms and your use of the Service.',
    ],
  },
  {
    heading: '21. Term, Suspension, and Termination',
    paragraphs: [
      'These Terms remain in effect while you use the Service. We may suspend or terminate your access if you breach these Terms, if required by law, or for non-payment. You may stop using the Service and request account deletion at any time. After termination, Sections 4 through 9, 11 through 13, and 16 through 24 survive, as do any other provisions that by their nature should survive.',
    ],
  },
  {
    heading: '22. Governing Law',
    paragraphs: [
      'These Terms, and any Dispute (as defined in Section 23) between you and ChartReview Pro, are governed by the laws of the State of Nevada, without regard to conflict-of-laws principles.',
    ],
  },
  {
    heading: '23. Arbitration and Class Action Waiver',
    paragraphs: [
      'PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT AND TO HAVE A JURY TRIAL.',
      'Except for disputes that qualify for small claims court, or claims for injunctive or equitable relief to protect intellectual property, confidential information, or to prevent unauthorized access to or misuse of the Service, you and ChartReview Pro agree that any dispute, claim, or controversy arising out of or relating to these Terms, the Service, or any Output (a "Dispute") will be resolved exclusively through final and binding arbitration rather than in court.',
      'The arbitration will be administered by the American Arbitration Association under its Commercial Arbitration Rules then in effect, conducted by a single arbitrator, and will take place in Clark County, Nevada, or remotely by videoconference at the arbitrator\'s discretion. This arbitration agreement is governed by the Federal Arbitration Act. The arbitrator\'s decision will be final and binding and may be entered as a judgment in any court of competent jurisdiction.',
      'YOU AND CHARTREVIEW PRO EACH WAIVE THE RIGHT TO A JURY TRIAL AND THE RIGHT TO PARTICIPATE IN A CLASS ACTION, CLASS ARBITRATION, PRIVATE ATTORNEY GENERAL ACTION, OR ANY OTHER REPRESENTATIVE OR CONSOLIDATED PROCEEDING. ALL DISPUTES MUST BE BROUGHT IN AN INDIVIDUAL CAPACITY ONLY.',
      'If any part of this arbitration agreement is found unenforceable, the remainder will remain in force, except that if the class-action and class-arbitration waiver is found unenforceable as to a particular Dispute, that Dispute (and only that Dispute) may proceed in court. A separately signed master agreement or order form may modify this Section 23 for that customer only.',
    ],
  },
  {
    heading: '24. Changes to These Terms',
    paragraphs: [
      'We may update these Terms from time to time. If we make material changes, we will notify you (for example, by email or in-app notice) before they take effect. Continued use of the Service after changes take effect constitutes acceptance.',
    ],
  },
  {
    heading: '25. Miscellaneous',
    paragraphs: [
      'If any provision of these Terms is found unenforceable, the remaining provisions remain in full effect. These Terms, together with any executed BAA and any signed order form, constitute the entire agreement between you and ChartReview Pro regarding the Service. You may not assign these Terms without our consent; we may assign these Terms in connection with a merger, acquisition, or sale of assets.',
    ],
  },
  {
    heading: '26. Contact and Notices',
    paragraphs: [
      'Questions about these Terms can be directed to support@chartreviewpro.com.',
      'Legal notices under these Terms or an applicable BAA should be sent to legal@chartreviewpro.com.',
    ],
  },
];
