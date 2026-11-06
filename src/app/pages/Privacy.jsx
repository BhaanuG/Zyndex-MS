import { motion } from 'motion/react';
import PublicLayout from '@/app/components/PublicLayout';
import { Shield, Lock, Eye, Users, FileText, Globe, Mail } from 'lucide-react';

export default function Privacy() {
  const sections = [
    {
      icon: FileText,
      title: '1. Introduction & Scope',
      content: [
        {
          subtitle: 'Purpose of this Privacy Policy',
          text: 'This Privacy Policy describes how Zyndex ("we", "us", or "our") collects, uses, and protects your personal information when you use our educational resource library platform. We are committed to ensuring that your privacy is protected and that we comply with applicable data protection laws.'
        },
        {
          subtitle: 'Who This Policy Applies To',
          text: 'This policy applies to all visitors, registered users, contributors, and administrators who access or use the Zyndex platform, including our website, mobile applications, and any related services or APIs we provide.'
        },
        {
          subtitle: 'Platform Covered',
          text: 'This Privacy Policy covers the Zyndex educational resource library accessible through our website (zyndex.com), mobile applications (iOS and Android), and all associated APIs and services.'
        }
      ]
    },
    {
      icon: Users,
      title: '2. Information We Collect',
      content: [
        {
          subtitle: 'Personal Information',
          text: 'Name, email address, username, profile information, and any other information you voluntarily provide during registration or account setup. We DO NOT collect payment information directly—all payment processing is handled securely by third-party payment processors who comply with PCI DSS standards.'
        },
        {
          subtitle: 'Account Data',
          text: 'Reading history, resource access logs, bookmarks, notes, favorites, search queries, and preferences. This data helps us provide personalized recommendations and improve your user experience.'
        },
        {
          subtitle: 'Usage & Technical Data',
          text: 'IP address, browser type and version, device information, operating system, access times and dates, pages visited, time spent on pages, referral sources, and clickstream data collected through cookies and similar technologies.'
        },
        {
          subtitle: 'User-Generated Content',
          text: 'Reviews, comments, ratings, feedback, and any files or content you upload to the platform (if permitted by your user role). You retain ownership of your user-generated content, but grant us a license to use it as described in our Terms of Service.'
        }
      ]
    },
    {
      icon: Eye,
      title: '3. How Information Is Collected',
      content: [
        {
          subtitle: 'Direct User Input',
          text: 'Information you provide when registering for an account, updating your profile, filling out contact forms, participating in surveys, or communicating with our support team.'
        },
        {
          subtitle: 'Automatic Collection',
          text: 'We automatically collect certain information through cookies, web beacons, log files, and similar tracking technologies. This includes your IP address, browser type, device identifiers, and interaction data with our platform.'
        },
        {
          subtitle: 'Third-Party Integrations',
          text: 'We may receive information from third-party services you connect to your Zyndex account, such as single sign-on providers (Google, Microsoft), payment gateways, analytics tools (Google Analytics), and content delivery networks.'
        }
      ]
    },
    {
      icon: Lock,
      title: '4. Purpose of Data Use',
      content: [
        {
          subtitle: '',
          text: 'We use your information for the following purposes:\n\n• Account Creation & Authentication: To create and manage your account, verify your identity, and provide secure access to the platform.\n\n• Service Provision: To provide access to our educational resources, display content, process downloads, and enable platform features.\n\n• Personalization: To customize your experience, provide personalized recommendations, remember your preferences, and suggest relevant resources.\n\n• Communications: To send you service-related notifications, respond to your inquiries, provide customer support, and send newsletters (with your consent).\n\n• Analytics & Improvement: To analyze platform usage, understand user behavior, identify trends, improve our services, and develop new features.\n\n• Security & Fraud Prevention: To protect against unauthorized access, detect and prevent fraudulent activity, enforce our Terms of Service, and comply with legal obligations.\n\n• Legal Compliance: To comply with applicable laws, regulations, legal processes, and governmental requests.'
        }
      ]
    },
    {
      icon: Globe,
      title: '5. Cookies & Tracking Technologies',
      content: [
        {
          subtitle: 'Types of Cookies We Use',
          text: 'Essential Cookies: Required for the platform to function properly, including authentication, security, and session management.\n\nAnalytics Cookies: Help us understand how users interact with our platform through services like Google Analytics.\n\nPreference Cookies: Remember your settings, language preferences, and display options to enhance your experience.\n\nAdvertising Cookies: We DO NOT currently use advertising cookies. If we do in the future, we will update this policy and obtain your consent.'
        },
        {
          subtitle: 'Cookie Management',
          text: 'You can control cookies through your browser settings. Most browsers allow you to refuse cookies or delete existing cookies. However, disabling essential cookies may prevent you from using certain features of the platform. You can opt out of Google Analytics by installing the Google Analytics Opt-out Browser Add-on.'
        }
      ]
    },
    {
      icon: Shield,
      title: '6. Data Sharing & Disclosure',
      content: [
        {
          subtitle: 'Service Providers',
          text: 'We share your information with trusted third-party service providers who assist us in operating our platform, including: cloud hosting providers (AWS, Google Cloud), payment processors (Stripe, PayPal), email service providers, analytics services (Google Analytics), and content delivery networks. These providers are contractually obligated to protect your data and use it only for the purposes we specify.'
        },
        {
          subtitle: 'Legal Requirements',
          text: 'We may disclose your information when required by law, court order, subpoena, or other legal process, or when we believe in good faith that disclosure is necessary to protect our rights, your safety or the safety of others, investigate fraud, or respond to a government request.'
        },
        {
          subtitle: 'Business Transfers',
          text: 'In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred to the successor entity. We will notify you via email and/or prominent notice on our platform before your information is transferred and becomes subject to a different privacy policy.'
        },
        {
          subtitle: 'Public Information',
          text: 'Certain information you choose to make public (such as public reviews, comments, or profile information) may be visible to other users of the platform. Please exercise caution when deciding what information to make publicly available.'
        }
      ]
    },
    {
      icon: Lock,
      title: '7. Data Storage & Security',
      content: [
        {
          subtitle: 'Where Data Is Stored',
          text: 'Your data is stored on secure servers provided by reputable cloud hosting providers located in [specify regions, e.g., United States, European Union]. We use industry-standard data centers with physical and electronic security measures.'
        },
        {
          subtitle: 'Security Measures',
          text: 'We implement appropriate technical and organizational security measures to protect your personal information, including: encryption of data in transit (SSL/TLS) and at rest, regular security assessments and vulnerability testing, access controls and authentication mechanisms, employee training on data protection, and regular backups and disaster recovery procedures.'
        },
        {
          subtitle: 'No Guarantee Disclaimer',
          text: 'While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data. You use our platform at your own risk and are responsible for maintaining the confidentiality of your account credentials.'
        }
      ]
    },
    {
      icon: Users,
      title: '8. Your Rights (GDPR/CCPA Compliance)',
      content: [
        {
          subtitle: 'Access Personal Data',
          text: 'You have the right to request access to the personal data we hold about you. We will provide you with a copy of your data in a commonly used electronic format.'
        },
        {
          subtitle: 'Rectification',
          text: 'You have the right to request correction of inaccurate or incomplete personal data. You can update most of your information directly through your account settings.'
        },
        {
          subtitle: 'Erasure ("Right to be Forgotten")',
          text: 'You have the right to request deletion of your personal data under certain circumstances. Please note that we may be required to retain certain information for legal or legitimate business purposes.'
        },
        {
          subtitle: 'Data Portability',
          text: 'You have the right to receive your personal data in a structured, commonly used, and machine-readable format and to transmit that data to another controller.'
        },
        {
          subtitle: 'Withdraw Consent',
          text: 'Where we rely on your consent to process your personal data, you have the right to withdraw that consent at any time. This will not affect the lawfulness of processing based on consent before its withdrawal.'
        },
        {
          subtitle: 'Object to Processing',
          text: 'You have the right to object to our processing of your personal data for direct marketing purposes or based on our legitimate interests.'
        },
        {
          subtitle: 'Lodge a Complaint',
          text: 'You have the right to lodge a complaint with a supervisory authority if you believe we have violated your data protection rights.'
        }
      ]
    },
    {
      icon: FileText,
      title: '9. Data Retention',
      content: [
        {
          subtitle: 'How Long We Keep Your Data',
          text: 'We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Active user accounts and associated data are retained as long as your account remains active. Inactive accounts may be deleted after [specify period, e.g., 2 years] of inactivity following email notification.'
        },
        {
          subtitle: 'Criteria for Deletion',
          text: 'Data may be deleted or anonymized when: you request deletion of your account, your account has been inactive for the specified retention period, the data is no longer needed for the purposes for which it was collected, or we are legally required to delete the data. Certain data may be retained for legal compliance, dispute resolution, and enforcement of our agreements.'
        }
      ]
    },
    {
      icon: Shield,
      title: '10. Children\'s Privacy',
      content: [
        {
          subtitle: 'Age Restrictions',
          text: 'Zyndex is intended for users aged 16 and older. We do not knowingly collect personal information from children under 16 years of age. If you are under 16, please do not use our platform or provide any personal information.'
        },
        {
          subtitle: 'Parental Consent',
          text: 'If we become aware that we have collected personal information from a child under 16 without parental consent, we will take steps to delete that information as quickly as possible. If you believe we have inadvertently collected information from a child under 16, please contact us immediately at lmno1432@gmail.com.'
        }
      ]
    },
    {
      icon: Globe,
      title: '11. Third-Party Links',
      content: [
        {
          subtitle: 'Disclaimer for External Websites',
          text: 'Our platform may contain links to third-party websites, services, or resources that are not owned or controlled by Zyndex. This Privacy Policy applies only to information collected by Zyndex. We are not responsible for the privacy practices or content of third-party websites. We encourage you to review the privacy policies of any third-party sites you visit. The inclusion of any link does not imply our endorsement of the linked site.'
        }
      ]
    },
    {
      icon: FileText,
      title: '12. International Data Transfers',
      content: [
        {
          subtitle: 'Cross-Border Data Processing',
          text: 'Your information may be transferred to, stored, and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. When we transfer your data internationally, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses approved by the European Commission or other legally recognized transfer mechanisms.'
        }
      ]
    },
    {
      icon: Mail,
      title: '13. Policy Updates',
      content: [
        {
          subtitle: 'How You Will Be Notified',
          text: 'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by: posting the updated policy on this page with a revised "Last Updated" date, sending an email notification to the address associated with your account (for significant changes), and displaying a prominent notice on our platform homepage.'
        },
        {
          subtitle: 'Effective Date',
          text: 'This Privacy Policy is effective as of January 28, 2026. Your continued use of the platform after any changes indicates your acceptance of the updated Privacy Policy. If you do not agree with the updated policy, please discontinue use of the platform and contact us to delete your account.'
        }
      ]
    },
    {
      icon: Mail,
      title: '14. Contact Information',
      content: [
        {
          subtitle: 'Privacy Inquiries',
          text: 'If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:\n\nEmail: lmno1432@gmail.com\nSubject Line: Privacy Inquiry - Zyndex\n\nWe will respond to your inquiry within 30 days of receipt. For urgent privacy matters, please clearly mark your communication as "URGENT: Privacy Matter" in the subject line.'
        },
        {
          subtitle: 'Data Protection Officer',
          text: 'For matters specifically related to GDPR compliance or data protection rights in the European Union, you may contact our Data Protection Officer at lmno1432@gmail.com with the subject line "ATTN: Data Protection Officer".'
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
              <Shield className="size-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your privacy is critically important to us. This policy explains how we collect, use, protect, and handle your personal information.
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
            className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-8 mb-12 text-white shadow-xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Shield className="size-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Your Data Protection Rights</h3>
                <p className="text-orange-50 leading-relaxed">
                  Zyndex is committed to protecting your privacy and ensuring transparency in how we handle your data. 
                  We comply with GDPR, CCPA, and other applicable data protection regulations. You have the right to 
                  access, correct, delete, or export your personal data at any time. This platform is NOT intended for 
                  collecting Personally Identifiable Information (PII) or sensitive data beyond what is necessary for 
                  educational resource management.
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
                transition={{ duration: 0.5, delay: 0.1 * index }}
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
            <h2 className="text-3xl font-bold mb-4">Questions About Your Privacy?</h2>
            <p className="text-orange-50 text-lg mb-8 max-w-2xl mx-auto">
              We're here to help. If you have any questions, concerns, or would like to exercise your data protection rights, 
              please don't hesitate to contact us.
            </p>
            <a
              href="mailto:lmno1432@gmail.com?subject=Privacy%20Inquiry%20-%20Zyndex"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-orange-600 rounded-xl font-semibold hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl"
            >
              <Mail className="size-5" />
              Contact Privacy Team
            </a>
          </motion.div>
        </div>
      </div>
    </PublicLayout>
  );
}