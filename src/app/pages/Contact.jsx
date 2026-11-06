import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock, MessageCircle, BookOpen } from 'lucide-react';
import feedbackService from '@/services/api/feedbackService';
import PublicLayout from '@/app/components/PublicLayout';

function SubmissionLoader({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50"
    >
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        {/* Additional floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
            style={{
              left: `${15 + i * 10}%`,
              top: `${25 + i * 8}%`,
            }}
            animate={{
              y: [0, -40, 0],
              x: [0, Math.sin(i) * 30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative text-center space-y-6 max-w-md px-6">
        {/* Logo Animation */}
        <motion.div className="flex justify-center">
          <div className="relative">
            {/* Glow Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-2xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Icon Container */}
            <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-2xl shadow-2xl">
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <BookOpen className="size-12 text-white" />
              </motion.div>
            </div>

            {/* Orbiting dots */}
            {[0, 120, 240].map((angle, i) => (
              <motion.div
                key={i}
                className="absolute w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: [
                    Math.cos((angle * Math.PI) / 180) * 60,
                    Math.cos(((angle + 360) * Math.PI) / 180) * 60,
                  ],
                  y: [
                    Math.sin((angle * Math.PI) / 180) * 60,
                    Math.sin(((angle + 360) * Math.PI) / 180) * 60,
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Brand */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Zyndex
          </h1>
          <div className="space-y-2">
            <p className="text-slate-700 font-semibold text-base leading-relaxed">{message}</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-slate-600 font-medium text-sm">Processing</p>
              {/* Moving dots */}
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-orange-600 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{
                duration: 15,
                ease: "easeInOut"
              }}
            />
          </div>
          <motion.p
            className="text-xs text-slate-500 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Please wait while we process your request...
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      await feedbackService.submitContact(formData);

      // Show loader with success message
      const msg = `Thank you, ${formData.name}! Your message about "${formData.subject}" has been sent successfully. We'll respond to ${formData.email} within 24-48 hours.`;
      setLoaderMessage(msg);
      setShowLoader(true);
      
      setTimeout(() => {
        setShowLoader(false);
        setSuccess(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        
        setTimeout(() => setSuccess(false), 5000);
      }, 15000); // Changed to 15 seconds
    } catch (err) {
      console.error('Contact send failed:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      items: [
        '2400030952@kluniversity.in',
        '2400030485@kluniversity.in',
        '2400030872@kluniversity.in'
      ],
      gradient: 'from-orange-500 to-orange-600',
      shadowColor: 'orange'
    },
    {
      icon: Phone,
      title: 'Phone',
      items: [
        '+91 8897337687',
        'Mon-Fri, 9AM-5PM IST'
      ],
      gradient: 'from-amber-500 to-orange-600',
      shadowColor: 'amber'
    },
    {
      icon: MapPin,
      title: 'Address',
      items: [
        'KL University',
        'Vijayawada'
      ],
      gradient: 'from-red-500 to-orange-600',
      shadowColor: 'red'
    }
  ];

  return (
    <PublicLayout>
      <div className="py-24 px-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 right-20 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-20 left-20 w-96 h-96 bg-red-200/20 rounded-full blur-3xl"
            animate={{
              scale: [1.3, 1, 1.3],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-full text-sm font-semibold mb-8 shadow-lg shadow-orange-100/50"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              style={{
                boxShadow: '0 4px 24px -8px rgba(249, 115, 22, 0.25), 0 0 0 1px rgba(249, 115, 22, 0.1) inset'
              }}
            >
              <MessageCircle className="size-4 text-orange-600" />
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Contact Us
              </span>
            </motion.div>
            
            <motion.h1 
              className="text-6xl md:text-7xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <span className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent"
                style={{ textShadow: '0 2px 40px rgba(249, 115, 22, 0.1)' }}
              >
                Get in Touch
              </span>
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Have questions or feedback? We'd love to hear from you.
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Contact Form */}
            <motion.div 
              className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-10 lg:p-12 overflow-hidden border border-white/20"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{
                boxShadow: '0 25px 70px -20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
              }}
            >
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-orange-400/20 to-transparent rounded-full blur-3xl" />
              
              <div className="relative">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Send us a Message</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="w-full px-5 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                      style={{
                        boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      className="w-full px-5 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                      style={{
                        boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="What's this about?"
                      className="w-full px-5 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                      style={{
                        boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Message</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Your message..."
                      rows={5}
                      className="w-full px-5 py-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none shadow-sm hover:shadow-md"
                      style={{
                        boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.05)'
                      }}
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={sending}
                    className="w-full py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all"
                    whileHover={{ scale: sending ? 1 : 1.02, y: sending ? 0 : -2 }}
                    whileTap={{ scale: sending ? 1 : 0.98 }}
                    style={{
                      boxShadow: '0 10px 30px -8px rgba(249, 115, 22, 0.4)'
                    }}
                  >
                    <Send className="size-5" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </motion.button>

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-green-50/80 backdrop-blur-sm border border-green-200 text-green-700 rounded-2xl text-sm flex items-center gap-3 shadow-sm"
                    >
                      <CheckCircle2 className="size-5 flex-shrink-0" />
                      <span>Message sent successfully! We'll get back to you soon.</span>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 rounded-2xl text-sm shadow-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </form>
              </div>
            </motion.div>

            {/* Contact Information */}
            <div className="space-y-6">
              <motion.div 
                className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-10 lg:p-12 overflow-hidden border border-white/20"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                style={{
                  boxShadow: '0 25px 70px -20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
                }}
              >
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-purple-400/20 to-transparent rounded-full blur-3xl" />
                
                <div className="relative">
                  <h2 className="text-3xl font-bold text-gray-900 mb-10">Contact Information</h2>
                  
                  <div className="space-y-8">
                    {contactInfo.map((info, index) => (
                      <motion.div 
                        key={index}
                        className="flex gap-5 group"
                        whileHover={{ x: 5 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                      >
                        <motion.div 
                          className={`size-16 bg-gradient-to-br ${info.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl shadow-${info.shadowColor}-500/40`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          style={{
                            boxShadow: `0 15px 40px -10px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset`
                          }}
                        >
                          <info.icon className="size-7 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">{info.title}</h3>
                          {info.items.map((item, i) => (
                            <p key={i} className="text-sm text-gray-600 mb-1.5 leading-relaxed">{item}</p>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="relative bg-gradient-to-br from-orange-50/80 to-amber-50/80 backdrop-blur-xl rounded-3xl p-10 overflow-hidden border border-orange-100/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                style={{
                  boxShadow: '0 20px 60px -15px rgba(249, 115, 22, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.3) inset'
                }}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-300/30 rounded-full blur-3xl" />
                
                <div className="relative flex gap-5">
                  <motion.div 
                    className="size-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl shadow-orange-500/40"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    style={{
                      boxShadow: '0 15px 40px -10px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                    }}
                  >
                    <Clock className="size-7 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Response Time</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      We typically respond to all inquiries within 24-48 hours during business days. 
                      For urgent matters, please use the phone number provided.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Loader */}
      <AnimatePresence>
        {showLoader && <SubmissionLoader message={loaderMessage} />}
      </AnimatePresence>
    </PublicLayout>
  );
}
