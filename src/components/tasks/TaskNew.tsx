import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
}

interface ProjectMember {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
}

interface Project {
  _id: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
  projectId: string;
}

const TaskNew: React.FC = () => {
  const { id: projectIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
    assignedTo: '',
    projectId: projectIdFromUrl || ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      
      try {
       
        const projectsRes = await axios.get('/projects');
        const projectsList = Array.isArray(projectsRes.data) 
          ? projectsRes.data 
          : projectsRes.data.projects || [];
          
        setProjects(projectsList);
        
        
        if (projectIdFromUrl) {
          try {
            const projectRes = await axios.get(`/projects/${projectIdFromUrl}`);
            const projectData = projectRes.data.project || projectRes.data;
            setProjectName(projectData.title || projectData.name || 'Project');
            
            
            if (projectData.members && Array.isArray(projectData.members)) {
              const memberData = projectData.members
                .filter((m: ProjectMember | string) => typeof m !== 'string')
                .map((m: ProjectMember) => ({
                  _id: m._id || m.id,
                  name: m.name || 'Unknown',
                  email: m.email || ''
                }));
              if (memberData.length > 0) {
                setUsers(memberData);
              } else {
                await fetchUsers();
              }
            } else {
              await fetchUsers();
            }
          } catch (err) {
            console.error('Error fetching project details:', err);
            toast.error('Failed to load project details. Using default settings.');
            await fetchUsers();
          }
        } else {
          
          await fetchUsers();
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load project data. Please try again.');
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchUsers = async () => {
      try {
        const usersRes = await axios.get('/users');
        setUsers(usersRes.data.users || usersRes.data || []);
      } catch {
        try {
          const usersRes = await axios.get('/auth/users');
          setUsers(usersRes.data.users || usersRes.data || []);
        } catch (secondErr) {
          console.error('Could not fetch users:', secondErr);
          toast.warning('Could not fetch users list. Tasks can be created but not assigned.');
        }
      }
    };
    
    fetchData();
  }, [projectIdFromUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    
    if (name === 'projectId' && value) {
      const selectedProject = projects.find(p => p._id === value || p.id === value);
      if (selectedProject) {
        setProjectName(selectedProject.title || selectedProject.name || 'Project');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
  
    if (!formData.projectId) {
      setError('Please select a project for this task');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const taskData: any = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate,
        projectId: formData.projectId
      };
      
      
      if (formData.assignedTo) {
        taskData.assignedTo = formData.assignedTo;
        
        taskData.assignedToId = formData.assignedTo;
      }
      
      
      if (user?._id) {
        taskData.createdBy = user._id;
      }
      
      
      let response = null;
      let success = false;
      
      try {
        
        response = await axios.post(`/tasks/project/${formData.projectId}`, taskData);
        success = true;
      } catch (err) {
        console.error('Error with correct tasks endpoint:', err);
        
        
        try {
          
          response = await axios.post('/tasks', taskData);
          success = true;
        } catch (err2) {
          console.error('Error with standard tasks endpoint:', err2);
          
          try {
            
            response = await axios.post(`/projects/${formData.projectId}/tasks`, taskData);
            success = true;
          } catch (err3) {
            console.error('Error with project tasks endpoint:', err3);
            
            
            throw err3;
          }
        }
      }
      
     
      if (success && response?.data) {
        
        let taskId;
        
        if (response.data.task) {
          
          taskId = response.data.task._id || response.data.task.id;
        } else if (response.data._id) {
         
          taskId = response.data._id;
        } else if (response.data.id) {
          
          taskId = response.data.id;
        } else {
          
          const possibleIdFields = ['_id', 'id', 'taskId', 'task_id'];
          for (const field of possibleIdFields) {
            if (response.data[field]) {
              taskId = response.data[field];
              break;
            }
          }
        }
        
        
        if (taskId) {
          console.log(`Navigating to task detail: /tasks/${taskId}`);
          toast.success('Task created successfully!');
          navigate(`/tasks/${taskId}`);
        } else {
          
          console.log(`No task ID found, returning to project: /projects/${formData.projectId}`);
          toast.success('Task created successfully! Returning to project.');
          navigate(`/projects/${formData.projectId}`);
        }
      } else {
        
        toast.success('Task created successfully! Returning to project.');
        navigate(`/projects/${formData.projectId}`);
      }
    } catch (err) {
      console.error('Error creating task:', err);
      toast.error('Failed to create task. Please try again.');
      setError('Failed to create task. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Task</h1>
        
        {projectIdFromUrl ? (
          <p className="text-gray-600 mb-6">Add a task to project: {projectName}</p>
        ) : (
          <div className="mb-6">
            <p className="text-gray-600">Select a project to add a task to</p>
            <Link to="/projects" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all projects
            </Link>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
         
          {!projectIdFromUrl && (
            <div className="mb-4">
              <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">
                Project *
              </label>
              <select
                id="projectId"
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a project</option>
                {projects.map((project, index) => (
                  <option key={`project-${project._id || project.id || index}`} value={project._id || project.id}>
                    {project.title || project.name || 'Unnamed Project'}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter task title"
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
              placeholder="Describe the task"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
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
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                Assign To
              </label>
              <select
                id="assignedTo"
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {users.map((user, index) => (
                  <option key={`user-${index}-${user._id || user.id || 'unknown'}`} value={user._id || user.id}>
                    {user.name} {user.email ? `(${user.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(projectIdFromUrl ? `/projects/${projectIdFromUrl}` : '/projects')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskNew; 