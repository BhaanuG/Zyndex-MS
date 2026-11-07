import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, Send } from 'lucide-react';
import PublicLayout from '@/app/components/PublicLayout';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'What is Zyndex?',
      answer: 'Zyndex is a state-of-the-art academic digital library and research repository platform that provides scholars, university students, educators, and researchers with instantaneous access to curated learning materials, peer-reviewed textbooks, guides, and academic assets.',
    },
    {
      question: 'How do I access and read resources on Zyndex?',
      answer: 'Simply create a free account, browse academic categories (such as AI, Machine Learning, Computer Science, and Mathematics), and open any material in our web-based viewer. Reading modes, active chapter navigation, and search indexes are built directly into the reading interface.',
    },
    {
      question: 'What are the account roles available on registration?',
      answer: 'When signing up, you can select the role that matches your academic profile: Student, Teacher / Educator, Researcher, Professional, or General Reader. This customizes your academic experience, recommendations, and role entitlements across Zyndex.',
    },
    {
      question: 'How does 2-Step OTP Security Verification work?',
      answer: 'Zyndex uses an advanced 2-step security verification system powered by JavaMail and HMAC tokens. Upon login or account creation, a single-use 4-digit code is dispatched to your registered email. Entering the digits activates interactive geometric shape transformations (Circle, Square, Diamond, Triangle, and Hexagon) that confirm your secure cryptographic handshake.',
    },
    {
      question: 'How does the UPI QR and UTR payment verification operate?',
      answer: 'Zyndex supports fast, transparent Indian UPI payments (Google Pay, PhonePe, Paytm, BHIM, and bank apps). When upgrading your tier, a dynamic merchant QR is presented securely in the checkout modal. After completing the transfer, enter your 12-digit bank UTR reference number. Our automated billing system and administrators verify the UTR and activate your subscription.',
    },
    {
      question: 'Is there any automatic debit or hidden auto-renewal charge?',
      answer: 'No. Zyndex adheres to a transparent, non-recurring billing model. We never store credit card secrets or trigger surprise auto-debits. When your subscription period concludes, your account gracefully transitions to our Free Academic Plan without penalties, and advance reminder notices are delivered 24 hours prior.',
    },
    {
      question: 'Can I download textbooks and papers for offline study?',
      answer: 'Yes! Download entitlements are governed by subscription plans. Paid tiers allow full offline PDF downloads with watermarking, while Free tier readers can preview and study documents within our secure in-browser reader.',
    },
    {
      question: 'How do Admin Requests and privileges work?',
      answer: 'Administrative rights require strict verification. Prospective faculty and administrators submit an Admin Access Request from our portal with their official institution details. Zyndex executive administrators review, approve, or decline applications with instant email audit dispatches.',
    },
    {
      question: 'How is my reading time and activity calculated in analytics?',
      answer: 'Zyndex employs idle-protected, visibility-aware telemetry. Reading duration only logs while your browser tab is active and visible. If you minimize or close the tab, the session safely finalizes via sendBeacon without inflating reading minutes or generating duplicate records.',
    },
    {
      question: 'What should I do if I did not receive my verification OTP email?',
      answer: 'Check your spam or junk folder first. OTPs are valid for 2 minutes. If needed, click the "Resend OTP" button on the authenticator page to generate a brand-new code. Make sure your email provider allows messages from support@zyndex.com or our official notification address.',
    },
    {
      question: 'How do I submit reviews, ratings, or report content issues?',
      answer: 'Every academic resource features a feedback module where authenticated readers can submit 1-to-5 star ratings and detailed reviews. When Zyndex administrators review or reply to your feedback, an automatic email notification is dispatched to you containing your original rating, your review notes, and the administrator\'s response.',
    },
    {
      question: 'Can I use Zyndex on multiple devices simultaneously?',
      answer: 'Yes. You can access Zyndex on your laptop, desktop, tablet, and mobile smartphone. Every login is safeguarded by 2-step email verification with an optional 24-hour trusted device cookie so you do not need to re-verify constantly on your primary study device.',
    },
    {
      question: 'What happens if my payment UTR is pending review?',
      answer: 'UPI payments with a valid 12-digit bank UTR undergo automated reconciliation and swift administrator verification (usually within 15 to 30 minutes). During initial submission, a 2-minute status hold modal allows rapid automated confirmation before routing to your billing dashboard.',
    },
    {
      question: 'What academic subject categories are available on Zyndex?',
      answer: 'Zyndex curates resources across core academic and professional disciplines: Artificial Intelligence, Machine Learning, Computer Science, Physics, Chemistry, Mathematics, Economics, History, Literature, and Biology. Each category features dedicated sub-domains, syllabus filters, and reading milestones.',
    },
    {
      question: 'What should I do if I forget my password or change my email?',
      answer: 'Visit the Forgot Password page from the Login portal. Enter your registered email address to receive an instant, single-use password reset link and verification code. For email migrations, reach out to our support desk with your current identity credentials.',
    },
    {
      question: 'How does Zyndex stream PDF previews efficiently without lag?',
      answer: 'Zyndex utilizes an enterprise backend powered by Spring Boot and Apache PDFBox with in-memory page slicing. Rather than downloading heavy 100MB+ documents to your browser, preview pages are rendered and streamed dynamically on-demand, ensuring ultra-fast load times even on mobile connections.',
    },
    {
      question: 'How does Zyndex handle academic integrity and citations?',
      answer: 'Every cataloged resource includes formatted citation references (APA, MLA, IEEE, and Chicago styles). We encourage transparent scholarly citation and strictly prohibit commercial redistribution or automated data mining without authorization.',
    },
    {
      question: 'What happens to my account data if my subscription ends?',
      answer: 'Nothing is lost. Your account automatically defaults to our Free Academic Reader tier. Your bookmarks, custom reading lists, notes, and profile history remain completely preserved and accessible indefinitely.',
    },
    {
      question: 'How can I contact support and what is the typical turnaround time?',
      answer: 'You can submit an inquiry via our Contact Us portal or email support directly at support@zyndex.com. Our administrative and support desk operates with average response times under 24 hours for all learner inquiries and under 2 hours for payment assistance.',
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <PublicLayout>
      <div className="py-16 px-6 min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-orange-50/20">
        <div className="max-w-3xl mx-auto">
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <HelpCircle className="size-4" />
              FAQ
            </motion.div>
            
            <h1 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Frequently Asked Questions</span>
            </h1>
            <p className="text-xl text-gray-600">Find answers to common questions about Zyndex</p>
          </motion.div>

          {/* FAQ List */}
          <div className="space-y-4 mb-12">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-2xl shadow-lg overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-orange-50/50 transition-colors group"
                >
                  <span className="font-semibold text-gray-900 pr-4 text-lg">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="flex-shrink-0"
                  >
                    <div className="size-10 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                      <ChevronDown className="size-5 text-orange-600" />
                    </div>
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-8 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Still Have Questions */}
          <motion.div 
            className="relative bg-gradient-to-br from-orange-600 to-red-600 rounded-3xl p-10 text-center overflow-hidden shadow-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <motion.div
                className="size-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
              >
                <Send className="size-8 text-white" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-4">Still have questions?</h2>
              <p className="text-orange-100 mb-8 text-lg max-w-md mx-auto">
                Can't find the answer you're looking for? Please contact our support team.
              </p>
              
              <motion.a
                href="/Zyndex/About/Contact"
                className="inline-block px-8 py-4 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-lg"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Contact Support
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>
    </PublicLayout>
  );
}