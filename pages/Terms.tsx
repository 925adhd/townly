import React from 'react';
import { Link } from 'react-router-dom';

const Terms: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors mb-6">
        <i className="fas fa-arrow-left text-xs"></i> Back to Home
      </Link>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Effective Date: March 18, 2026</p>

        <div className="space-y-8 text-slate-600 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Townly at{' '}
              <a href="https://townly.us" className="text-orange-600 hover:underline">townly.us</a>,
              you agree to be bound by these Terms of Service. If you do not agree to these terms,
              please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Description of Service</h2>
            <p>
              Townly is a community platform serving Grayson County, KY. The platform provides a local
              business directory, lost &amp; found board, community Q&amp;A, and event spotlight
              bookings. Some features require a free user account; event spotlight bookings require
              payment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You may sign up with an email and password or through Google OAuth.</li>
              <li>You must be at least 13 years old to create an account.</li>
              <li>One account per person. Creating multiple accounts to circumvent restrictions is prohibited.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">4. User-Generated Content</h2>
            <p className="mb-3">
              You are solely responsible for the content you post on Townly, including reviews, lost
              &amp; found posts, questions, answers, comments, and uploaded images.
            </p>
            <p className="font-medium text-slate-700 mb-2">You agree not to post content that:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Is false, misleading, defamatory, or fraudulent</li>
              <li>Is harassing, threatening, or abusive toward others</li>
              <li>Infringes on any third party's intellectual property rights</li>
              <li>Contains spam, advertisements, or solicitations unrelated to the platform's purpose</li>
              <li>Violates any applicable law or regulation</li>
              <li>Contains malicious links or harmful content</li>
            </ul>
            <p className="mt-3">
              By posting content, you grant Townly a non-exclusive, royalty-free license to display
              your content on the platform. You retain ownership of your content and may delete it
              at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Business Listings</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Business information on Townly may be sourced from publicly available data. Business
                owners can claim their listing and update their information.
              </li>
              <li>
                Claiming a business listing is free. Upgraded listing tiers (Standard Listing, Local
                Spotlight) are available for a weekly fee.
              </li>
              <li>
                Business owners are responsible for the accuracy of information they provide on their
                claimed listings.
              </li>
              <li>
                Anyone may request updates or removal of business information through the platform.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Payments and Refunds</h2>
            <p className="mb-3">
              Event spotlight bookings and listing upgrades require payment, processed securely through
              Stripe. By making a purchase, you agree to Stripe's terms of service.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>All prices are displayed before purchase and charged at the time of booking.</li>
              <li>
                Refund requests are handled on a case-by-case basis. Contact us if you believe a
                refund is warranted.
              </li>
              <li>
                We reserve the right to remove paid listings or spotlight bookings that violate these
                terms, without refund.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Reviews and Ratings</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Reviews should be honest, based on genuine experiences, and relevant to the business.</li>
              <li>Fake reviews, review manipulation, or incentivized reviews are prohibited.</li>
              <li>
                Business owners may respond to reviews but may not harass or intimidate reviewers.
              </li>
              <li>
                We reserve the right to remove reviews that violate these terms or our content
                guidelines.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Moderation and Enforcement</h2>
            <p>
              We reserve the right to remove content, suspend accounts, or take other action against
              users who violate these terms. Content may be flagged by users and reviewed by our
              moderation team. Decisions regarding content removal and account suspension are at our
              sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">9. Disclaimer of Warranties</h2>
            <p>
              Townly is provided "as is" and "as available" without warranties of any kind, either
              express or implied. We do not guarantee the accuracy of business listings, user reviews,
              or any other user-generated content. We are not responsible for any transactions or
              interactions between users and businesses listed on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Townly and its operators shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages arising from your
              use of the platform. Our total liability for any claim related to the service shall not
              exceed the amount you paid to us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">11. Account Termination</h2>
            <p>
              You may request deletion of your account at any time. We may suspend or terminate your
              account if you violate these terms. Upon termination, your right to use the platform
              ceases, but provisions that by their nature should survive (such as limitation of
              liability) will remain in effect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">12. Changes to These Terms</h2>
            <p>
              We may update these Terms of Service from time to time. If we make significant changes,
              we will notify users through the platform. Your continued use of Townly after changes
              are posted constitutes your acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">13. Governing Law</h2>
            <p>
              These terms are governed by the laws of the Commonwealth of Kentucky, without regard to
              conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">14. Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, please reach out to us through the
              Townly platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
