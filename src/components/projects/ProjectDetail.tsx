import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Project {
  id: string;
  _id?: string;
  name: string;
  title?: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  _id?: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
}

interface TaskApiResponse {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  projectId?: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MemberData {
  _id?: string;
  id?: string;
  name?: string; 
  email?: string;
  role?: string;
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setIsLoading(true);
        
        // Fetch project details first
        let projectData = null;
        try {
          const projectRes = await axios.get(`/projects/${id}`);
          console.log('Project detail response:', projectRes.data);
          
          // Handle response which could be the project directly or nested
          projectData = projectRes.data.project || projectRes.data;
          
          if (projectData) {
            console.log('Project data to use:', projectData);
            setProject({
              id: projectData._id || projectData.id || id,
              name: projectData.title || projectData.name || 'Untitled Project',
              title: projectData.title || projectData.name,
              description: projectData.description || '',
              status: projectData.status || 'pending',
              createdAt: projectData.createdAt || new Date().toISOString(),
              updatedAt: projectData.updatedAt || projectData.createdAt || new Date().toISOString()
            });
            
            setFormData({
              name: projectData.title || projectData.name || '',
              description: projectData.description || ''
            });
          } else {
            console.error('Project data is empty or invalid');
            setIsLoading(false);
            return;
          }
        } catch (projectError) {
          console.error('Error fetching project:', projectError);
          // If we can't fetch the project, we can't continue
          setIsLoading(false);
          return;
        }
        
        // Try to fetch tasks, but handle 404s gracefully
        try {
          // Use the correct tasks endpoint based on backend implementation
          const tasksRes = await axios.get(`/tasks/project/${id}`);
          const tasksData = tasksRes.data.tasks || tasksRes.data || [];
          
          // Ensure we have an array of tasks with valid structure
          if (Array.isArray(tasksData)) {
            const formattedTasks = tasksData.map((task: TaskApiResponse) => ({
              id: task._id || task.id || '',
              title: task.title || 'Untitled Task',
              description: task.description || '',
              status: task.status || 'pending',
              priority: task.priority || 'medium',
              dueDate: task.dueDate || new Date().toISOString()
            }));
            setTasks(formattedTasks);
          } else {
            setTasks([]);
          }
        } catch {
          console.log('Correct tasks endpoint not available, trying fallback...');
          
          // Try fallback endpoint for backward compatibility
          try {
            const tasksRes = await axios.get(`/projects/${id}/tasks`);
            const tasksData = tasksRes.data.tasks || tasksRes.data || [];
            
            if (Array.isArray(tasksData)) {
              const formattedTasks = tasksData.map((task: TaskApiResponse) => ({
                id: task._id || task.id || '',
                title: task.title || 'Untitled Task',
                description: task.description || '',
                status: task.status || 'pending', 
                priority: task.priority || 'medium',
                dueDate: task.dueDate || new Date().toISOString()
              }));
              setTasks(formattedTasks);
            } else {
              setTasks([]);
            }
          } catch {
            console.log('Tasks endpoints not available, setting empty tasks list');
            setTasks([]);
          }
        }
        
        // Try to fetch members, but handle 404s gracefully
        try {
          const membersRes = await axios.get(`/projects/${id}/members`);
          setMembers(membersRes.data.members || []);
        } catch {
          console.log('Members endpoint not available, using project members if available');
          // Try to use project.members if it exists
          if (projectData && projectData.members && Array.isArray(projectData.members)) {
            // If members are just IDs, we can't display full info
            const basicMembers = projectData.members.map((member: string | MemberData) => {
              if (typeof member === 'string') {
                return { id: member, name: 'Unknown', email: '', role: 'member' };
              } else {
                return {
                  id: member._id || member.id || '',
                  name: member.name || 'Unknown',
                  email: member.email || '',
                  role: member.role || 'member'
                };
              }
            });
            setMembers(basicMembers);
          } else {
            setMembers([]);
          }
        }
      } catch (error) {
        console.error('Error fetching project details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectDetails();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Only send the fields that exist in the backend model
      // Rename 'name' to 'title' as expected by the backend
      const dataToSend = {
        title: formData.name,
        description: formData.description
      };
      
      const response = await axios.put(`/projects/${id}`, dataToSend);
      // Update the project in state
      setProject(response.data.project);
      setIsEditing(false);
      
      // Redirect to refresh the page with updated data
      navigate(`/projects/${id}`, { replace: true });
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await axios.delete(`/projects/${id}`);
        navigate('/projects');
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'; // Default if status is undefined
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'developer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Project not found. It may have been deleted or you don't have access to it.
              </p>
            </div>
          </div>
        </div>
        <Link to="/projects" className="text-indigo-600 hover:text-indigo-500">
          &larr; Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/projects" className="text-indigo-600 hover:text-indigo-500">
          &larr; Back to Projects
        </Link>
      </div>

      {isEditing ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Project</h3>
          </div>
          <div className="border-t border-gray-200">
            <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    name="description"
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-2xl leading-6 font-bold text-gray-900">{project.name || project.title}</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{project.description}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(project.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(project.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
          <Link 
            to={`/projects/${id}/tasks/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Task
          </Link>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {tasks.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {tasks.map((task, index) => (
                <li key={`task-${task.id || index}`}>
                  <Link to={`/tasks/${task._id || task.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">{task.title}</p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </p>
                          <p className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {task.description.length > 100 
                              ? `${task.description.substring(0, 100)}...` 
                              : task.description}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <p>
                            Due <time dateTime={task.dueDate}>{new Date(task.dueDate).toLocaleDateString()}</time>
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-gray-500">
              No tasks found for this project.
            </div>
          )}
        </div>
      </div>

      {/* Team Members Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
          <Link 
            to={`/projects/${id}/members/add`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Member
          </Link>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {members.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {members.map((member, index) => (
                <li key={`member-${index}-${member.id || 'unknown'}`}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(member.role)}`}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-gray-500">
              No team members found for this project.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;