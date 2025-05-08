import React, {  useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


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
import TaskNew from './components/tasks/TaskNew';
import TaskList from './components/tasks/TaskList';





const App: React.FC = () => {
  // Set up axios defaults
  axios.defaults.baseURL = 'http://localhost:3000/api';
  

  
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
              
              <Route path="/projects/:id/tasks/new" element={
                <ProtectedRoute>
                  <TaskNew />
                </ProtectedRoute>
              } />

              <Route path="/tasks" element={
                <ProtectedRoute>
                  <TaskList />
                </ProtectedRoute>
              } />
              
              <Route path="/tasks/new" element={
                <ProtectedRoute>
                  <TaskNew />
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
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;