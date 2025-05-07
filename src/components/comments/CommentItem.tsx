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

interface CommentItemProps {
  comment: Comment;
  onCommentUpdated: () => void;
  onCommentDeleted: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  onCommentUpdated, 
  onCommentDeleted 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const isCommentAuthor = user?._id === comment.author._id;
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  
  const canModify = isCommentAuthor || isAdmin || isManager;

  const handleEdit = async () => {
    if (!editText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (!canModify) {
      toast.error('You do not have permission to edit this comment');
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.put(`/comments/${comment._id}`, {
        text: editText
      });
      
      setIsEditing(false);
      onCommentUpdated();
      toast.success('Comment updated successfully');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canModify) {
      toast.error('You do not have permission to delete this comment');
      return;
    }

    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        setIsSubmitting(true);
        await axios.delete(`/comments/${comment._id}`);
        
        onCommentDeleted(comment._id);
        toast.success('Comment deleted successfully');
      } catch (error) {
        console.error('Error deleting comment:', error);
        toast.error('Failed to delete comment');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <li className="bg-gray-50 rounded-lg p-4">
      <div className="flex justify-between">
        <span className="font-medium">{comment.author.name}</span>
        <span className="text-sm text-gray-500">{formatDate(comment.timestamp)}</span>
      </div>
      
      {isEditing ? (
        <div className="mt-2">
          <textarea
            rows={3}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 rounded-md p-2"
            disabled={isSubmitting}
          />
          <div className="mt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditText(comment.text);
              }}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-gray-700">{comment.text}</p>
          
          {canModify && (
            <div className="mt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs text-indigo-600 hover:text-indigo-900"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs text-red-600 hover:text-red-900"
                disabled={isSubmitting}
              >
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
};

export default CommentItem; 