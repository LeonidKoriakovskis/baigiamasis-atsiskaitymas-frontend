import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

interface Comment {
  _id: string;
  text: string;
  author: {
    _id: string;
    name: string;
  };
  taskId: string;
  timestamp: string;
}

interface Task {
  id: string;
  assignedTo?: {
    id?: string;
    name?: string;
  };
}

interface CommentFormProps {
  taskId: string;
  onCommentAdded: (comment: Comment) => void;
  taskData?: Task;
}

const CommentForm: React.FC<CommentFormProps> = ({ taskId, onCommentAdded, taskData }) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  // Check if user can add comments
  const canAddComments = user && (
    user.role === 'admin' || 
    (user.role === 'manager' && (
      // Manager is assigned to the task
      (taskData?.assignedTo?.id === user._id) ||
      // Task doesn't have assignment data
      !taskData
    ))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (!user || !user._id) {
      toast.error('You must be logged in to comment');
      return;
    }

    if (!canAddComments) {
      toast.error('You do not have permission to add comments');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await axios.post(`/comments/task/${taskId}`, {
        text: commentText
      });

      
      const newComment = response.data;

      
      const formattedComment: Comment = {
        _id: newComment._id || '',
        text: newComment.text || commentText,
        author: {
          _id: newComment.author?._id || user._id,
          name: newComment.author?.name || user.name
        },
        taskId: taskId,
        timestamp: newComment.timestamp || new Date().toISOString()
      };

      
      setCommentText('');

     
      onCommentAdded(formattedComment);
      
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  
  if (!canAddComments) {
    return null;
  }

  return (
    <div className="mt-6 bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Add a Comment
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Share your thoughts or feedback on this task.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-5">
          <div className="shadow-sm">
            <textarea
              rows={3}
              name="comment"
              id="comment"
              className="block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md p-2"
              placeholder="Your comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
            ></textarea>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Add Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentForm; 