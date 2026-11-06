import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, Trash2 } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import feedbackService from '@/services/api/feedbackService';

export default function FeedbackReview() {
  const [feedbacks, setFeedbacks] = useState([]);

  const loadFeedback = async () => {
    try {
      const response = await feedbackService.getAllFeedback();
      setFeedbacks(response.feedback || []);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleDelete = async (feedbackId) => {
    if (!window.confirm('Delete this feedback?')) return;
    await feedbackService.deleteFeedback(feedbackId);
    await loadFeedback();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-semibold text-gray-900">Feedback Review</h1>
          <p className="text-gray-600 mt-1">Review user feedback submitted through the backend.</p>
        </motion.div>

        <div className="space-y-4">
          {feedbacks.length === 0 ? (
            <motion.div className="bg-white rounded-xl shadow-md p-16 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-lg font-medium mb-2 text-gray-500">No feedback yet</p>
            </motion.div>
          ) : (
            feedbacks.map((feedback) => (
              <motion.div key={feedback.id} className="bg-white rounded-xl shadow-md p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="size-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {feedback.userName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{feedback.userName}</p>
                        <p className="text-sm text-gray-500">{new Date(feedback.date).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`size-4 ${star <= (feedback.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
                    </div>
                    <p className="text-gray-700 mb-2">{feedback.comment}</p>
                    <p className="text-sm text-gray-500">Category: <span className="font-medium">{feedback.category}</span></p>
                  </div>
                  <button onClick={() => handleDelete(feedback.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
