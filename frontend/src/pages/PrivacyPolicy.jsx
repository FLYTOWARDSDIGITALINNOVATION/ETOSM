import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './TermsOfService.css';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="policies-page">
      <Header />
      
      <section className="policies-hero">
        <span className="policies-tagline">Legal Information</span>
        <h1 className="policies-h1">PRIVACY <br /><span className="outline">& RETURNS.</span></h1>
      </section>

      <div className="policies-container">
        <div className="policies-content">
          {/* Privacy Policy Section */}
          <section className="policies-section">
            <h2>PRIVACY POLICY</h2>
            <p>
              EToSM Technology (etosmtechnology.in) recognizes the importance of protecting user privacy and is committed to safeguarding the personal information of its customers. We do not collect personally identifiable information unless it is voluntarily submitted by you. Certain information may be required during registration to access our services and to authenticate your identity. Such information is used exclusively for service delivery and security purposes. Under no circumstances do we sell, trade, or disclose customer or visitor information to third parties.
            </p>
          </section>

          <section className="policies-section">
            <h2>What Personal Information We Collect</h2>
            <p>
              When you visit the Site, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device.
            </p>
            <p>
              Additionally, as you browse the Site, we collect information about the individual web pages or products that you view, what websites or search terms referred you to the Site, and information about how you interact with the Site. We refer to this automatically collected information as Device Information. We collect Device Information using the following technologies:
            </p>
            <ul className="policies-list">
              <li><strong>Cookies:</strong> Data files that are placed on your device or computer and often include an anonymous unique identifier.</li>
              <li><strong>Log Files:</strong> Track actions occurring on the Site, and collect data including your IP address, browser type, Internet service provider, referring/exit pages, and date/time stamps.</li>
            </ul>
          </section>

          <section className="policies-section">
            <h2>Order Information</h2>
            <p>
              Also, when you make a purchase or attempt to make a purchase through the Site, we collect certain information from you, including your name, billing address, shipping address, payment information, email address, and phone number.
            </p>
          </section>

          <section className="policies-section">
            <h2>Payment</h2>
            <p>
              We use Razorpay for processing payments. We/Razorpay do not store your card data on their servers. The data is encrypted through the Payment Card Industry Data Security Standard (PCI-DSS) when processing payment. Your purchase transaction data is only used as long as is necessary to complete your purchase transaction. After that is complete, your purchase transaction information is not saved.
            </p>
            <p>
              Our payment gateway adheres to the standards set by PCI-DSS as managed by the PCI Security Standards Council, which is a joint effort of brands like Visa, MasterCard, American Express and Discover.
            </p>
            <p>
              PCI-DSS requirements help ensure the secure handling of credit card information by our store and its service providers.
            </p>
            <p>
              For more insight, you may also want to read terms and conditions of razorpay on <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer">https://razorpay.com</a>.
            </p>
          </section>

          <section className="policies-section">
            <h2>Data Retention</h2>
            <p>
              When you place an order through the Site, we will maintain your Order Information for our records unless and until you ask us to delete this information.
            </p>
          </section>

          <section className="policies-section">
            <h2>Changes To This Privacy Policy</h2>
            <p>
              We reserve the right to modify this privacy policy at any time, so please review it frequently. Changes and clarifications will take effect immediately upon their posting on the website. If we make material changes to this policy, we will notify you here that it has been updated, so that you are aware of what information we collect, how we use it, and under what circumstances, if any, we use and/or disclose it.
            </p>
            <p>
              If our store is acquired or merged with another company, your information may be transferred to the new owners so that we may continue to sell products to you.
            </p>
          </section>

          {/* Cancellation and Return Policies Section */}
          <h2 style={{ marginTop: '20px', marginBottom: '0px', fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', letterSpacing: '-1px' }}>CANCELLATION & RETURNS</h2>

          <section className="policies-section">
            <h2>Order Cancellation</h2>
            <p>
              Cancellation requests can only be made before the product is shipped. Once the product is shipped, Cancellation will not be possible.
            </p>
          </section>

          <section className="policies-section">
            <h2>Returns and Refunds</h2>
            <p>
              If the product has already been shipped, you can return the product upon delivery. In such cases, the delivery fee will be deducted from the refund amount. The remaining product amount will be refunded to the same payment method used for the purchase within 7 working days.
            </p>
          </section>

          <section className="policies-section">
            <h2>Eligibility for Return</h2>
            <p>
              The product must be in its original condition, unused, and returned with all original packaging and documentation.
            </p>
          </section>

          <section className="policies-section">
            <h2>Non-Refundable Cases</h2>
            <p>
              Items damaged due to misuse or improper handling will not be eligible for a refund.
            </p>
          </section>

        </div>
        
        <div className="policies-footer">
          <p>If you feel that EToSM Technology (etosmtechnology.in) is violating this Privacy Statement, please contact us on <a href="mailto:info@etosmtechnology.in">info@etosmtechnology.in</a></p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
