import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
}

interface Task {
  id: string;
  _id?: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  projectId: string;
  projectName?: string;
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
  project?: string;
}


interface ProjectApiResponse {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  status?: string;
  createdAt?: string;
}

const Dashboard: React.FC = () => {
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    console.log('Current authenticated user:', user);
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        let projectsData = [];
        
        try {
          const projectsResponse = await axios.get('/projects?limit=5&sort=createdAt:desc');
          console.log('Dashboard projects response:', projectsResponse.data);
          
        
          const projectsArray = Array.isArray(projectsResponse.data) 
            ? projectsResponse.data 
            : projectsResponse.data.projects || [];
            
          console.log('Projects array to process:', projectsArray);
          
          const mappedProjects = projectsArray.map((project: ProjectApiResponse) => {
            console.log('Processing project in Dashboard:', project);
            return {
              id: project._id || project.id || '',
              name: project.title || project.name || 'Untitled Project',
              description: project.description || '',
              status: project.status || 'pending',
              createdAt: project.createdAt || new Date().toISOString()
            };
          });
          
          console.log('Mapped projects in Dashboard:', mappedProjects);
          projectsData = mappedProjects;
        } catch (projectError) {
          console.error('Error fetching projects in Dashboard:', projectError);
        }
        
       
        let tasksData: Task[] = [];
        let foundTasks = false;
        
        
        if (projectsData.length > 0) {
          const allProjectTasks: TaskApiResponse[] = [];
          
          // Try to get tasks for each project
          for (const project of projectsData) {
            try {
              const projectId = project.id;
              const projectTasksResponse = await axios.get(`/tasks/project/${projectId}`);
              
              if (projectTasksResponse?.data) {
                const projectTasks = Array.isArray(projectTasksResponse.data) 
                  ? projectTasksResponse.data 
                  : projectTasksResponse.data.tasks || [];
                
                
                const tasksWithProject = projectTasks.map((task: TaskApiResponse) => ({
                  ...task,
                  projectId: projectId,
                  projectName: project.name
                }));
                
                allProjectTasks.push(...tasksWithProject);
                foundTasks = true;
              }
            } catch {
              console.log(`Could not fetch tasks for project ${project.id}`);
            }
          }
          
          if (allProjectTasks.length > 0) {
            
            tasksData = allProjectTasks.map((task: TaskApiResponse & { projectName?: string }) => ({
              id: task._id || task.id || '',
              _id: task._id || task.id || '',
              title: task.title || 'Untitled Task',
              description: task.description || '',
              status: task.status || 'pending',
              priority: task.priority || 'medium',
              dueDate: task.dueDate || new Date().toISOString(),
              projectId: task.projectId || task.project || '',
              projectName: task.projectName || 'Unknown Project'
            }));
          }
        }
        
      
        if (!foundTasks && user?._id) {
          try {
          
            const tasksResponse = await axios.get(`/tasks/user/${user._id}`);
            if (tasksResponse?.data) {
              const tasksArray = Array.isArray(tasksResponse.data) 
                ? tasksResponse.data 
                : tasksResponse.data.tasks || [];
              
             
              const userTasks: Task[] = tasksArray.map((task: TaskApiResponse) => ({
                id: task._id || task.id || '',
                _id: task._id || task.id || '',
                title: task.title || 'Untitled Task',
                description: task.description || '',
                status: task.status || 'pending',
                priority: task.priority || 'medium',
                dueDate: task.dueDate || new Date().toISOString(),
                projectId: task.projectId || task.project || '',
                projectName: ''
              }));
              
              
              if (projectsData.length > 0) {
                const tasksWithProjectNames = userTasks.map((task: Task) => {
                  const relatedProject = projectsData.find((p: Project) => p.id === task.projectId);
                  return {
                    ...task,
                    projectName: relatedProject ? relatedProject.name : 'Unknown Project'
                  };
                });
                
                tasksData = [...tasksData, ...tasksWithProjectNames];
                foundTasks = true;
              } else {
                tasksData = [...tasksData, ...userTasks];
                foundTasks = true;
              }
            }
          } catch {
            console.log(`User tasks endpoint (/tasks/user/${user._id}) not available`);
          }
        }
        
     
        if (!foundTasks) {
          try {
           
            const tasksResponse = await axios.get('/tasks?limit=5');
            if (tasksResponse?.data) {
              const tasksArray = Array.isArray(tasksResponse.data) 
                ? tasksResponse.data 
                : tasksResponse.data.tasks || [];
              
              
              const generalTasks: Task[] = tasksArray.map((task: TaskApiResponse) => ({
                id: task._id || task.id || '',
                _id: task._id || task.id || '',
                title: task.title || 'Untitled Task',
                description: task.description || '',
                status: task.status || 'pending',
                priority: task.priority || 'medium',
                dueDate: task.dueDate || new Date().toISOString(),
                projectId: task.projectId || task.project || '',
                projectName: ''
              }));
              
            
              if (projectsData.length > 0) {
                const tasksWithProjectNames = generalTasks.map((task: Task) => {
                  const relatedProject = projectsData.find((p: Project) => p.id === task.projectId);
                  return {
                    ...task,
                    projectName: relatedProject ? relatedProject.name : 'Unknown Project'
                  };
                });
                
                tasksData = [...tasksData, ...tasksWithProjectNames];
              } else {
                tasksData = [...tasksData, ...generalTasks];
              }
            }
          } catch {
            console.log(`General tasks endpoint not available`);
          }
        }
        
        setRecentProjects(projectsData);
        setUserTasks(tasksData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'todo':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {user?.name || 'User'}!</h1>
        <p className="text-gray-600">Here's an overview of your projects and tasks</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all
            </Link>
          </div>
          
          {recentProjects.length > 0 ? (
            <div className="space-y-4">
              {recentProjects.map((project, index) => (
                <Link 
                  key={`dashboard-project-${project.id || index}`} 
                  to={`/projects/${project.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Created on {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No projects found</p>
              <Link to="/projects/new" className="mt-2 inline-block text-indigo-600 hover:text-indigo-800">
                Create your first project
              </Link>
            </div>
          )}
        </div>
        
        {/* My Tasks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">My Tasks</h2>
            <Link to="/tasks" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all
            </Link>
          </div>
          
          {userTasks.length > 0 ? (
            <div className="space-y-4">
              {userTasks.map((task, index) => (
                <Link 
                  key={`dashboard-task-${task.id || index}`} 
                  to={`/tasks/${task._id || task.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{task.projectName}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks assigned to you</p>
              {recentProjects.length > 0 && (
                <Link 
                  to={`/projects/${recentProjects[0].id}/tasks/new`} 
                  className="mt-2 inline-block text-indigo-600 hover:text-indigo-800"
                >
                  Create a new task
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;