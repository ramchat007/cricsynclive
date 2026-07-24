export default function PrivacyPolicy() {
  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 pt-24 min-h-screen text-[var(--text-muted)]">
      <h1 className="text-4xl font-black text-[var(--foreground)] mb-8">
        Privacy Policy
      </h1>
      <div className="space-y-6 leading-relaxed">
        <p>
          <strong>Last Updated:</strong> July 2026
        </p>
        <p>
          At <strong>CricSyncLive</strong>, your privacy is important to us.
        </p>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mt-8 mb-4">
          1. Data We Collect
        </h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Account Data:</strong> Name, Email, Phone, Organization Name
          </li>
          <li>
            <strong>Tournament Data:</strong> Team Names, Player Names, Scores,
            Photos uploaded by you
          </li>
          <li>
            <strong>Device Data:</strong> Mobile number may be collected for
            unique player ID creation
          </li>
          <li>
            <strong>Technical Data:</strong> IP Address, Device Info, Cookies
            for better experience
          </li>
        </ul>
        <p>
          <strong>Note:</strong> We do not collect video data currently.
        </p>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mt-8 mb-4">
          2. How We Use Data
        </h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            To provide and operate the tournament management and live scoring
            software
          </li>
          <li>
            To send account owner billing information and payment invoices only
          </li>
          <li>To improve our app and customer support</li>
        </ul>
        <p className="font-semibold mt-3">
          We do not monitor or verify the content uploaded by users. However, we
          reserve the right to remove content that violates our Terms.
        </p>
        <p className="mt-3">
          <strong>Important:</strong> We do NOT use team/player data to send
          marketing offers, newsletters, or tournament scores via email/SMS.
          Only account owner will receive billing emails.
        </p>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mt-8 mb-4">
          3. Data Sharing
        </h2>
        <p>We do NOT sell your data.</p>
        <p>We may share data only with:</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>As required by Law or government authorities</li>
          <li>Service providers for hosting and technical support</li>
        </ul>
        <p>Currently no 3rd party payment gateway is used.</p>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mt-8 mb-4">
          4. Data Security
        </h2>
        <p>
          We use SSL encryption and secure servers. However no internet
          transmission is 100% secure.
        </p>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mt-8 mb-4">
          5. Cookies
        </h2>
        <p>
          We use cookies to remember your login and preferences. You can disable
          cookies in browser settings.
        </p>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mt-8 mb-4">
          6. Data Deletion
        </h2>
        <p>
          You can request account and data deletion by emailing us at{" "}
          <a
            href="mailto:ramchat007@gmail.com"
            className="text-blue-500 hover:underline">
            ramchat007@gmail.com
          </a>
          . We will delete within 15 working days.
        </p>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mt-8 mb-4">
          7. Changes to Policy
        </h2>
        <p>Any changes will be posted on this page with updated date.</p>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mt-8 mb-4">
          8. Contact Us
        </h2>
        <div className="bg-[var(--background)] p-4 rounded-lg border-[var(--border)]">
          <p>
            <strong>Email:</strong>{" "}
            <a
              href="mailto:ramchat007@gmail.com"
              className="text-blue-500 hover:underline">
              ramchat007@gmail.com
            </a>
          </p>
          <p>
            <strong>WhatsApp:</strong>{" "}
            <a
              href="https://wa.me/9702485146"
              className="text-blue-500 hover:underline">
              9820160376
            </a>
            ,
            <a
              href="https://wa.me/9702485146"
              className="text-blue-500 hover:underline">
              9702485146
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
