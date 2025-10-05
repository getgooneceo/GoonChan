"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useNavBar } from '@/contexts/NavBarContext';
import Footer from '../../components/Footer';

const PrivacyPolicy = () => {
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
            Privacy Policy
          </h1>
          <p className="text-[#c2c2c2] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-3">
            This Privacy Policy outlines how GoonChan collects, uses, and protects your information. By using our service, you agree to the terms outlined here.
          </p>
          <div className="text-sm text-[#939393] font-medium mt-2 italic">
            Last updated: July 1, 2025
          </div>
        </div>

        <div className="space-y-12">
          {[
            {
              title: '1. Information We Collect',
              content: [
                'We may collect both personal and non-personal information when you use our service, including but not limited to:',
              ],
              list: [
                'Email address, username, and password during account registration',
                'Payment information when you subscribe to premium services',
                'IP address, browser type, device information, and usage data',
                'Content interactions, favorites, and preferences'
              ]
            },
            {
              title: '2. Use of Information',
              content: [
                'The information we collect is used to enhance your experience and ensure secure and personalized access to the service. Specifically, we use data to:'
              ],
              list: [
                'Provide and improve the platform and its features',
                'Process payments and manage subscriptions',
                'Communicate with you about account-related updates',
                'Ensure compliance with age and content restrictions',
                'Monitor for fraud, abuse, or prohibited content'
              ]
            },
            {
              title: '3. Cookies and Tracking',
              content: [
                'We use cookies and similar tracking technologies to analyze usage, remember user preferences, and improve site performance.',
                'You can manage cookie settings through your browser, but disabling cookies may impact site functionality.'
              ]
            },
            {
              title: '4. Sharing of Information',
              content: [
                'We do not sell your personal data. However, we may share information with third parties in the following cases:'
              ],
              list: [
                'Service providers assisting with operations (e.g., payment processors, analytics)',
                'Law enforcement or regulatory bodies when required by law',
                'In the event of a merger, acquisition, or asset sale'
              ]
            },
            {
              title: '5. Data Security',
              content: [
                'We implement technical and organizational measures to protect your data, including encryption, access controls, and regular monitoring.',
                'However, no system is fully immune to breaches. Use the service at your own discretion.'
              ]
            },
            {
              title: '6. Retention of Data',
              content: [
                'We retain your data for as long as your account is active or as needed to provide services, comply with legal obligations, or enforce our agreements.'
              ]
            },
            {
              title: '7. Your Rights',
              content: [
                'Depending on your jurisdiction, you may have rights regarding your personal data, including:'
              ],
              list: [
                'Accessing or requesting a copy of your personal data',
                'Requesting deletion or correction of inaccurate data',
                'Opting out of marketing communications',
                'Restricting or objecting to certain data processing activities'
              ]
            },
            {
              title: '8. Adult Content and Privacy',
              content: [
                'Due to the nature of the service, we prioritize discretion and confidentiality. Data linked to adult content consumption is treated with heightened sensitivity.',
                'We do not disclose user activity to third parties outside of outlined exceptions.'
              ]
            },
            {
              title: '9. Third-Party Services',
              content: [
                'Some parts of the platform may contain links or embed services provided by third parties. We are not responsible for their privacy practices. Always review their privacy policies before engaging.'
              ]
            },
            {
              title: '10. Children\'s Privacy',
              content: [
                'Our service is strictly for adults. We do not knowingly collect or store information from individuals under the age of 18. If we discover such data, we will take immediate steps to delete it.'
              ]
            },
            {
              title: '11. International Users',
              content: [
                'Your information may be transferred to and maintained on servers outside your country of residence. By using the service, you consent to such transfers.'
              ]
            },
            {
              title: '12. Updates to This Policy',
              content: [
                'We may revise this Privacy Policy periodically. Material changes will be communicated via email or platform notifications.',
                'Continued use of the platform after updates signifies your acceptance of the revised policy.'
              ]
            },
            {
              title: '13. Contact Us',
              content: [
                'If you have any questions regarding this Privacy Policy, reach out to us at:'
              ],
              extra: (
                <div className="bg-[#101010] rounded-lg p-5 border border-[#1f1f1f] mt-3 space-y-1">
                  <p><strong>Email:</strong> <a href="mailto:support@goonchan.org" className="text-[#ea4197] hover:underline">support@goonchan.org</a></p>
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

        <div className="bg-[#101010] rounded-xl p-6 sm:p-8 border border-[#1f1f1f] mt-10 text-center space-y-4">
          <h3 className="text-2xl sm:text-4xl font-semibold text-white">Privacy Acknowledgment</h3>
          <p className="text-[#c2c2c2] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            By using GoonChan, you acknowledge that you have read, understood, and agree to this Privacy Policy. 
            Your continued use of our service constitutes acceptance of how we collect, use, and protect your information.
          </p>
          <div className="flex flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 pt-1">
            <Link 
              href="/terms-of-service" 
              className="bg-[#1a1a1a] text-[#ea4197] hover:bg-[#202020] hover:text-[#ea4197] transition px-4 py-2 rounded-full text-sm font-medium"
            >
              Terms of Service
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

export default PrivacyPolicy;
