import { useContext } from 'react';
import type { AuthContextType } from '../types/auth';
import { AuthContext } from '../contexts/AuthContextDefinition';

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}