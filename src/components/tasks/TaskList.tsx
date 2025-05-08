import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
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
    id?: string;
    name?: string;
  };
}

interface ProjectMember {
  _id?: string;
  id?: string;
  name?: string;
}

interface Project {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  members?: (ProjectMember | string)[];
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
  project?: string;
  assignedTo?: string | {
    id?: string;
    _id?: string;
    name?: string;
  };
}

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const { user } = useAuth();
  const [userProjects, setUserProjects] = useState<string[]>([]);

  // A manager can create a task if they're admin, a general manager, or assigned to any project
  const canCreateTask = user && (
    user.role === 'admin' || 
    (user.role === 'manager' && userProjects.length > 0)
  );

  useEffect(() => {
    // Fetch the projects the user is a member of
    const fetchUserProjects = async () => {
      if (user && user.role === 'manager') {
        try {
          const projectsResponse = await axios.get('/projects');
          const projects = Array.isArray(projectsResponse.data) 
            ? projectsResponse.data 
            : projectsResponse.data.projects || [];
          
          // Check if the user is a member of any project
          const userProjectIds = projects.filter((project: Project) => {
            if (!project.members) return false;
            
            const members = Array.isArray(project.members) ? project.members : [];
            return members.some((member: ProjectMember | string) => {
              if (typeof member === 'string') {
                return member === user._id;
              } else {
                return (member._id === user._id || member.id === user._id);
              }
            });
          }).map((project: Project) => project._id || project.id || '');
          
          setUserProjects(userProjectIds);
        } catch (error) {
          console.error('Error fetching user projects:', error);
        }
      }
    };
    
    fetchUserProjects();
  }, [user]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        
      
        const projectsResponse = await axios.get('/projects');
        const projects = Array.isArray(projectsResponse.data) 
          ? projectsResponse.data 
          : projectsResponse.data.projects || [];
        
      
        const allTasks: Task[] = [];
        
        for (const project of projects) {
          try {
            const projectId = project._id || project.id;
            const projectName = project.title || project.name || 'Unknown Project';
            
           
            const taskResponse = await axios.get(`/tasks/project/${projectId}`);
            const projectTasks = taskResponse.data.tasks || taskResponse.data || [];
            
            if (Array.isArray(projectTasks)) {
           
              const formattedTasks = projectTasks.map((task: TaskResponse) => ({
                id: task._id || task.id || '',
                title: task.title || 'Untitled Task',
                description: task.description || '',
                status: task.status || 'pending',
                priority: task.priority || 'medium',
                dueDate: task.dueDate || new Date().toISOString(),
                projectId: projectId || '',
                projectName: projectName || 'Unknown Project',
                assignedTo: typeof task.assignedTo === 'string' 
                  ? { id: task.assignedTo, name: 'Assigned User' }
                  : (task.assignedTo || { id: undefined, name: 'Unassigned' })
              }));
              
              allTasks.push(...formattedTasks);
            }
          } catch {
            console.log(`No tasks found for project ${project._id || project.id}`);
          }
        }
        
        setTasks(allTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast.error('Error fetching tasks. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

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

  const filteredTasks = tasks && tasks.length > 0 ? tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesPriority = priorityFilter === 'all' || task.priority.toLowerCase() === priorityFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesPriority;
  }) : [];
  
  
  useEffect(() => {
    if (tasks.length > 0 && filteredTasks.length === 0 && (searchTerm || statusFilter !== 'all' || priorityFilter !== 'all')) {
      toast.info('No tasks match your current filters.');
    }
  }, [filteredTasks.length, searchTerm, statusFilter, priorityFilter, tasks.length]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        {canCreateTask && (
          <Link 
            to="/tasks/new" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Task
          </Link>
        )}
      </div>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-1">
          <label htmlFor="search" className="sr-only">Search</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              id="search"
              name="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search tasks"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="status" className="sr-only">Filter by status</label>
          <select
            id="status"
            name="status"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="priority" className="sr-only">Filter by priority</label>
          <select
            id="priority"
            name="priority"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      
      {filteredTasks.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTasks.map((task) => (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
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
                      <div className="ml-2 flex-shrink-0 flex">
                        <svg className="mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">View</span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {task.assignedTo?.name || 'Unassigned'}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2h1v1H4v-1h1v-2a1 1 0 011-1h8a1 1 0 011 1z" clipRule="evenodd" />
                          </svg>
                          {task.projectName}
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
        </div>
      ) : (
        <div className="text-center py-12 bg-white shadow overflow-hidden sm:rounded-md">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
              ? 'Try adjusting your search or filters to find what you\'re looking for.' 
              : 'Get started by creating a new task.'}
          </p>
          {canCreateTask && !searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
            <div className="mt-6">
              <Link
                to="/tasks/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create Task
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskList;