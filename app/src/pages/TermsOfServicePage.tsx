import { Link } from 'react-router-dom'
import '../styles/public-landing.css'

export default function TermsOfServicePage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', color: '#e8e4dc', fontFamily: 'inherit' }}>
      <Link to="/" style={{ color: '#a8b880', textDecoration: 'none', fontSize: 14, marginBottom: 24, display: 'inline-block' }}>&larr; Back to Kaizen OS</Link>

      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: '#999', marginBottom: 32 }}>Effective Date: March 16, 2026 &middot; Last Updated: March 16, 2026</p>

      <p>These Terms of Service ("Terms") govern your use of KaizenOS (the "Service"), operated by Gehirn, Inc., a Delaware corporation ("Gehirn," "we," "us," or "our"). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>

      <h2>1. Eligibility</h2>
      <p>You must be at least 18 years of age and located in the United States to use the Service. By using the Service, you represent and warrant that you meet these requirements.</p>

      <h2>2. Account Registration</h2>
      <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must notify us immediately at info@gehirn.ai if you suspect unauthorized access to your account.</p>

      <h2>3. Service Plans</h2>

      <h3>3.1 Free Plan</h3>
      <p>The Free plan includes limited access to KaizenOS features, including a single calendar connection, one active theme, and $5 USD/month in AI assistant credits.</p>

      <h3>3.2 Pro Plan ($10/month)</h3>
      <p>The Pro plan includes:</p>
      <ul>
        <li>Multiple calendar connections</li>
        <li>$15 USD/month in AI assistant credits</li>
        <li>Two or more active themes</li>
        <li>Coaching support</li>
      </ul>

      <h3>3.3 Enterprise Plan</h3>
      <p>The Enterprise plan includes all Pro features plus personal performance coaching add-on services. Enterprise pricing and terms are available upon request. Contact info@gehirn.ai for details.</p>

      <h3>3.4 Billing</h3>
      <p>Pro subscriptions are billed monthly through Stripe. You authorize us to charge the payment method on file. All fees are non-refundable except as required by law. We reserve the right to change pricing with 30 days' notice.</p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose</li>
        <li>Attempt to gain unauthorized access to the Service, other accounts, or related systems</li>
        <li>Interfere with or disrupt the Service or its infrastructure</li>
        <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
        <li>Use the AI assistant to generate content that violates applicable law or third-party rights</li>
        <li>Use automated scripts, bots, or scrapers to access the Service without our written permission</li>
        <li>Resell, sublicense, or commercially redistribute the Service or any output from it</li>
        <li>Circumvent usage limits, credit caps, or access controls</li>
      </ul>

      <h2>5. Your Content</h2>
      <p>You retain full ownership of all content you create within the Service, including cards, notes, plans, themes, and other user-generated material ("Your Content"). By using the Service, you grant Gehirn a limited, non-exclusive, non-transferable license to store, display, and process Your Content solely to provide the Service to you. This license terminates when you delete Your Content or your account.</p>
      <p>You are solely responsible for Your Content. Gehirn does not review, endorse, or assume liability for any user-generated content.</p>

      <h2>6. AI Assistant</h2>
      <p>The Service includes an AI assistant powered by third-party AI models. AI-generated responses are provided for informational and productivity purposes only. They do not constitute professional advice of any kind (financial, legal, medical, or otherwise). You are solely responsible for evaluating and acting on any AI-generated content.</p>
      <p>Gehirn does not guarantee the accuracy, completeness, or reliability of AI-generated responses. AI assistant availability and capabilities may change without notice.</p>

      <h2>7. Third-Party Integrations</h2>
      <p>The Service allows you to connect third-party services (Google Calendar, Google Tasks, Notion, etc.). Your use of those services is governed by their respective terms and privacy policies. Gehirn is not responsible for the availability, accuracy, or conduct of any third-party service. You may disconnect integrations at any time through your account settings.</p>

      <h2>8. Disclaimer of Warranties</h2>
      <p><strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.</strong></p>
      <p>Gehirn does not warrant that the Service will be uninterrupted, error-free, secure, or free of viruses or other harmful components. Gehirn does not warrant that any data will be preserved or that the Service will meet your requirements. Gehirn makes no commitment regarding uptime, availability, or service levels.</p>
      <p>The Service is in active development. Features may be added, modified, or removed at any time without notice.</p>

      <h2>9. Limitation of Liability</h2>
      <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL GEHIRN, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE.</strong></p>
      <p><strong>GEHIRN'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNTS YOU HAVE PAID TO GEHIRN IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM. IF YOU HAVE NOT PAID ANY FEES, GEHIRN'S TOTAL LIABILITY SHALL NOT EXCEED FIFTY DOLLARS ($50 USD).</strong></p>

      <h2>10. Indemnification</h2>
      <p>You agree to indemnify, defend, and hold harmless Gehirn and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of the Service; (b) Your Content; (c) your violation of these Terms; or (d) your violation of any rights of a third party.</p>

      <h2>11. Account Termination</h2>
      <p>We may suspend or terminate your account if you violate these Terms. We will make reasonable efforts to notify you before or at the time of termination, except where we believe immediate action is necessary to protect the Service or other users. Upon termination, your right to use the Service ceases immediately. You may request a copy of your data before termination takes effect by contacting info@gehirn.ai.</p>
      <p>You may cancel your account at any time by contacting info@gehirn.ai. Upon cancellation, we will delete your account and associated data in accordance with our Privacy Policy.</p>

      <h2>12. Modifications to the Service and Terms</h2>
      <p>We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at any time, with or without notice. We may update these Terms from time to time. Material changes will be communicated by posting the updated Terms on this page with a revised "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

      <h2>13. Governing Law and Disputes</h2>
      <p>These Terms are governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of laws provisions. Any dispute arising out of or relating to these Terms or the Service shall be resolved exclusively in the state or federal courts located in Delaware, and you consent to the personal jurisdiction of such courts.</p>

      <h2>14. General Provisions</h2>
      <ul>
        <li><strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy, constitute the entire agreement between you and Gehirn regarding the Service.</li>
        <li><strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</li>
        <li><strong>Waiver:</strong> Failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.</li>
        <li><strong>Assignment:</strong> You may not assign or transfer your rights under these Terms without our prior written consent. Gehirn may assign its rights and obligations without restriction.</li>
      </ul>

      <h2>15. Contact Us</h2>
      <p>For questions about these Terms, contact us at:</p>
      <p>
        Gehirn, Inc.<br />
        10 Provost Street, Unit 1708<br />
        Jersey City, NJ 07302<br />
        Email: info@gehirn.ai
      </p>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #333', fontSize: 14, color: '#777' }}>
        <Link to="/privacy" style={{ color: '#a8b880', marginRight: 24 }}>Privacy Policy</Link>
        <Link to="/" style={{ color: '#a8b880' }}>Home</Link>
      </div>
    </main>
  )
}
