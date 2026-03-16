import { Link } from 'react-router-dom'
import '../styles/public-landing.css'

export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', color: '#e8e4dc', fontFamily: 'inherit' }}>
      <Link to="/" style={{ color: '#a8b880', textDecoration: 'none', fontSize: 14, marginBottom: 24, display: 'inline-block' }}>&larr; Back to Kaizen OS</Link>

      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#999', marginBottom: 32 }}>Effective Date: March 16, 2026 &middot; Last Updated: March 16, 2026</p>

      <p>Gehirn, Inc. ("Gehirn," "we," "us," or "our") operates KaizenOS (the "Service"). This Privacy Policy describes how we collect, use, and protect your information when you use the Service. By using KaizenOS, you consent to the practices described below.</p>

      <p><strong>This Service is intended for users located in the United States who are at least 18 years of age.</strong> We do not knowingly collect information from anyone under 18 or from users outside the United States.</p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Account Information</h3>
      <p>When you create an account, we collect your email address, name (optional), and timezone preference.</p>

      <h3>1.2 User-Generated Content</h3>
      <p>You may create cards, daily notes, gratitude entries, season plans, theme allocations, work items, and other productivity content within the Service. This content is stored on your behalf and associated with your account.</p>

      <h3>1.3 AI Assistant Data</h3>
      <p>If you use the AI assistant feature, we store your chat sessions (messages you send and responses you receive). This data is used solely to provide the AI assistant functionality to you. Gehirn may access this data for troubleshooting and support purposes. We do not use your AI chat data to train models or for any purpose other than providing and supporting the Service.</p>

      <h3>1.4 Calendar and Productivity Integrations</h3>
      <p>If you connect third-party services (Google Calendar, Google Tasks, Google Sheets, or Notion), we store encrypted OAuth tokens and sync data from those services to provide calendar integration, task management, and related features. We access only the scopes you authorize.</p>

      <h3>1.5 Payment Information</h3>
      <p>Payments are processed by Stripe, Inc. We do not store, process, or have access to your credit card numbers or payment card details. We receive and store your Stripe customer ID, subscription tier, and subscription status from Stripe.</p>

      <h3>1.6 Usage and Analytics Data</h3>
      <p>We use PostHog to collect usage analytics tied to your user ID, including feature usage events, page views, and error reports. This data helps us understand how the Service is used and identify issues.</p>

      <h3>1.7 AI Usage Metrics</h3>
      <p>We track token counts, model usage, and associated costs for the AI assistant feature to manage credit allocation and billing.</p>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve the Service</li>
        <li>Process your subscription and manage billing</li>
        <li>Sync your calendar and task data across connected integrations</li>
        <li>Provide AI assistant functionality</li>
        <li>Manage your credit balance and usage limits</li>
        <li>Respond to support requests</li>
        <li>Analyze usage patterns to improve the Service</li>
        <li>Detect and prevent fraud or abuse</li>
      </ul>

      <h2>3. Information Sharing</h2>
      <p>We do not sell, rent, or trade your personal information. We share information only in the following circumstances:</p>
      <ul>
        <li><strong>Service Providers:</strong> We use third-party services (Supabase, Stripe, PostHog, Anthropic) to operate the Service. These providers receive only the data necessary to perform their functions and are bound by their own privacy policies.</li>
        <li><strong>Legal Requirements:</strong> We may disclose information if required by law, regulation, legal process, or governmental request.</li>
        <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
        <li><strong>With Your Consent:</strong> We may share information with your explicit consent.</li>
      </ul>

      <h2>4. Third-Party Services</h2>
      <p>The Service integrates with the following third-party services. Each has its own privacy policy governing its use of your data:</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #444' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Service</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #333' }}><td style={{ padding: 8 }}>Supabase</td><td style={{ padding: 8 }}>Database hosting and authentication</td></tr>
          <tr style={{ borderBottom: '1px solid #333' }}><td style={{ padding: 8 }}>Stripe</td><td style={{ padding: 8 }}>Payment processing</td></tr>
          <tr style={{ borderBottom: '1px solid #333' }}><td style={{ padding: 8 }}>Google APIs</td><td style={{ padding: 8 }}>Calendar, Tasks, and Sheets integration</td></tr>
          <tr style={{ borderBottom: '1px solid #333' }}><td style={{ padding: 8 }}>Notion</td><td style={{ padding: 8 }}>Workspace integration</td></tr>
          <tr style={{ borderBottom: '1px solid #333' }}><td style={{ padding: 8 }}>PostHog</td><td style={{ padding: 8 }}>Product analytics</td></tr>
          <tr style={{ borderBottom: '1px solid #333' }}><td style={{ padding: 8 }}>Anthropic (Claude)</td><td style={{ padding: 8 }}>AI assistant</td></tr>
        </tbody>
      </table>

      <h2>5. Data Storage and Security</h2>
      <p>Your data is stored on servers located in the United States (AWS us-east-1 region). We use industry-standard security measures including encrypted OAuth token storage, secure session cookies (httpOnly, sameSite, secure), and encrypted connections (HTTPS). However, no method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.</p>

      <h2>6. Data Retention</h2>
      <p>We retain your data for as long as your account is active. If you request account deletion, we will delete your account and all associated data. Some data may persist in backups for a limited period consistent with our backup retention schedule.</p>

      <h2>7. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
        <li><strong>Correction:</strong> Request correction of inaccurate information.</li>
        <li><strong>Deletion:</strong> Request deletion of your account and associated data by emailing us.</li>
        <li><strong>Opt-Out of Analytics:</strong> You may opt out of PostHog analytics tracking through your account settings.</li>
        <li><strong>Disconnect Integrations:</strong> You may disconnect third-party integrations (Google, Notion) at any time through your account settings, which revokes our access to those services.</li>
      </ul>

      <h3>California Residents (CCPA)</h3>
      <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act, including the right to know what personal information we collect, the right to request deletion, and the right to opt out of the sale of personal information. We do not sell personal information.</p>

      <h2>8. Cookies and Session Data</h2>
      <p>We use session cookies (<code>kaizen_session</code> and <code>kaizen_refresh</code>) to maintain your authenticated session. These cookies are httpOnly, use sameSite=lax, and are marked secure in production. Session cookies expire after 7 days; refresh tokens expire after 30 days.</p>

      <h2>9. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page with a revised "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>

      <h2>10. Contact Us</h2>
      <p>For questions about this Privacy Policy or to exercise your rights, contact us at:</p>
      <p>
        Gehirn, Inc.<br />
        10 Provost Street, Unit 1708<br />
        Jersey City, NJ 07302<br />
        Email: info@gehirn.ai
      </p>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #333', fontSize: 14, color: '#777' }}>
        <Link to="/terms" style={{ color: '#a8b880', marginRight: 24 }}>Terms of Service</Link>
        <Link to="/" style={{ color: '#a8b880' }}>Home</Link>
      </div>
    </main>
  )
}
