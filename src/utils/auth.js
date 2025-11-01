// Authentication utilities

const USERS_STORAGE_KEY = 'authenticatedUsers';
const CURRENT_USER_KEY = 'currentUser';
const SESSION_KEY = 'userSession';

// Simple password hashing (for demo - in production, use a backend with bcrypt)
const hashPassword = async (password) => {
  // Use Web Crypto API for secure hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Get all users
export const getUsers = () => {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading users from storage:', error);
    return [];
  }
};

// Save users
const saveUsers = (users) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users to storage:', error);
    throw error;
  }
};

// Generate user ID
const generateUserId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Register new user
export const registerUser = async (username, email, password) => {
  // Validate inputs
  if (!username || username.trim().length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address');
  }
  
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  
  const users = getUsers();
  
  // Check if username already exists
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already exists');
  }
  
  // Check if email already exists
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Email already registered');
  }
  
  // Hash password
  const hashedPassword = await hashPassword(password);
  
  // Create new user
  const newUser = {
    id: generateUserId(),
    username: username.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword, // In production, this should never be stored client-side
    createdAt: new Date().toISOString(),
    provider: 'local' // 'local', 'google', 'facebook', 'twitter'
  };
  
  users.push(newUser);
  saveUsers(users);
  
  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    provider: newUser.provider
  };
};

// Login user
export const loginUser = async (usernameOrEmail, password) => {
  const users = getUsers();
  
  // Find user by username or email
  const user = users.find(
    u => u.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
         u.email.toLowerCase() === usernameOrEmail.toLowerCase()
  );
  
  if (!user) {
    throw new Error('Invalid username or password');
  }
  
  // For SSO users, password might not be set
  if (user.provider !== 'local') {
    throw new Error('Please sign in with your social account');
  }
  
  // Verify password
  const hashedPassword = await hashPassword(password);
  if (user.password !== hashedPassword) {
    throw new Error('Invalid username or password');
  }
  
  // Create session
  const session = {
    userId: user.id,
    username: user.username,
    email: user.email,
    provider: user.provider,
    loginTime: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  };
  
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
    id: user.id,
    username: user.username,
    email: user.email,
    provider: user.provider
  }));
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    provider: user.provider
  };
};

// SSO Login (Google, Facebook, Twitter)
export const ssoLogin = async (provider, userData) => {
  // userData should contain: id, email, name, picture (from OAuth provider)
  if (!userData || !userData.email) {
    throw new Error('Invalid user data from provider');
  }
  
  const users = getUsers();
  
  // Check if user exists with this email and provider
  let user = users.find(
    u => u.email.toLowerCase() === userData.email.toLowerCase() && u.provider === provider
  );
  
  if (!user) {
    // Create new user for SSO
    user = {
      id: generateUserId(),
      username: userData.name || userData.email.split('@')[0],
      email: userData.email.toLowerCase(),
      password: null, // No password for SSO
      createdAt: new Date().toISOString(),
      provider: provider,
      ssoId: userData.id,
      picture: userData.picture || null
    };
    
    users.push(user);
    saveUsers(users);
  }
  
  // Create session
  const session = {
    userId: user.id,
    username: user.username,
    email: user.email,
    provider: user.provider,
    loginTime: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
    id: user.id,
    username: user.username,
    email: user.email,
    provider: user.provider,
    picture: user.picture
  }));
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    provider: user.provider,
    picture: user.picture
  };
};

// Logout user
export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(SESSION_KEY);
};

// Get current user
export const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem(CURRENT_USER_KEY);
    if (!userData) return null;
    
    const user = JSON.parse(userData);
    
    // Check if session is still valid
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (new Date(session.expiresAt) > new Date()) {
        return user;
      } else {
        // Session expired
        logoutUser();
        return null;
      }
    }
    
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};

// Get user by ID
export const getUserById = (userId) => {
  const users = getUsers();
  return users.find(u => u.id === userId);
};

