import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CommentList from '../comments/CommentList';
import CommentForm from '../comments/CommentForm';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  assignedTo: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TaskResponse {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  projectId?: string;
  assignedTo?: string | {
    id?: string;
    _id?: string;
    name?: string;
  };
}

interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectMember {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
}

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

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projectMembers, setProjectMembers] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState<Comment | undefined>(undefined);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    dueDate: '',
    assignedToId: ''
  });

  const canModifyTask = user && (
    user.role === 'admin' || 
    (user.role === 'manager' && (
      (task?.assignedTo?.id === user._id) || 
      (projectMembers.some(member => member.id === user._id))
    ))
  );

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
      
        let taskResponse = null;
        let projectData = null;
        let foundTask = false;
        
   
        let allProjects = [];
        try {
          const projectsResponse = await axios.get('/projects');
          allProjects = Array.isArray(projectsResponse.data) 
            ? projectsResponse.data 
            : projectsResponse.data.projects || [];
          console.log('All projects fetched:', allProjects);
        } catch (projectsError) {
          console.error('Error fetching all projects:', projectsError);
        }
        
        try {
        
          taskResponse = await axios.get(`/tasks/${id}`);
          foundTask = true;
          
          
          if (taskResponse.data && (taskResponse.data.projectId || taskResponse.data.project)) {
            const projectId = taskResponse.data.projectId || taskResponse.data.project;
            projectData = allProjects.find((p: { _id?: string; id?: string }) => (p._id === projectId || p.id === projectId));
            
            if (!projectData) {
              try {
                const projectRes = await axios.get(`/projects/${projectId}`);
                projectData = projectRes.data.project || projectRes.data;
                console.log('Project fetched for task:', projectData);
              } catch (err) {
                console.error('Error fetching project for task:', err);
              }
            }
          }
        } catch (directError) {
          console.error('Error fetching task directly:', directError);
          
        
          if (allProjects.length > 0) {
          
            for (const project of allProjects) {
              if (foundTask) break;
              
              try {
                const projectId = project._id || project.id;
                projectData = project; 
                const projectTasksResponse = await axios.get(`/tasks/project/${projectId}`);
                const projectTasks = projectTasksResponse.data.tasks || projectTasksResponse.data || [];
                
                if (Array.isArray(projectTasks)) {
                
                  const matchingTask = projectTasks.find((task: TaskResponse) => 
                    (task._id === id || task.id === id)
                  );
                  
                  if (matchingTask) {
                    taskResponse = { data: { task: matchingTask } };
                    foundTask = true;
                    break;
                  }
                }
              } catch {
                console.log(`No tasks found for project ${project._id || project.id}`);
              }
            }
          }
        }
        
      
        await fetchUsers();
        
        if (foundTask && taskResponse?.data) {
      
          let taskData = null;
          
          if (taskResponse.data.task) {
         
            taskData = taskResponse.data.task;
          } else if (taskResponse.data._id || taskResponse.data.id) {
        
            taskData = taskResponse.data;
          }
          
          if (taskData) {
        
            let projectName = 'Unknown Project';
           
            const rawProjectId = taskData.projectId || taskData.project || '';
           
            const projectId = typeof rawProjectId === 'object' && rawProjectId !== null 
              ? (rawProjectId._id || rawProjectId.id || '') 
              : rawProjectId;
            
            console.log('Project ID extracted for task:', projectId, 'type:', typeof projectId);
            
           
            if (taskData.projectName) {
              projectName = taskData.projectName;
            } else if (projectId) {
           
              const foundProject = allProjects.find((p: { _id?: string; id?: string; title?: string; name?: string }) => 
                p._id === projectId || p.id === projectId
              );
              
              if (foundProject) {
                projectData = foundProject;
                projectName = foundProject.title || foundProject.name || 'Unknown Project';
                console.log('Found project in list:', projectName);
              }
              
              else if (projectData) {
                projectName = projectData.title || projectData.name || 'Unknown Project';
                console.log('Using project data from earlier fetch:', projectName);
              } 
              
              else {
                try {
                  console.log('Trying to fetch project directly with ID:', projectId);
                 
                  if (typeof projectId === 'string' && projectId.length > 0) {
                    const projectRes = await axios.get(`/projects/${projectId}`);
                    projectData = projectRes.data.project || projectRes.data;
                    projectName = projectData.title || projectData.name || 'Unknown Project';
                    console.log('Project fetched directly:', projectName);
                  } else {
                    console.log('Invalid project ID, cannot fetch project');
                    toast.warning('Could not load related project details');
                  }
                } catch (err) {
                  console.error('Error fetching project details:', err);
                  toast.warning('Could not load related project details');
                }
              }
            }
            
            console.log('Final project name to use:', projectName);
            
            
            const standardizedTask = {
              id: taskData._id || taskData.id || id,
              title: taskData.title || 'Untitled Task',
              description: taskData.description || '',
              status: taskData.status || 'pending',
              priority: taskData.priority || 'medium',
              dueDate: taskData.dueDate || new Date().toISOString(),
              projectId: projectId,
              projectName: projectName,
              assignedTo: typeof taskData.assignedTo === 'string' 
                ? { id: taskData.assignedTo, name: 'Assigned User' }
                : taskData.assignedTo || { id: '', name: 'Unassigned' },
              createdAt: taskData.createdAt || new Date().toISOString(),
              updatedAt: taskData.updatedAt || taskData.createdAt || new Date().toISOString()
            };
            
            console.log('Standardized task with project name:', standardizedTask);
            setTask(standardizedTask);
            
            setFormData({
              title: standardizedTask.title,
              description: standardizedTask.description,
              status: standardizedTask.status,
              priority: standardizedTask.priority,
              dueDate: standardizedTask.dueDate.split('T')[0],
              assignedToId: typeof taskData.assignedTo === 'string'
                ? taskData.assignedTo
                : (taskData.assignedTo?.id || taskData.assignedTo?._id || '')
            });
          } else {
            console.error('Could not parse task data from response:', taskResponse.data);
            toast.error('Error loading task details');
          }
        } else {
          
          console.error('Task not found by any method');
          toast.error('Task not found');
        }

        // Fetch the project members if we have a project ID
        if (task && task.projectId) {
          try {
            const projectId = typeof task.projectId === 'object' && task.projectId !== null
              ? ((task.projectId as { _id?: string; id?: string })._id || (task.projectId as { _id?: string; id?: string }).id || '')
              : task.projectId;
              
            if (typeof projectId === 'string' && projectId.length > 0) {
              const projectResponse = await axios.get(`/projects/${projectId}`);
              const projectData = projectResponse.data.project || projectResponse.data;
              
              // Get project members
              if (projectData && projectData.members) {
                const membersList = Array.isArray(projectData.members) 
                  ? projectData.members
                  : [];
                  
                const formattedMembers = membersList.map((member: ProjectMember | string) => {
                  if (typeof member === 'string') {
                    // If member is just an ID
                    return { id: member, name: 'Unknown Member' };
                  } else {
                    // If member is an object
                    return { 
                      id: member._id || member.id || '', 
                      name: member.name || 'Unknown Member'
                    };
                  }
                });
                
                setProjectMembers(formattedMembers);
              }
            }
          } catch (error) {
            console.error('Error fetching project members:', error);
          }
        }
      } catch (error) {
        console.error('Error in task fetching process:', error);
        toast.error('Error loading task details');
      } finally {
        setIsLoading(false);
      }
    };
    
   
    const fetchUsers = async () => {
      try {
        const usersRes = await axios.get('/users');
        const userData = usersRes.data.users || usersRes.data || [];
        console.log('Users fetched:', userData);
        
        
        const formattedUsers = userData.map((user: { _id?: string; id?: string; name?: string; username?: string; email?: string }) => ({
          id: user._id || user.id || '',
          name: user.name || user.username || 'Unknown User',
          email: user.email || ''
        }));
        
        setUsers(formattedUsers);
      } catch (firstErr) {
        console.error('Error with primary users endpoint:', firstErr);
        
        try {
        
          const usersRes = await axios.get('/auth/users');
          const userData = usersRes.data.users || usersRes.data || [];
          
          
          const formattedUsers = userData.map((user: { _id?: string; id?: string; name?: string; username?: string; email?: string }) => ({
            id: user._id || user.id || '',
            name: user.name || user.username || 'Unknown User',
            email: user.email || ''
          }));
          
          setUsers(formattedUsers);
        } catch (secondErr) {
          console.error('Error with fallback users endpoint:', secondErr);
          setUsers([]);
        }
      }
    };

    fetchTaskDetails();
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
      
      const taskData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate,
        assignedTo: formData.assignedToId || null
      };
      
      console.log('Updating task with data:', taskData);
      
     
      let response;
      let success = false;
      
      try {
        
        response = await axios.put(`/tasks/${id}`, taskData);
        success = true;
      } catch (err) {
        console.error('Error with direct task update endpoint:', err);
        
       
        if (task?.projectId) {
         
          const projectId = typeof task.projectId === 'object' && task.projectId !== null
            ? ((task.projectId as { _id?: string; id?: string })._id || (task.projectId as { _id?: string; id?: string }).id || '')
            : task.projectId;
            
          if (typeof projectId === 'string' && projectId.length > 0) {
            try {
              
              response = await axios.put(`/tasks/project/${projectId}/${id}`, taskData);
              success = true;
            } catch (err2) {
              console.error('Error with project task update endpoint:', err2);
              throw err2;
            }
          } else {
            console.error('Invalid project ID:', task.projectId);
            throw new Error('Invalid project ID for task update');
          }
        } else {
          throw err;
        }
      }
      
      if (success && response?.data) {
        console.log('Task update response:', response.data);
        
        
        let updatedTaskData;
        if (response.data.task) {
          updatedTaskData = response.data.task;
        } else if (response.data._id || response.data.id) {
          updatedTaskData = response.data;
        }
        
        if (updatedTaskData) {
         
          let assignedUserName = 'Unassigned';
          const assignedUserId = formData.assignedToId || 
            (typeof updatedTaskData.assignedTo === 'string' ? updatedTaskData.assignedTo : 
              (updatedTaskData.assignedTo?.id || updatedTaskData.assignedTo?._id || ''));
          
          if (assignedUserId) {
            const assignedUser = users.find(user => user.id === assignedUserId);
            if (assignedUser) {
              assignedUserName = assignedUser.name;
            } else {
              assignedUserName = 'Assigned User';
            }
          }
          
         
          const rawProjectId = updatedTaskData.projectId || task?.projectId || '';
          const projectId = typeof rawProjectId === 'object' && rawProjectId !== null
            ? ((rawProjectId as { _id?: string; id?: string })._id || (rawProjectId as { _id?: string; id?: string }).id || '')
            : rawProjectId;
          
          
          const projectName = updatedTaskData.projectName || task?.projectName || 'Unknown Project';
          
          
          const standardizedTask = {
            id: updatedTaskData._id || updatedTaskData.id || id,
            title: updatedTaskData.title || formData.title,
            description: updatedTaskData.description || formData.description,
            status: updatedTaskData.status || formData.status,
            priority: updatedTaskData.priority || formData.priority,
            dueDate: updatedTaskData.dueDate || formData.dueDate,
            projectId: projectId,
            projectName: projectName,
            assignedTo: {
              id: assignedUserId,
              name: assignedUserName
            },
            createdAt: updatedTaskData.createdAt || task?.createdAt || new Date().toISOString(),
            updatedAt: updatedTaskData.updatedAt || new Date().toISOString()
          };
          
          console.log('Updated task with preserved project name:', standardizedTask);
          setTask(standardizedTask);
          setIsEditing(false);
          toast.success('Task updated successfully');
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      try {
      
        let success = false;
        
        try {
          // First try the direct endpoint
          await axios.delete(`/tasks/${id}`);
          success = true;
        } catch (err) {
          console.error('Error with direct task delete endpoint:', err);
          
        
          if (task?.projectId) {
            try {
             
              await axios.delete(`/tasks/project/${task.projectId}/${id}`);
              success = true;
            } catch (err2) {
              console.error('Error with project task delete endpoint:', err2);
              throw err2;
            }
          } else {
            throw err;
          }
        }
        
        if (success) {
          toast.success('Task deleted successfully');
          navigate('/tasks');
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task. Please try again.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'in progress':
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'todo':
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

  const handleCommentAdded = (comment: Comment) => {
    
    setNewComment(comment);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!task) {
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
                Task not found. It may have been deleted or you don't have access to it.
              </p>
            </div>
          </div>
        </div>
        <Link to="/tasks" className="text-indigo-600 hover:text-indigo-500">
          &larr; Back to Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/tasks" className="text-indigo-600 hover:text-indigo-500">
          &larr; Back to Tasks
        </Link>
      </div>

      {isEditing && canModifyTask ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Task</h3>
          </div>
          <div className="border-t border-gray-200">
            <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">Task Title</label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    value={formData.title}
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      id="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="assignedToId" className="block text-sm font-medium text-gray-700">Assigned To</label>
                  <select
                    id="assignedToId"
                    name="assignedToId"
                    value={formData.assignedToId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Unassigned</option>
                    {users && users.length > 0 ? (
                      users.map((user, index) => (
                        <option key={`user-${index}-${user.id || 'unknown'}`} value={user.id}>
                          {user.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No users available</option>
                    )}
                  </select>
                  {users.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      No users found. Users may need to be added to the system.
                    </p>
                  )}
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
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">{task.title}</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Task details and information
              </p>
            </div>
            {canModifyTask && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Priority</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {task.description || 'No description provided'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Project</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <Link to={`/projects/${task.projectId}`} className="text-indigo-600 hover:text-indigo-900">
                    {task.projectName}
                  </Link>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {task.assignedTo?.name || 'Unassigned'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(task.dueDate).toLocaleDateString()}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(task.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(task.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
      
      {!isLoading && task && id && (
        <>
          <CommentForm taskId={id} onCommentAdded={handleCommentAdded} taskData={task} />
          <CommentList taskId={id} newComment={newComment} />
        </>
      )}
    </div>
  );
};

export default TaskDetail;