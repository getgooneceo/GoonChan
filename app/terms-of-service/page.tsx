"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useNavBar } from '@/contexts/NavBarContext';
import Footer from '../../components/Footer';

const TermsOfService = () => {
  const { setConfig } = useNavBar();

  useEffect(() => {
    setConfig({
      show: true,
      showCategories: false,
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white font-inter">

      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4 sm:mb-6">
            Terms of Service
          </h1>
          <p className="text-[#c2c2c2] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-3">
            Please read these Terms of Service carefully before using GoonChan. 
            By accessing or using our service, you agree to be bound by these terms.
          </p>
          <div className="text-sm text-[#939393] font-medium mt-2 italic">
            Last updated: July 1, 2025
          </div>
        </div>

        <div className="space-y-12">
          {[
            {
              title: '1. Acceptance of Terms',
              content: [
                'By accessing and using GoonChan ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.',
                'These Terms of Service constitute a legally binding agreement between you and GoonChan regarding your use of the Service.'
              ]
            },
            {
              title: '2. Age Restriction and Eligibility',
              content: [
                '<strong class="text-[#ea4197]">You must be at least 18 years of age to use this service.</strong> GoonChan is an adult entertainment platform containing explicit sexual content. By using this service, you represent and warrant that:'
              ],
              list: [
                'You are at least 18 years of age or the age of majority in your jurisdiction',
                'You have the legal right to access adult content in your jurisdiction',
                'You will not allow minors to access your account or view content through your account',
                'You understand the adult nature of the content and are not offended by such material'
              ]
            },
            {
              title: '3. User Accounts and Registration',
              content: [
                'To access certain features of the Service, you may be required to create an account. When creating an account, you agree to:'
              ],
              list: [
                'Provide accurate, current, and complete information during registration',
                'Maintain and promptly update your account information',
                'Maintain the security of your password and accept responsibility for all activities under your account',
                'Immediately notify us of any unauthorized use of your account'
              ],
              extra: 'You are responsible for all activities that occur under your account, whether or not you authorized such activities.'
            },
            {
              title: '4. Acceptable Use Policy',
              content: [
                'You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:'
              ],
              list: [
                'Upload, post, or transmit any content involving minors',
                'Share content that depicts non-consensual activities',
                'Upload malicious software, viruses, or any harmful code',
                'Attempt to gain unauthorized access to other user accounts or our systems',
                'Use automated tools to scrape or download content from the platform',
                'Harass, threaten, or intimidate other users',
                'Violate any applicable laws or regulations',
                'Share or distribute copyrighted content without permission'
              ]
            },
            {
              title: '5. Content and Intellectual Property',
              content: [
                '<strong>Content Ownership:</strong> All content available on GoonChan, including but not limited to videos, images, text, graphics, and software, is the property of GoonChan or our content providers and is protected by copyright and other intellectual property laws.',
                '<strong>User-Generated Content:</strong> By uploading content to our platform, you grant GoonChan a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content on our platform.',
                '<strong>Content Removal:</strong> We reserve the right to remove any content that violates these terms or is deemed inappropriate at our sole discretion.'
              ]
            },
            {
              title: '6. Privacy and Data Protection',
              content: [
                'Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.',
                'We implement appropriate security measures to protect your personal information, but cannot guarantee absolute security of data transmitted over the internet.'
              ]
            },
            {
              title: '7. Streaming and Access',
              content: [
                'GoonChan provides streaming access to adult content. By using our streaming service, you acknowledge that:'
              ],
              list: [
                'Streaming quality may vary based on your internet connection and device capabilities',
                'Content availability may change without notice',
                'You may not record, download, or redistribute streamed content',
                'We may limit concurrent streams or implement other technical restrictions'
              ]
            },
            {
              title: '8. Payment and Billing',
              content: [
                'If you purchase premium services or content, you agree to pay all applicable fees. Payment terms include:'
              ],
              list: [
                'All fees are non-refundable unless otherwise stated',
                'Subscription fees are billed in advance',
                'You authorize us to charge your payment method for all applicable fees',
                'Price changes will be communicated with 30 days notice'
              ]
            },
            {
              title: '9. Termination',
              content: [
                'We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms.',
                'You may terminate your account at any time by contacting our support team. Upon termination, your right to use the Service will cease immediately.'
              ]
            },
            {
              title: '10. Disclaimers and Limitation of Liability',
              content: [
                '<strong>Service "As Is":</strong> The Service is provided "as is" and "as available" without warranties of any kind, either express or implied.',
                '<strong>Limitation of Liability:</strong> To the maximum extent permitted by law, GoonChan shall not be liable for any indirect, incidental, special, consequential, or punitive damages.'
              ]
            },
            {
              title: '11. Geographic Restrictions',
              content: [
                'The Service may not be available in all countries or jurisdictions. You are responsible for ensuring that your use of the Service complies with local laws and regulations.',
                'We reserve the right to restrict access to the Service in certain geographic locations.'
              ]
            },
            {
              title: '12. Changes to Terms',
              content: [
                'We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service.',
                'Your continued use of the Service after changes to these Terms constitutes acceptance of the new Terms.'
              ]
            },
            {
              title: '13. Contact Information',
              content: [
                'If you have any questions about these Terms of Service, please contact us:'
              ],
              extra: (
                <div className="bg-[#101010] rounded-lg p-5 border border-[#1f1f1f] mt-3 space-y-1">
                  <p><strong>Email:</strong> <a href="mailto:goonchan.support@proton.me" className="text-[#ea4197] hover:underline">goonchan.support@proton.me</a></p>
                </div>
              )
            }
          ].map((section, i) => (
            <section key={i} className="space-y-4 border-b border-[#1a1a1a] pb-8 sm:pb-10">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">
                {section.title}
              </h2>
              <div className="text-[#c2c2c2] leading-7 sm:leading-8 text-base sm:text-lg tracking-wide space-y-3">
                {section.content?.map((c, j) => (
                  <p key={j} dangerouslySetInnerHTML={{ __html: c }} />
                ))}
                {section.list && (
                  <ul className="list-disc list-inside space-y-2 ml-4 sm:ml-6">
                    {section.list.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.extra && (
                  typeof section.extra === 'string' 
                    ? <p>{section.extra}</p>
                    : section.extra
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Agreement */}
        <div className="bg-[#101010] rounded-xl p-6 sm:p-8 border border-[#1f1f1f] mt-10 text-center space-y-4">
          <h3 className="text-2xl sm:text-4xl font-semibold text-white">Agreement Acknowledgment</h3>
          <p className="text-[#c2c2c2] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            By using GoonChan, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. 
            You also confirm that you are of legal age to access adult content in your jurisdiction.
          </p>
          <div className="flex flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 pt-1">
            <Link 
              href="/privacy-policy" 
              className="bg-[#1a1a1a] text-[#ea4197] hover:bg-[#202020] hover:text-[#ea4197] transition px-4 py-2 rounded-full text-sm font-medium"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/dmca" 
              className="bg-[#1a1a1a] text-[#ea4197] hover:bg-[#202020] hover:text-[#ea4197] transition px-4 py-2 rounded-full text-sm font-medium"
            >
              DMCA Notice
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
