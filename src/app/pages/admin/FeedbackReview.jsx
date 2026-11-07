import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Trash2, Mail, MessageSquare, Send, CheckCircle2, User, BookOpen, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import feedbackService from '@/services/api/feedbackService';

export default function FeedbackReview() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await feedbackService.getAllFeedback();
      setFeedbacks(response.feedback || []);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleDelete = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback entry?')) return;
    try {
      await feedbackService.deleteFeedback(feedbackId);
      setActionSuccess('Feedback deleted successfully.');
      setTimeout(() => setActionSuccess(''), 4000);
      await loadFeedback();
    } catch (err) {
      setActionError(err.message || 'Failed to delete feedback');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  const handleSendResponse = async (feedbackId) => {
    if (!responseText.trim()) {
      setActionError('Response comment cannot be empty.');
      setTimeout(() => setActionError(''), 4000);
      return;
    }

    try {
      setSubmittingResponse(true);
      setActionError('');
      const res = await feedbackService.respondToFeedback(feedbackId, responseText.trim());
      setActionSuccess(res.message || 'Response recorded and email sent to user successfully!');
      setRespondingId(null);
      setResponseText('');
      setTimeout(() => setActionSuccess(''), 5000);
      await loadFeedback();
    } catch (err) {
      setActionError(err.message || 'Failed to send response email');
      setTimeout(() => setActionError(''), 5000);
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Separate pending reviews from responded reviews
  const pendingFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => !f.adminResponse);
  }, [feedbacks]);

  const respondedFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => !!f.adminResponse);
  }, [feedbacks]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Feedback &amp; Review Management</h1>
            <p className="text-gray-600 mt-1">Review student ratings, feedback commentary, and dispatch email responses directly to user inboxes.</p>
          </div>
          <div className="px-4 py-2 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="size-4 text-orange-600" />
            <span>{feedbacks.length} Total Submissions</span>
          </div>
        </motion.div>

        {actionSuccess && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold">
            <CheckCircle2 className="size-5 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}

        {actionError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-semibold">
            <AlertCircle className="size-5 text-red-600 flex-shrink-0" />
            <span>{actionError}</span>
          </motion.div>
        )}

        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center text-slate-500 font-medium">
              Loading user feedback records...
            </div>
          ) : feedbacks.length === 0 ? (
            <motion.div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <MessageSquare className="size-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-medium text-slate-600 mb-1">No feedback yet</p>
              <p className="text-sm text-slate-400">Student and reader feedback on academic resources will appear here.</p>
            </motion.div>
          ) : (
            <>
              {/* SECTION 1: PENDING / UNRESPONDED FEEDBACK REVIEWS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-500" />
                    <h2 className="text-base font-bold text-gray-900">Pending Feedback Reviews</h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                    {pendingFeedbacks.length} Awaiting Response
                  </span>
                </div>

                {pendingFeedbacks.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl text-xs text-gray-500">
                    <CheckCircle className="size-6 text-emerald-500 mx-auto mb-1.5" />
                    All student reviews have been addressed! Responded reviews are filed below in the Responded Section.
                  </div>
                ) : (
                  pendingFeedbacks.map((feedback) => (
                    <motion.div key={feedback.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 hover:shadow-md transition-shadow" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          {/* User Credentials & Details */}
                          <div className="flex items-start gap-3.5 mb-3">
                            <div className={`size-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md flex-shrink-0 ${
                              feedback.isAnonymous 
                                ? 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-600/20' 
                                : 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-600/20'
                            }`}>
                              {feedback.isAnonymous ? '?' : (feedback.userName?.charAt(0)?.toUpperCase() || 'U')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-slate-900 text-base">{feedback.userName || 'Student Reader'}</p>
                                {feedback.isAnonymous ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                    🔒 Anonymous Feedback
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                    <Mail className="size-3 text-slate-500" />
                                    {feedback.email || 'reader@zyndex.com'}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3 text-slate-400" />
                                  {new Date(feedback.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                                {feedback.resourceTitle && (
                                  <span className="flex items-center gap-1 font-medium text-slate-700">
                                    <BookOpen className="size-3 text-orange-600" />
                                    {feedback.resourceTitle}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 bg-orange-50 text-orange-700 font-semibold rounded-md">
                                  {feedback.category || 'General Academics'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Star Rating */}
                          <div className="flex items-center gap-1.5 mb-3 bg-amber-50/60 w-fit px-3 py-1.5 rounded-xl border border-amber-100">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={`size-4 ${star <= (feedback.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-amber-900 ml-1">{feedback.rating || 0} / 5 Stars</span>
                          </div>

                          {/* Feedback Comment */}
                          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-slate-800 text-sm leading-relaxed">
                            <p className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-1">User Feedback:</p>
                            "{feedback.comment || feedback.message || 'No commentary provided.'}"
                          </div>
                        </div>

                        {/* Actions Header */}
                        <div className="flex items-center gap-2 self-end lg:self-start">
                          <button
                            onClick={() => {
                              setRespondingId(respondingId === feedback.id ? null : feedback.id);
                              setResponseText(feedback.adminResponse || '');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs rounded-xl transition-colors border border-orange-200 cursor-pointer"
                          >
                            <Send className="size-3.5" />
                            <span>Reply by Email</span>
                          </button>
                          <button
                            onClick={() => handleDelete(feedback.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                            title="Delete Feedback"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Response Drawer Form */}
                      <AnimatePresence>
                        {respondingId === feedback.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-slate-100 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Compose Response to {feedback.isAnonymous ? 'Anonymous Reader' : `${feedback.userName} (${feedback.email})`}
                              </label>
                              <span className="text-[11px] text-slate-500">
                                {feedback.isAnonymous 
                                  ? 'Response will be saved and visible to reader in review history (no direct email sent for anonymous reviews).' 
                                  : 'This comment will be emailed directly to the user\'s registered inbox.'}
                              </span>
                            </div>
                            <textarea
                              rows={3}
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Write your response to the user... (e.g. 'Thank you for your feedback! We have updated the textbook edition to fix the noted typos.')"
                              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 outline-none text-sm text-slate-800"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setRespondingId(null);
                                  setResponseText('');
                                }}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendResponse(feedback.id)}
                                disabled={submittingResponse || !responseText.trim()}
                                className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-600/20 disabled:opacity-50 transition-all cursor-pointer"
                              >
                                <Send className="size-3.5" />
                                <span>{submittingResponse ? 'Sending Email...' : 'Send Response Email'}</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                )}
              </div>

              {/* SECTION 2: RESPONDED SECTION (RECORD OF THE REVIEW) */}
              <div className="pt-8 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <h2 className="text-base font-bold text-gray-900">Responded Section</h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {respondedFeedbacks.length} Responded Reviews
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Completed student reviews that have already been responded to by email. Retains the original student review and feedback metadata.
                </p>

                {respondedFeedbacks.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl text-xs text-gray-400">
                    No responded reviews yet. Reviews will automatically move down here once you respond to them.
                  </div>
                ) : (
                  respondedFeedbacks.map((feedback) => (
                    <motion.div
                      key={feedback.id}
                      className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 opacity-95 hover:opacity-100 transition-opacity"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* User Credentials & Details */}
                          <div className="flex items-start gap-3.5 mb-3">
                            <div className={`size-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 ${
                              feedback.isAnonymous 
                                ? 'bg-gradient-to-br from-slate-600 to-slate-800' 
                                : 'bg-gradient-to-br from-emerald-600 to-teal-700'
                            }`}>
                              {feedback.isAnonymous ? '?' : (feedback.userName?.charAt(0)?.toUpperCase() || 'U')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-slate-800 text-sm">{feedback.userName || 'Student Reader'}</p>
                                {feedback.isAnonymous ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                    🔒 Anonymous Feedback
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                    <Mail className="size-3 text-slate-500" />
                                    {feedback.email || 'reader@zyndex.com'}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle className="size-3" /> Responded
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3 text-slate-400" />
                                  {new Date(feedback.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                                {feedback.resourceTitle && (
                                  <span className="flex items-center gap-1 font-medium text-slate-700">
                                    <BookOpen className="size-3 text-orange-600" />
                                    {feedback.resourceTitle}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold rounded-md">
                                  {feedback.category || 'General Academics'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Star Rating */}
                          <div className="flex items-center gap-1.5 mb-2.5 bg-amber-50/50 w-fit px-2.5 py-1 rounded-lg border border-amber-100">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={`size-3.5 ${star <= (feedback.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-amber-900 ml-1">{feedback.rating || 0} / 5 Stars</span>
                          </div>

                          {/* Student Feedback Record Only */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 text-sm leading-relaxed">
                            <p className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-1">Student Review Record:</p>
                            "{feedback.comment || feedback.message || 'No commentary provided.'}"
                          </div>
                        </div>

                        {/* Delete Action */}
                        <div className="flex items-center gap-2 self-end lg:self-start">
                          <button
                            onClick={() => handleDelete(feedback.id)}
                            className="p-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                            title="Delete Archived Feedback"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
