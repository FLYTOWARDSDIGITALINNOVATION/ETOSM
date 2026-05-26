import React, { useEffect } from 'react';
import Header from '../components/Header';
import './TermsOfService.css';

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policies-page">
      <Header />
      
      <section className="policies-hero">
        <span className="policies-tagline">Legal Information</span>
        <h1 className="policies-h1">TERMS <br /><span className="outline">OF SERVICE.</span></h1>
      </section>

      <div className="policies-container">
        <div className="policies-content">
          <section className="policies-section">
            <h2>OVERVIEW</h2>
            <p>
              By accessing or using our site and/or purchasing products or services from us, you engage in our “Service” and agree to be bound by these Terms of Service (“Terms”), including all additional terms, conditions, and policies referenced herein or available via hyperlink. These Terms apply to all users of the site, including but not limited to browsers, vendors, customers, merchants, and content contributors.
            </p>
            <p>
              Please read these Terms of Service carefully before accessing or using our website. By accessing or using any part of the site, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions of this agreement, then you may not access the website or use any services. If these Terms of Service are considered an offer, acceptance is expressly limited to these Terms of Service.
            </p>
            <p>
              Any new features or tools which are added to the current store shall also be subject to the Terms of Service. You can review the most current version of the Terms of Service at any time on this page. We reserve the right to update, change or replace any part of these Terms of Service by posting updates and/or changes to our website. It is your responsibility to check this page periodically for changes. Your continued use of or access to the website following the posting of any changes constitutes acceptance of those changes.
            </p>
          </section>

          <section className="policies-section">
            <h2>MODIFICATIONS TO THE SERVICE AND PRICES</h2>
            <p>
              Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time. We shall not be liable to you or to any third-party for any modification, price change, suspension or discontinuance of the Service.
            </p>
          </section>

          <section className="policies-section">
            <h2>PERSONAL INFORMATION</h2>
            <p>
              Your submission of personal information through the store is governed by our Privacy Policy.
            </p>
          </section>

          <section className="policies-section">
            <h2>ACCURACY OF BILLING AND ACCOUNT INFORMATION</h2>
            <p>
              We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household or per order. These restrictions may include orders placed by or under the same customer account, the same credit card, and/or orders that use the same billing and/or shipping address. In the event that we make a change to or cancel an order, we may attempt to notify you by contacting the e-mail and/or billing address/phone number provided at the time the order was made. We reserve the right to limit or prohibit orders that, in our sole judgment, appear to be placed by dealers, resellers or distributors.
            </p>
            <p>
              You agree to provide current, complete and accurate purchase and account information for all purchases made at our store. You agree to promptly update your account and other information, including your email address and credit card numbers and expiration dates, so that we can complete your transactions and contact you as needed.
            </p>
            <p>
              For more detail, please review our Returns Policy.
            </p>
          </section>
        </div>

        <div className="policies-footer">
          <p>Any questions regarding the Terms of Service, please contact us at <a href="mailto:info@etosmtechnology.in">info@etosmtechnology.in</a>.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
