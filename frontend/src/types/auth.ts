export interface User {
  id: number;
  username: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<ValidationError[]>;
  register: (userData: RegisterData) => Promise<ValidationError[]>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}