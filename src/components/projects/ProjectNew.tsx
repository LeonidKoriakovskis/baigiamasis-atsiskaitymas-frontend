import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface User {
  _id: string;
  name: string;
  email: string;
}

const ProjectNew: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending'
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userError, setUserError] = useState('');

  // Fetch available users for member assignment
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      setUserError('');
      try {
        // Try different endpoints for user data
        let response;
        try {
          response = await axios.get('/users');
          console.log('Users response:', response.data);
        } catch (firstErr) {
          console.error('Error fetching from /users:', firstErr);
          try {
            // Try alternative endpoint
            response = await axios.get('/auth/users');
            console.log('Users from auth endpoint:', response.data);
          } catch (secondErr) {
            console.error('Error fetching from /auth/users:', secondErr);
            setUserError('Could not load users. You can still create the project.');
          }
        }
        
        if (response && response.data) {
          // Try to extract users from different possible response formats
          const users = response.data.users || 
                      response.data.data || 
                      (Array.isArray(response.data) ? response.data : []);
          
          console.log('Processed users:', users);
          setAvailableUsers(users.filter((u: User & { id?: string }) => u && (u._id || u.id)));
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setUserError('Could not load users. You can still create the project.');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMemberChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setSelectedMembers(selectedOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Add the user ID as createdBy and include members
      const projectData = {
        ...formData,
        createdBy: user?._id, // Using _id as per User interface in AuthContext
        members: [...selectedMembers, user?._id] // Add current user and selected members
      };
      
      const response = await axios.post('/projects', projectData);
      // Check the response structure and navigate to the correct path
      if (response.data && response.data.project) {
        navigate(`/projects/${response.data.project.id || response.data.project._id}`);
      } else if (response.data && response.data._id) {
        // Alternative response format
        navigate(`/projects/${response.data._id}`);
      } else {
        // If can't determine ID, just go back to projects list
        navigate('/projects');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Project</h1>
        
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter project title"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe your project"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="pending">Pending</option>
              <option value="in progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="members" className="block text-sm font-medium text-gray-700 mb-1">
              Team Members
            </label>
            {isLoadingUsers ? (
              <div className="py-2 px-3 border border-gray-300 rounded-md text-gray-500">
                Loading users...
              </div>
            ) : userError ? (
              <div>
                <div className="py-2 px-3 border border-gray-300 rounded-md text-red-500 mb-1">
                  {userError}
                </div>
                <p className="text-xs text-gray-500">You will be added as the only member.</p>
              </div>
            ) : availableUsers.length > 0 ? (
              <>
                <select
                  id="members"
                  multiple
                  value={selectedMembers}
                  onChange={handleMemberChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  size={Math.min(4, availableUsers.length)}
                >
                  {availableUsers.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple members</p>
              </>
            ) : (
              <div className="py-2 px-3 border border-gray-300 rounded-md text-gray-500">
                No other users available. You will be the only project member.
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectNew; 