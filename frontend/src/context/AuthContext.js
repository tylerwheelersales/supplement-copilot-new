import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('token'),
      AsyncStorage.getItem('profileComplete'),
    ]).then(([t, p]) => {
      setToken(t);
      setProfileComplete(p === 'true');
      setLoading(false);
    });
  }, []);

  async function saveToken(t) {
    await AsyncStorage.setItem('token', t);
    setToken(t);
  }

  async function clearToken() {
    await AsyncStorage.multiRemove(['token', 'profileComplete']);
    setToken(null);
    setProfileComplete(false);
  }

  async function completeProfile() {
    await AsyncStorage.setItem('profileComplete', 'true');
    setProfileComplete(true);
  }

  return (
    <AuthContext.Provider value={{ token, loading, profileComplete, saveToken, clearToken, completeProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
