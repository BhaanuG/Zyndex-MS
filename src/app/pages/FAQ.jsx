import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, Send } from 'lucide-react';
import PublicLayout from '@/app/components/PublicLayout';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'What is Zyndex?',
      answer: 'Zyndex is a comprehensive educational resource library platform that provides access to curated learning materials across various subjects and disciplines.',
    },
    {
      question: 'How do I access resources?',
      answer: 'Simply create a free account, browse our categories, and access any resource that interests you. Some premium resources may require additional permissions.',
    },
    {
      question: 'Is Zyndex free to use?',
      answer: 'Yes, Zyndex offers a free tier with access to a wide range of educational resources. We also offer premium features for enhanced functionality.',
    },
    {
      question: 'Can I upload my own resources?',
      answer: 'Admin users can upload and manage resources through the admin dashboard. Regular users can suggest resources through our contact form.',
    },
    {
      question: 'How are resources organized?',
      answer: 'Resources are organized by categories, subjects, and resource types. You can use our search and filter tools to find exactly what you need.',
    },
    {
      question: 'What file formats are supported?',
      answer: 'We support a wide range of file formats including PDF, DOCX, PPTX, videos, and interactive content. Check the upload guidelines for complete details.',
    },
    {
      question: 'How do I report an issue with a resource?',
      answer: 'You can report issues directly on the resource page using the feedback feature, or contact our support team through the Help Center.',
    },
    {
      question: 'Can I download resources?',
      answer: 'Yes, most resources can be downloaded for offline access. Download permissions depend on the resource type and your account level.',
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