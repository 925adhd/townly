import React from 'react';
import { Link } from 'react-router-dom';

const Privacy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors mb-6">
        <i className="fas fa-arrow-left text-xs"></i> Back to Home
      </Link>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Effective Date: March 18, 2026</p>

        <div className="space-y-8 text-slate-600 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Introduction</h2>
            <p>
              Townly ("we," "us," or "our") operates the website at{' '}
              <a href="https://townly.us" className="text-orange-600 hover:underline">townly.us</a>.
              This Privacy Policy explains what information we collect, how we use it, and your choices
              regarding your data. By using Townly, you agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account Information:</strong> When you create an account, we collect your name
                and email address. You may also sign in using Google OAuth, in which case Google shares
                your name and email with us.
              </li>
              <li>
                <strong>User-Generated Content:</strong> Any content you post on Townly, including
                business reviews, lost &amp; found posts, community questions, answers, and comments.
              </li>
              <li>
                <strong>Payment Information:</strong> When you book an event spotlight, payments are
                processed by Stripe. We do not store your credit card number or full payment details
                on our servers. Stripe handles payment data in accordance with their own privacy policy.
              </li>
              <li>
                <strong>Uploaded Images:</strong> Photos you upload for business listings, lost &amp;
                found posts, or event bookings are stored in our cloud storage.
              </li>
              <li>
                <strong>Usage Data:</strong> We may collect basic usage information such as pages
                visited and browser type to help improve the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and maintain the Townly platform and its features</li>
              <li>To authenticate your identity and manage your account</li>
              <li>To display your user-generated content to other users</li>
              <li>To process event spotlight bookings and payments</li>
              <li>To send important service-related communications (e.g., account verification)</li>
              <li>To enforce our Terms of Service and protect against misuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Data Sharing</h2>
            <p className="mb-3">
              <strong>We do not sell your personal information to third parties.</strong>
            </p>
            <p>We may share limited data with the following service providers who help us operate Townly:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>
                <strong>Supabase:</strong> Provides our authentication system and database
                infrastructure. Your account data and content are stored on Supabase servers.
              </li>
              <li>
                <strong>Stripe:</strong> Processes payments for event spotlight bookings. Stripe
                receives only the payment information necessary to complete your transaction.
              </li>
              <li>
                <strong>Google:</strong> If you choose to sign in with Google, Google facilitates the
                authentication process.
              </li>
            </ul>
            <p className="mt-3">
              We may also disclose information if required by law or to protect the safety and rights
              of our users and the public.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Data Storage and Security</h2>
            <p>
              Your data is stored securely using Supabase's cloud infrastructure. We use
              industry-standard security measures including encrypted connections (HTTPS) and
              row-level security policies on our database. However, no method of electronic
              storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Your Rights and Choices</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Access and Update:</strong> You can view and update your profile information
                through your account settings.
              </li>
              <li>
                <strong>Account Deletion:</strong> You may request deletion of your account and
                associated data by contacting us. We will process your request in a reasonable
                timeframe.
              </li>
              <li>
                <strong>Content Removal:</strong> You can delete your own posts and reviews through
                the platform. Business owners can request updates or removal of their listing
                information.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Cookies and Local Storage</h2>
            <p>
              Townly uses browser local storage and session storage to maintain your login session,
              remember preferences, and temporarily store form drafts. We do not use third-party
              tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Children's Privacy</h2>
            <p>
              Townly is not directed at children under 13 years of age. We do not knowingly collect
              personal information from children under 13. If you believe a child has provided us with
              personal information, please contact us so we can remove it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. If we make significant changes, we
              will notify users through the platform. Your continued use of Townly after changes are
              posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or want to request account deletion,
              please reach out to us through the Townly platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
