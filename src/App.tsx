import React, {  useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';


// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import ProjectList from './components/projects/ProjectList';
import ProjectDetail from './components/projects/ProjectDetail';
import ProjectNew from './components/projects/ProjectNew';
import TaskDetail from './components/tasks/TaskDetail';
import Navbar from './components/layout/Navbar';




// Context
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { AuthProvider } from './context/AuthContext';
import UserProfile from './components/users/UserProfile';
import UserList from './components/users/UserList';





const App: React.FC = () => {
  // Set up axios defaults
  axios.defaults.baseURL = 'http://localhost:3000/api';
  
  // Test API connectivity on startup
  useEffect(() => {
    const testApiConnection = async () => {
      try {
        console.log('Testing API connection...');
        const response = await axios.get('/');
        console.log('API Connection successful:', response.data);
      } catch (error) {
        console.error('API Connection test failed:', error);
        
        // Try a direct projects endpoint test
        try {
          console.log('Testing projects endpoint directly...');
          const projectsResponse = await axios.get('/projects');
          console.log('Projects endpoint response:', projectsResponse.data);
        } catch (projectsError) {
          console.error('Projects endpoint test failed:', projectsError);
        }
      }
    };
    
    testApiConnection();
  }, []);
  
  // Set auth token for all requests if available
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    return () => {
      delete axios.defaults.headers.common['Authorization'];
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
      
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/projects" element={
                <ProtectedRoute>
                  <ProjectList />
                </ProtectedRoute>
              } />

              <Route path="/projects/new" element={
                <ProtectedRoute>
                  <ProjectNew />
                </ProtectedRoute>
              } />
              
              <Route path="/projects/:id" element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/tasks/:id" element={
                <ProtectedRoute>
                  <TaskDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/users" element={
                <AdminRoute>
                  <UserList />
                </AdminRoute>
              } />
              
              {/* Redirect to dashboard if logged in, otherwise to login */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;