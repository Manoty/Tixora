// src/context/AuthContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

const initialState = {
  user:         null,
  accessToken:  null,
  isLoading:    true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user:        action.payload.user,
        accessToken: action.payload.accessToken,
        isLoading:   false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'LOADED':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Rehydrate from localStorage on app load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user  = localStorage.getItem('tixora_user');

    if (token && user) {
      try {
        const decoded = jwtDecode(token);
        // Check token not expired
        if (decoded.exp * 1000 > Date.now()) {
          dispatch({
            type:    'LOGIN',
            payload: {
              user:        JSON.parse(user),
              accessToken: token,
            },
          });
          return;
        }
      } catch {
        localStorage.clear();
      }
    }
    dispatch({ type: 'LOADED' });
  }, []);

  const login = (tokens, user) => {
    localStorage.setItem('access_token',  tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('tixora_user',   JSON.stringify(user));
    dispatch({ type: 'LOGIN', payload: { user, accessToken: tokens.access } });
  };

  const logout = () => {
    localStorage.clear();
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);