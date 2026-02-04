import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, UserPlus, LogIn, Loader2 } from 'lucide-react';
import { cn } from '../utils/classnames';
import { useUserStore } from '../stores';

interface LoginProps {
  className?: string;
}

const Login: React.FC<LoginProps> = ({ className }) => {
  const navigate = useNavigate();
  const { login, register, isLoading, error, clearError } = useUserStore();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (isRegistering) {
      // Validate registration
      if (password !== confirmPassword) {
        return;
      }
      if (!name.trim()) {
        return;
      }
      
      try {
        await register(name, email, password);
        navigate('/');
      } catch (error) {
        // Error is handled by store
      }
    } else {
      // Login
      try {
        await login(email, password);
        navigate('/');
      } catch (error) {
        // Error is handled by store
      }
    }
  };
  
  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    clearError();
    // Reset form
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };
  
  return (
    <div className={cn('min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4', className)}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">AX</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Axtra Console</h1>
          <p className="text-gray-500 mt-1">AI-Powered Call Center Coaching</p>
        </div>
        
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isRegistering 
              ? 'Sign up to start your training journey' 
              : 'Sign in to access your dashboard'}
          </p>
          
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field - only for registration */}
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
            )}
            
            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>
            
            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            {/* Confirm Password - only for registration */}
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                      confirmPassword && password !== confirmPassword
                        ? 'border-rose-300 bg-rose-50'
                        : 'border-gray-200'
                    )}
                    placeholder="••••••••"
                    required
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-rose-500 mt-1">Passwords do not match</p>
                )}
              </div>
            )}
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (isRegistering && password !== confirmPassword)}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all',
                isLoading || (isRegistering && password !== confirmPassword)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {isRegistering ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                <>
                  {isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />}
                  {isRegistering ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>
          
          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-indigo-600 font-semibold hover:text-indigo-700"
              >
                {isRegistering ? 'Sign In' : 'Create one'}
              </button>
            </p>
          </div>
          
          {/* Demo Credentials */}
          {!isRegistering && (
            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 text-center">
                <strong>Demo Account:</strong> admin@axtra.local / admin123
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          © 2026 Axtra Console. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
