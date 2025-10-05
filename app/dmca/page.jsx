"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useNavBar } from '@/contexts/NavBarContext';
import Footer from '../../components/Footer';

const DmcaNotice = () => {
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
            DMCA Policy
          </h1>
          <p className="text-[#c2c2c2] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-3">
            GoonChan respects the intellectual property rights of others and expects users of our services to do the same. This page explains how copyright owners can report infringing content and how we handle such notices under the Digital Millennium Copyright Act (“DMCA”).
          </p>
          <div className="text-sm text-[#939393] font-medium mt-2 italic">
            Last updated: July 1, 2025
          </div>
        </div>

        <div className="space-y-12">
          {[
            {
              title: '1. Reporting Copyright Infringement',
              content: [
                'If you believe that any content available on GoonChan infringes your copyright, you may send a written notice to our Designated Agent. The notice must include the following elements as required by the DMCA (17 U.S.C. § 512(c)(3)):'
              ],
              list: [
                'A physical or electronic signature of the copyright owner or person authorized to act on their behalf',
                'Identification of the copyrighted work claimed to have been infringed, or a representative list if multiple works are affected',
                'Identification of the material that is claimed to be infringing and sufficient information to locate it (e.g., URLs, screenshots)',
                'Your name, address, telephone number, and email address',
                'A statement that you have a good faith belief that the use is not authorized by the copyright owner, its agent, or the law',
                'A statement under penalty of perjury that the information in the notice is accurate and you are the copyright owner or authorized to act on behalf of the owner'
              ],
              extra: (
                <div className="bg-[#101010] rounded-lg p-5 border border-[#1f1f1f] mt-3 space-y-2">
                  <p className="font-semibold">DMCA Agent Contact:</p>
                  <p><strong>Email:</strong> <a href="mailto:support@goonchan.org" className="text-[#ea4197] hover:underline">support@goonchan.org</a></p>
                  <p><strong>Subject Line:</strong> DMCA Takedown Notice</p>
                </div>
              )
            },
            {
              title: '2. Misrepresentations',
              content: [
                'Under Section 512(f) of the DMCA, any person who knowingly misrepresents that material or activity is infringing may be subject to liability. Submitting false claims can lead to legal consequences.'
              ]
            },
            {
              title: '3. Counter Notification',
              content: [
                'If you believe that content you uploaded was removed or disabled by mistake or misidentification, you may submit a counter-notice. The counter-notification must include:'
              ],
              list: [
                'Your physical or electronic signature',
                'Identification of the content that was removed or disabled and the location where it appeared',
                'A statement under penalty of perjury that you believe the content was removed or disabled as a result of mistake or misidentification',
                'Your name, address, telephone number, and email address',
                'A statement that you consent to the jurisdiction of the federal district court in your judicial district (or the appropriate court if outside the U.S.) and that you will accept service of process from the party who submitted the original DMCA notice'
              ]
            },
            {
              title: '4. Repeat Infringer Policy',
              content: [
                'GoonChan maintains a policy of terminating accounts of users who are repeat infringers. We may also remove content or suspend accounts after a single incident if the violation is deemed egregious.'
              ]
            },
            {
              title: '5. Content Hosting & Jurisdiction',
              content: [
                'GoonChan operates globally. While we comply with the DMCA, we may also take action on copyright complaints that fall under other jurisdictions or international treaties.',
                'Content on GoonChan may be hosted on third-party infrastructure. Takedown actions will be implemented in cooperation with our hosting providers and CDN networks.'
              ]
            },
            {
              title: '6. Content Creators & Licensing',
              content: [
                'Many videos and images on GoonChan are submitted by independent creators or studios. If you are a content producer and believe your content is used without permission, you may reach out with proof of ownership and/or licensing terms.',
                'We may require additional verification to confirm your ownership claim, especially if the content has been re-uploaded, altered, or published under pseudonyms.'
              ]
            },
            {
              title: '7. Additional Assistance',
              content: [
                'We aim to process DMCA notices in a timely manner. Incomplete or invalid notices may be ignored. If you need clarification on submitting a valid notice, contact our DMCA Agent.'
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
          <h3 className="text-2xl sm:text-4xl font-semibold text-white">Copyright Protection</h3>
          <p className="text-[#c2c2c2] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            GoonChan is committed to protecting intellectual property rights. If you believe your copyright has been infringed, 
            please follow our DMCA process outlined above. We take all valid copyright claims seriously and respond promptly.
          </p>
          <div className="flex flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 pt-1">
            <Link 
              href="/terms-of-service" 
              className="bg-[#1a1a1a] text-[#ea4197] hover:bg-[#202020] hover:text-[#ea4197] transition px-4 py-2 rounded-full text-sm font-medium"
            >
              Terms of Service
            </Link>
            <Link 
              href="/privacy-policy" 
              className="bg-[#1a1a1a] text-[#ea4197] hover:bg-[#202020] hover:text-[#ea4197] transition px-4 py-2 rounded-full text-sm font-medium"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DmcaNotice;
