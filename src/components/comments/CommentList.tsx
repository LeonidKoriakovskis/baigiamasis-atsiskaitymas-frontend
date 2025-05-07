import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CommentItem from './CommentItem';

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


interface CommentFromAPI {
  _id: string;
  text: string;
  author: {
    _id: string;
    name: string;
    email?: string;
  };
  taskId: string;
  timestamp: string;
}

interface CommentListProps {
  taskId: string;
  newComment?: Comment;
}

const CommentList: React.FC<CommentListProps> = ({ taskId, newComment }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [taskId, newComment]); 

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/comments/task/${taskId}`);
      
      
      const commentsData = Array.isArray(response.data) 
        ? response.data 
        : response.data.comments || [];
      
     
      const formattedComments = commentsData.map((comment: CommentFromAPI) => {
        return {
          _id: comment._id || '',
          text: comment.text || '',
          author: {
            _id: comment.author?._id || '',
            name: comment.author?.name || 'Unknown User'
          },
          taskId: comment.taskId || taskId,
          timestamp: comment.timestamp || new Date().toISOString()
        };
      });
      
      setComments(formattedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentUpdated = () => {
    fetchComments();
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments(comments.filter(comment => comment._id !== commentId));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-medium text-gray-900">Comments ({comments.length})</h3>
      
      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
      ) : (
        <ul className="space-y-3">
          {comments.map(comment => (
            <CommentItem 
              key={comment._id}
              comment={comment}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default CommentList; 