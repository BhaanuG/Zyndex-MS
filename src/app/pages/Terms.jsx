import { motion } from 'motion/react';
import PublicLayout from '@/app/components/PublicLayout';
import { FileText, Shield, AlertCircle, BookOpen, Users, CreditCard, Ban, Scale, Globe, Mail } from 'lucide-react';

export default function Terms() {
  const sections = [
    {
      icon: FileText,
      title: '1. Acceptance of Terms',
      content: [
        {
          subtitle: 'Binding Agreement',
          text: 'These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and Zyndex ("we", "us", or "our"). By accessing, browsing, or using the Zyndex educational resource library platform (the "Service" or "Platform"), you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.'
        },
        {
          subtitle: 'Acceptance by Use',
          text: 'Your use of the Service constitutes your acceptance of these Terms. If you do not agree with any part of these Terms, you must not use the Service. Continued use of the Service following any modifications to these Terms will constitute your acceptance of such modifications.'
        },
        {
          subtitle: 'Age Requirement',
          text: 'By using this Service, you represent and warrant that you are at least 16 years of age. If you are under 16 years old, you are not permitted to use the Service or provide any personal information.'
        }
      ]
    },
    {
      icon: BookOpen,
      title: '2. Definitions',
      content: [
        {
          subtitle: 'Key Terms',
          text: '"Service" or "Platform" refers to the Zyndex educational resource library, including the website, mobile applications, and all related services, content, and features.\n\n"Content" means all educational resources, materials, documents, articles, books, videos, images, metadata, and other information available through the Service, whether provided by Zyndex, our partners, or users.\n\n"User" or "You" refers to any individual or entity that accesses or uses the Service, including visitors, registered users, contributors, and administrators.\n\n"Account" refers to the unique account you create to access certain features of the Service.\n\n"Subscription" refers to any paid plan or membership tier that grants access to premium features or content on the Platform.\n\n"User-Generated Content" or "UGC" means any content, including text, images, files, reviews, comments, or other materials that you upload, submit, or otherwise make available through the Service.'
        }
      ]
    },
    {
      icon: Users,
      title: '3. Eligibility & Account Registration',
      content: [
        {
          subtitle: 'Age Requirements',
          text: 'You must be at least 16 years old to create an account and use the Service. Users under 18 but over 16 may use the Service with parental or guardian consent. We reserve the right to request proof of age and parental consent at any time.'
        },
        {
          subtitle: 'Accurate Information Requirement',
          text: 'When creating an account, you must provide accurate, current, and complete information. You agree to promptly update your account information to maintain its accuracy. Providing false, misleading, or fraudulent information may result in immediate termination of your account.'
        },
        {
          subtitle: 'Account Responsibility',
          text: 'You are solely responsible for maintaining the confidentiality of your account credentials, including your username and password. You agree to: (a) immediately notify us of any unauthorized use of your account, (b) ensure that you log out from your account at the end of each session, (c) not share your account with others, and (d) accept responsibility for all activities that occur under your account. Zyndex will not be liable for any loss or damage arising from your failure to comply with this obligation.'
        }
      ]
    },
    {
      icon: BookOpen,
      title: '4. Description of Service',
      content: [
        {
          subtitle: 'What Zyndex Provides',
          text: 'Zyndex provides an online educational resource library that offers access to a curated collection of academic materials, including:\n\n• Searchable database of educational content across multiple subjects\n• Online reading and viewing capabilities\n• Download functionality (where permitted)\n• Bookmarking and note-taking features\n• Personalized recommendations based on your interests\n• Community features including reviews and ratings\n• Administrative tools for content management (for authorized users)'
        },
        {
          subtitle: 'Subscription Tiers',
          text: 'The Service may offer different subscription tiers, including:\n\n• Free Tier: Limited access to basic resources and features\n• Premium Tier: Full access to all resources, enhanced features, and offline downloads\n• Educational Institution Tier: Bulk licensing for schools and organizations\n\nSpecific features, limitations, and pricing for each tier are described on our pricing page and may change with notice.'
        },
        {
          subtitle: 'Availability Disclaimer',
          text: 'While we strive to provide uninterrupted access to the Service, we do not guarantee that the Service will be available at all times or error-free. The Service may be subject to limitations, delays, and other problems inherent in the use of the internet and electronic communications. We are not responsible for any delays, delivery failures, or other damage resulting from such problems. We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice, for maintenance, updates, or other reasons.'
        }
      ]
    },
    {
      icon: Shield,
      title: '5. Intellectual Property Rights',
      content: [
        {
          subtitle: 'Ownership of Content',
          text: 'All Content available through the Service, including but not limited to educational resources, books, articles, videos, images, software, code, metadata, text, graphics, logos, button icons, and the compilation thereof (the "Zyndex Content"), is the property of Zyndex, our licensors, content partners, or users who have uploaded such content. The Zyndex Content is protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property laws.'
        },
        {
          subtitle: 'License Granted to Users',
          text: 'Subject to your compliance with these Terms and applicable law, Zyndex grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to:\n\n• Access and view Content through the Service for your personal, non-commercial, educational use only\n• Download Content where explicitly permitted by the Content provider or subscription tier\n• Create bookmarks, highlights, and personal notes on Content\n\nThis license does not include any right to: (a) resale, redistribution, or commercial use of the Service or Content; (b) collection and use of any product listings, descriptions, or prices; (c) derivative use of the Service or Content; (d) downloading or copying of account information; or (e) use of data mining, robots, or similar data gathering and extraction tools.'
        },
        {
          subtitle: 'Restrictions - No Redistribution or Resale',
          text: 'You may NOT:\n\n• Copy, reproduce, distribute, transmit, broadcast, display, sell, license, or otherwise exploit any Content for any purpose without our express written consent or that of our licensors\n• Systematically download, store, or archive Content\n• Use automated systems (bots, scrapers) to access the Service\n• Remove, alter, or obscure any copyright, trademark, or proprietary notices\n• Create derivative works based on the Content\n• Share your account credentials or subscription access with others\n• Upload or distribute any Content that infringes third-party intellectual property rights\n\nViolation of these restrictions may result in immediate termination of your account and legal action.'
        }
      ]
    },
    {
      icon: Ban,
      title: '6. User Conduct & Restrictions',
      content: [
        {
          subtitle: 'Prohibited Actions',
          text: 'You agree NOT to:\n\n• Copyright Infringement: Upload, share, or distribute any Content that infringes the intellectual property rights of others.\n\n• Account Sharing: Share your account credentials or allow multiple individuals to use a single account (except for authorized family or institutional accounts).\n\n• Scraping or Automated Access: Use robots, spiders, scrapers, or other automated means to access the Service or extract data without our explicit written permission.\n\n• Malicious Content: Upload viruses, malware, or any code designed to interrupt, destroy, or limit the functionality of the Service.\n\n• Harassment or Abuse: Harass, threaten, impersonate, or intimidate other users through comments, messages, or reviews.\n\n• Spam or Commercial Use: Use the Service to send unsolicited advertising, promotional materials, or spam.\n\n• System Interference: Interfere with or disrupt the Service, servers, or networks connected to the Service.\n\n• Unauthorized Access: Attempt to gain unauthorized access to any portion of the Service, other user accounts, or computer systems or networks.\n\n• False Information: Provide false, inaccurate, or misleading information.\n\n• Illegal Activities: Use the Service for any illegal purpose or to violate any laws in your jurisdiction.'
        },
        {
          subtitle: 'Reviews & Comments Policy',
          text: 'When posting reviews, comments, or ratings, you must:\n\n• Provide honest, factual, and constructive feedback\n• Not post content that is defamatory, obscene, offensive, or discriminatory\n• Not include personal attacks or inappropriate language\n• Not post promotional content or spam\n• Respect the intellectual property rights of others\n\nWe reserve the right to remove any reviews or comments that violate these guidelines without notice.'
        }
      ]
    },
    {
      icon: BookOpen,
      title: '7. Digital Content Usage Rules',
      content: [
        {
          subtitle: 'Digital Rights Management (DRM)',
          text: 'Certain Content may be protected by Digital Rights Management (DRM) technology to prevent unauthorized copying and distribution. You agree not to circumvent, disable, or interfere with any DRM measures or security features of the Service.'
        },
        {
          subtitle: 'Download Limits',
          text: 'Depending on your subscription tier, you may have limits on the number of resources you can download per month. These limits are designed to prevent abuse and ensure fair access for all users. Excessive downloading may result in temporary or permanent restrictions on your account.'
        },
        {
          subtitle: 'Offline Access Rules',
          text: 'Downloaded content for offline access:\n\n• May only be used on devices authorized by your account\n• Must not be transferred, shared, or distributed to others\n• May expire after a certain period (e.g., 30 days) and require re-authentication\n• May be limited in number based on your subscription tier'
        },
        {
          subtitle: 'Account Termination Effects',
          text: 'If your account is terminated (by you or by us), you will immediately lose access to all downloaded content and must delete all Content from your devices. Failure to do so constitutes a violation of these Terms and applicable copyright laws.'
        }
      ]
    },
    {
      icon: CreditCard,
      title: '8. Payments & Subscriptions',
      content: [
        {
          subtitle: 'Pricing Model',
          text: 'Zyndex offers various subscription plans with different features and pricing tiers. Current pricing information is available on our pricing page. We reserve the right to change our fees and pricing at any time with at least 30 days\' notice for existing subscribers.'
        },
        {
          subtitle: 'Billing Cycle',
          text: 'Subscription fees are billed in advance on a recurring basis (monthly or annually, depending on your chosen plan). By subscribing, you authorize us to charge the payment method on file at the beginning of each billing cycle.'
        },
        {
          subtitle: 'Auto-Renewal Terms',
          text: 'Your subscription will automatically renew at the end of each billing period unless you cancel before the renewal date. You can cancel your subscription at any time through your account settings. Cancellations take effect at the end of the current billing period—you will continue to have access until then.'
        },
        {
          subtitle: 'Refund Policy',
          text: 'We offer a 14-day money-back guarantee for new subscribers. If you are not satisfied with the Service within the first 14 days of your initial subscription, you may request a full refund. After the 14-day period, subscription fees are non-refundable. We do not provide pro-rated refunds for partial billing periods.'
        },
        {
          subtitle: 'Taxes and Fees',
          text: 'All fees are exclusive of applicable taxes, duties, or similar governmental assessments, including without limitation, sales, use, value-added, and withholding taxes (collectively, "Taxes"). You are responsible for payment of all Taxes associated with your use of the Service. If we are required to collect or pay Taxes, they will be charged to your payment method.'
        },
        {
          subtitle: 'Payment Method Updates',
          text: 'You must keep a valid payment method on file. If your payment method fails or your account is past due, we may suspend or terminate your access to the Service until payment is received.'
        }
      ]
    },
    {
      icon: Ban,
      title: '9. Termination & Suspension',
      content: [
        {
          subtitle: 'When We May Suspend or Terminate Accounts',
          text: 'We reserve the right to suspend or terminate your account and access to the Service immediately, without prior notice or liability, for any reason, including but not limited to:\n\n• Violation of these Terms of Service\n• Infringement of intellectual property rights\n• Fraudulent, abusive, or illegal activity\n• Non-payment of subscription fees\n• Sharing account credentials or excessive account sharing\n• Harassment or abuse of other users or Zyndex staff\n• Use of automated systems to access the Service\n• Any conduct that we believe, in our sole discretion, is harmful to other users, Zyndex, or third parties'
        },
        {
          subtitle: 'User-Initiated Termination',
          text: 'You may terminate your account at any time by:\n\n1. Logging into your account settings\n2. Selecting the "Delete Account" or "Cancel Subscription" option\n3. Following the confirmation prompts\n\nUpon termination, your subscription will not renew, but you will retain access until the end of your current billing period.'
        },
        {
          subtitle: 'Effects of Termination',
          text: 'Upon termination of your account:\n\n• You will immediately lose access to all Content and features of the Service\n• All downloaded Content must be deleted from your devices\n• Your User-Generated Content may be deleted (though we reserve the right to retain certain content for legal or operational purposes)\n• Subscription fees paid are non-refundable (except as provided in our refund policy)\n• You remain liable for any outstanding fees or obligations\n• Certain provisions of these Terms (including intellectual property rights, disclaimers, indemnification, and limitations of liability) will survive termination'
        }
      ]
    },
    {
      icon: Globe,
      title: '10. Third-Party Content & Services',
      content: [
        {
          subtitle: 'Content Publishers & Partners',
          text: 'Zyndex aggregates educational content from various publishers, authors, educational institutions, and content partners. While we strive to work only with reputable sources, we do not guarantee the accuracy, completeness, or quality of third-party content. Your use of third-party content may be subject to additional terms and licenses imposed by the content owner.'
        },
        {
          subtitle: 'External Links',
          text: 'The Service may contain links to third-party websites, services, or resources. These links are provided for your convenience only. Zyndex does not endorse and is not responsible for:\n\n• The content, products, or services offered by third-party sites\n• The privacy practices of external websites\n• Any damage or loss caused by your use of third-party sites\n\nYour use of third-party websites is at your own risk and subject to the terms and conditions of those sites.'
        },
        {
          subtitle: 'No Responsibility Disclaimer',
          text: 'Zyndex expressly disclaims any responsibility or liability for third-party content, services, or websites. We do not monitor, verify, or control third-party content and make no representations or warranties regarding such content.'
        }
      ]
    },
    {
      icon: AlertCircle,
      title: '11. Disclaimer of Warranties',
      content: [
        {
          subtitle: '"As Is" and "As Available" Basis',
          text: 'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, ZYNDEX DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:\n\n• Warranties of merchantability, fitness for a particular purpose, and non-infringement\n• Warranties that the Service will be uninterrupted, timely, secure, or error-free\n• Warranties regarding the accuracy, completeness, or reliability of any Content\n• Warranties that defects will be corrected\n• Warranties regarding the results obtained from use of the Service\n\nYOU USE THE SERVICE AT YOUR OWN RISK.'
        },
        {
          subtitle: 'Content Accuracy Disclaimer',
          text: 'While we make reasonable efforts to ensure the accuracy of Content, we do not guarantee that all Content is accurate, complete, up-to-date, or free from errors. Educational content is provided for informational and educational purposes only and should not be considered professional advice. Always verify information with official sources.'
        },
        {
          subtitle: 'Availability Disclaimer',
          text: 'We do not guarantee that the Service will be available 100% of the time. The Service may experience downtime due to maintenance, updates, technical issues, or circumstances beyond our control. We are not liable for any interruption or unavailability of the Service.'
        }
      ]
    },
    {
      icon: Scale,
      title: '12. Limitation of Liability',
      content: [
        {
          subtitle: 'Caps on Damages',
          text: 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ZYNDEX, ITS OFFICERS, DIRECTORS, EMPLOYEES, AFFILIATES, AGENTS, LICENSORS, AND SERVICE PROVIDERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION:\n\n• Loss of profits, revenue, or data\n• Loss of business opportunity\n• Loss of use or goodwill\n• Service interruptions\n• Cost of substitute services\n• Damages arising from your use or inability to use the Service\n\nTHIS LIMITATION APPLIES WHETHER THE ALLEGED LIABILITY IS BASED ON CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER BASIS, EVEN IF ZYNDEX HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.'
        },
        {
          subtitle: 'Maximum Liability Cap',
          text: 'IN NO EVENT SHALL ZYNDEX\'S TOTAL LIABILITY TO YOU FOR ALL DAMAGES, LOSSES, AND CAUSES OF ACTION EXCEED THE AMOUNT YOU PAID TO ZYNDEX IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY, OR $100 USD, WHICHEVER IS GREATER.'
        },
        {
          subtitle: 'Exclusion of Certain Damages',
          text: 'SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES OR THE LIMITATION OF LIABILITY FOR INCIDENTAL OR CONSEQUENTIAL DAMAGES. ACCORDINGLY, SOME OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU. IN SUCH JURISDICTIONS, ZYNDEX\'S LIABILITY WILL BE LIMITED TO THE GREATEST EXTENT PERMITTED BY LAW.'
        }
      ]
    },
    {
      icon: Shield,
      title: '13. Indemnification',
      content: [
        {
          subtitle: 'Your Responsibility',
          text: 'You agree to indemnify, defend, and hold harmless Zyndex, its parent company, subsidiaries, affiliates, officers, directors, employees, agents, licensors, and service providers from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys\' fees) arising from or relating to:\n\n• Your violation of these Terms of Service\n• Your violation of any law or regulation\n• Your violation of any rights of a third party, including intellectual property rights\n• Your use or misuse of the Service\n• Your User-Generated Content\n• Your account credentials being used by another person (whether authorized or unauthorized)\n\nThis indemnification obligation will survive termination of your account and these Terms.'
        }
      ]
    },
    {
      icon: Scale,
      title: '14. Governing Law & Jurisdiction',
      content: [
        {
          subtitle: 'Applicable Law',
          text: 'These Terms and your use of the Service shall be governed by and construed in accordance with the laws of [specify state/country, e.g., the State of California, United States], without regard to its conflict of law principles.'
        },
        {
          subtitle: 'Dispute Resolution',
          text: 'Any dispute, claim, or controversy arising out of or relating to these Terms or your use of the Service shall be resolved through:\n\n1. Informal Negotiation: We encourage you to contact us first to resolve any disputes informally.\n\n2. Binding Arbitration: If informal resolution fails, disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association (AAA). Arbitration shall be conducted in [specify location]. The arbitrator\'s decision shall be final and binding.\n\n3. Class Action Waiver: You agree that any arbitration or legal proceeding shall be conducted on an individual basis and not as a class action, consolidated action, or representative action.'
        },
        {
          subtitle: 'Venue for Legal Actions',
          text: 'If arbitration is not applicable or is deemed unenforceable, you agree that any legal action arising from these Terms shall be filed exclusively in the state or federal courts located in [specify location], and you consent to the personal jurisdiction of such courts.'
        }
      ]
    },
    {
      icon: FileText,
      title: '15. Changes to Terms',
      content: [
        {
          subtitle: 'Right to Modify',
          text: 'Zyndex reserves the right to modify, update, or replace these Terms at any time in our sole discretion. We will make reasonable efforts to notify users of material changes.'
        },
        {
          subtitle: 'Notification Method',
          text: 'We will notify you of changes to these Terms by:\n\n• Posting the updated Terms on this page with a revised "Last Updated" date\n• Sending an email notification to the address associated with your account (for significant changes)\n• Displaying a prominent notice on the Service homepage or within the application\n\nIt is your responsibility to review these Terms periodically for changes.'
        },
        {
          subtitle: 'Continued Use = Acceptance',
          text: 'Your continued use of the Service after any changes to these Terms constitutes your acceptance of the new Terms. If you do not agree with the modified Terms, you must stop using the Service and may terminate your account.'
        }
      ]
    },
    {
      icon: FileText,
      title: '16. General Provisions',
      content: [
        {
          subtitle: 'Entire Agreement',
          text: 'These Terms, together with our Privacy Policy and any other policies referenced herein, constitute the entire agreement between you and Zyndex regarding the Service and supersede all prior agreements and understandings.'
        },
        {
          subtitle: 'Severability',
          text: 'If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.'
        },
        {
          subtitle: 'No Waiver',
          text: 'Our failure to enforce any right or provision of these Terms will not be deemed a waiver of such right or provision.'
        },
        {
          subtitle: 'Assignment',
          text: 'You may not assign or transfer these Terms or your account without our prior written consent. Zyndex may assign or transfer these Terms at any time without restriction.'
        },
        {
          subtitle: 'Force Majeure',
          text: 'Zyndex shall not be liable for any failure to perform due to causes beyond its reasonable control, including acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or shortages of transportation facilities, fuel, energy, labor, or materials.'
        }
      ]
    },
    {
      icon: Mail,
      title: '17. Contact Information',
      content: [
        {
          subtitle: 'Support & Legal Inquiries',
          text: 'For questions, concerns, or legal inquiries regarding these Terms of Service, please contact us at:\n\nZyndex Support Team\nEmail: lmno1432@gmail.com\nSubject Line: Terms of Service Inquiry\n\nFor urgent legal matters, please mark your communication as "URGENT: Legal Matter" in the subject line.\n\nWe will respond to your inquiry within 5-7 business days.'
        }
      ]
    }
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center justify-center size-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-6">
              <Scale className="size-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These terms govern your use of the Zyndex educational resource library. Please read carefully before using our services.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
              <FileText className="size-4" />
              Last Updated: January 28, 2026
            </div>
          </motion.div>

          {/* Important Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl p-8 mb-12 text-white shadow-xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="size-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Important Legal Agreement</h3>
                <p className="text-red-50 leading-relaxed">
                  By using Zyndex, you agree to be legally bound by these Terms of Service. These terms contain important 
                  information about your rights and obligations, including limitations of liability and dispute resolution 
                  procedures. If you do not agree with these terms, you must not use the Service.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 * index }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 size-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                      <section.icon className="size-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                  </div>
                </div>
                <div className="px-8 py-6 space-y-6">
                  {section.content.map((item, idx) => (
                    <div key={idx} className="space-y-3">
                      {item.subtitle && (
                        <h3 className="text-lg font-semibold text-orange-600">{item.subtitle}</h3>
                      )}
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">{item.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-10 text-center text-white shadow-2xl"
          >
            <Mail className="size-16 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Questions About These Terms?</h2>
            <p className="text-orange-50 text-lg mb-8 max-w-2xl mx-auto">
              If you have any questions or concerns about these Terms of Service, please don't hesitate to contact our support team.
            </p>
            <a
              href="mailto:lmno1432@gmail.com?subject=Terms%20of%20Service%20Inquiry"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-orange-600 rounded-xl font-semibold hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl"
            >
              <Mail className="size-5" />
              Contact Support Team
            </a>
          </motion.div>
        </div>
      </div>
    </PublicLayout>
  );
}