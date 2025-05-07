import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

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

interface UserData {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Member[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

 
  const canModifyProject = user && (user.role === 'admin' || user.role === 'manager');

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setIsLoading(true);
        
        
        let projectData = null;
        try {
          const projectRes = await axios.get(`/projects/${id}`);
          console.log('Project detail response:', projectRes.data);
          
          
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
          
          setIsLoading(false);
          return;
        }
        
        
        try {
          
          const tasksRes = await axios.get(`/tasks/project/${id}`);
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
          console.log('Correct tasks endpoint not available, trying fallback...');
          
          
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
        
        
        try {
          const membersRes = await axios.get(`/projects/${id}/members`);
          setMembers(membersRes.data.members || []);
        } catch {
          console.log('Members endpoint not available, using project members if available');
          
          if (projectData && projectData.members && Array.isArray(projectData.members)) {
            
            const basicMembers = projectData.members.map((member: string | MemberData, index: number) => {
              
              let uniqueId = '';
              
              if (typeof member === 'string') {
                uniqueId = member;
                return { 
                  id: uniqueId, 
                  name: 'Unknown', 
                  email: '', 
                  role: 'member' 
                };
              } else {
                uniqueId = member._id || member.id || `member-${index}`;
                return {
                  id: uniqueId,
                  name: member.name || 'Unknown',
                  email: member.email || '',
                  role: member.role || 'member'
                };
              }
            });
            
            
            const uniqueMembers = basicMembers.filter((member: Member, index: number, self: Member[]) => 
              index === self.findIndex((m: Member) => m.id === member.id)
            );
            
            setMembers(uniqueMembers);
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
      
      const dataToSend = {
        title: formData.name,
        description: formData.description
      };
      
      const response = await axios.put(`/projects/${id}`, dataToSend);
      
      
      let updatedProject = null;
      
      if (response.data.project) {
        updatedProject = response.data.project;
      } else if (response.data._id || response.data.id) {
        updatedProject = response.data;
      }
      
      if (updatedProject) {
        
        setProject({
          id: updatedProject._id || updatedProject.id || id,
          name: updatedProject.title || updatedProject.name || formData.name,
          title: updatedProject.title || updatedProject.name || formData.name,
          description: updatedProject.description || formData.description,
          status: updatedProject.status || project?.status || 'pending',
          createdAt: updatedProject.createdAt || project?.createdAt || new Date().toISOString(),
          updatedAt: updatedProject.updatedAt || new Date().toISOString()
        });
      }
      
      
      setIsEditing(false);
      
      
      toast.success('Project updated successfully');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await axios.delete(`/projects/${id}`);
        toast.success('Project deleted successfully');
        navigate('/projects');
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project');
      }
    }
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'; 
    
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

 
  const handleAddMember = async () => {
    try {
      
      const response = await axios.get('/users');
      const userData: UserData[] = response.data.users || response.data || [];
      
      if (!userData || !Array.isArray(userData) || userData.length === 0) {
        toast.error('No users available to add');
        return;
      }
      
      
      const formattedUsers = userData
        .filter((u: UserData) => {
          
          if (user && (u._id === user._id || u.id === user._id)) {
            return false;
          }
          
          
          return !members.some(member => 
            member.id === u._id || 
            member.id === u.id ||
            member.email === u.email
          );
        })
        .map((u: UserData) => ({
          id: u._id || u.id || '',
          name: u.name || u.username || u.email || 'Unknown User',
          email: u.email || '',
          role: u.role || 'member'
        }));
      
      if (formattedUsers.length === 0) {
        toast.info('All available users are already members of this project');
        return;
      }
      
      
      setAvailableUsers(formattedUsers);
      setShowMemberModal(true);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch available users');
    }
  };

  
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from this project?`)) {
      try {
       
        const projectRes = await axios.get(`/projects/${id}`);
        const projectData = projectRes.data.project || projectRes.data;
        
        
        const existingMembers = projectData.members || [];
        
        
        const updatedMembers = existingMembers.filter((member: string | MemberData) => {
          if (typeof member === 'string') {
            return member !== memberId;
          } else {
            return (member._id !== memberId && member.id !== memberId);
          }
        });
        
        
        await axios.put(`/projects/${id}`, {
          title: project?.name,
          description: project?.description,
          members: updatedMembers
        });
        
        
        setMembers(members.filter(member => member.id !== memberId));
        
        
        toast.success(`${memberName} has been removed from the project`);
      } catch (error) {
        console.error('Error removing member:', error);
        toast.error('Failed to remove member. Please try again.');
      }
    }
  };

  
  const handleAddTask = () => {
    
    toast.info('Redirecting to task creation form');
  };

  
  const handleMarkTaskComplete = async (taskId: string, taskTitle: string) => {
    try {
      
      await axios.put(`/tasks/${taskId}`, {
        status: 'done'
      });
      
      
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: 'done' } 
          : task
      ));
      
      
      toast.success(`Task "${taskTitle}" marked as complete`);
    } catch (error) {
      console.error('Error completing task:', error);
      
      
      try {
       
        await axios.put(`/tasks/project/${id}/${taskId}`, {
          status: 'done'
        });
        
        
        setTasks(tasks.map(task => 
          task.id === taskId 
            ? { ...task, status: 'done' } 
            : task
        ));
        
        
        toast.success(`Task "${taskTitle}" marked as complete`);
      } catch (secondError) {
        console.error('Error with alternative endpoint:', secondError);
        toast.error('Failed to complete task. Please try again.');
      }
    }
  };

  
  const addUserToProject = async (selectedUser: Member) => {
    try {
      
      const projectRes = await axios.get(`/projects/${id}`);
      const projectData = projectRes.data.project || projectRes.data;
      
      
      let existingMembers = projectData.members || [];
      
      
      if (Array.isArray(existingMembers)) {
        existingMembers = [...existingMembers];
      } else {
        existingMembers = [];
      }
      
      
      existingMembers.push({
        _id: selectedUser.id,
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role
      });
      
      
      await axios.put(`/projects/${id}`, {
        title: project?.name,
        description: project?.description,
        members: existingMembers
      });
      
      
      setMembers([...members, selectedUser]);
      
      
      setShowMemberModal(false);
      
      
      toast.success(`${selectedUser.name} has been added to the project`);
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member. Please try again.');
    }
  };

  
  const closeModal = () => {
    setShowMemberModal(false);
  };

  
  const MemberSelectionModal = () => {
    if (!showMemberModal) return null;
    
    return (
      <div className="fixed inset-0 z-10 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Add Team Member</h2>
            <button 
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {availableUsers.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              <ul className="divide-y divide-gray-200">
                {availableUsers.map(user => (
                  <li key={user.id} className="py-3 hover:bg-gray-50">
                    <button
                      onClick={() => addUserToProject(user)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.role && (
                            <p className={`text-xs mt-1 px-2 inline-flex leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                              {user.role}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">No users available to add</p>
          )}
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
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

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        project ? (
          <>
            {isEditing && canModifyProject ? (
              <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
                <div className="px-4 py-5 sm:px-6">
                  <h1 className="text-lg leading-6 font-medium text-gray-900">
                    Edit Project
                  </h1>
                </div>
                <div className="border-t border-gray-200">
                  <form onSubmit={handleSubmit} className="p-4">
                    <div className="mb-4">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Project Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        name="description"
                        id="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-2"
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
              <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {project.name}
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </p>
                  </div>
                  {canModifyProject && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <svg className="-ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <p className="text-sm text-gray-500 mb-4">
                    {project.description || 'No description provided'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Created: <span className="text-gray-900">{new Date(project.createdAt).toLocaleString()}</span></p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated: <span className="text-gray-900">{new Date(project.updatedAt).toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
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
        )
      )}

      {/* Tasks Section */}
      {project && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Tasks</h2>
            {canModifyProject && (
              <Link
                to={`/tasks/new?project=${id}`}
                onClick={handleAddTask}
                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Task
              </Link>
            )}
          </div>
          
          {tasks.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <div className="flex justify-between hover:bg-gray-50">
                      <Link to={`/tasks/${task.id}`} className="block flex-grow px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {task.title}
                          </p>
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
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              {task.description?.substring(0, 50) || 'No description'}{task.description?.length > 50 ? '...' : ''}
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
                      </Link>
                      {canModifyProject && (
                        <div className="flex items-center pr-4">
                          {task.status.toLowerCase() !== 'completed' && task.status.toLowerCase() !== 'done' && (
                            <button
                              onClick={() => handleMarkTaskComplete(task.id, task.title)}
                              className="text-xs text-green-600 hover:text-green-900"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-6 bg-white shadow overflow-hidden sm:rounded-md">
              <svg className="mx-auto h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found for this project</h3>
              {canModifyProject && (
                <div className="mt-6">
                  <Link
                    to={`/tasks/new?project=${id}`}
                    onClick={handleAddTask}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Task
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Members Section */}
      {project && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
            {canModifyProject && (
              <button
                onClick={handleAddMember}
                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Member
              </button>
            )}
          </div>
          
          {members.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {members.map((member, index) => (
                  <li key={`${member.id || ''}__${index}`} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(member.role)}`}>
                          {member.role}
                        </p>
                        {canModifyProject && member.id !== user?._id && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="ml-3 text-red-600 hover:text-red-900 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-6 bg-white shadow overflow-hidden sm:rounded-md">
              <svg className="mx-auto h-10 w-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members assigned to this project</h3>
              {canModifyProject && (
                <div className="mt-6">
                  <button
                    onClick={handleAddMember}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Member
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Member Selection Modal */}
      <MemberSelectionModal />
    </div>
  );
};

export default ProjectDetail;