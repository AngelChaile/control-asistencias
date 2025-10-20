import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { getUserDoc } from "../utils/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [authReady, setAuthReady] = useState(false);

  const login = (data) => {
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  const logout = useCallback(async () => {
    try {
      // cerrar sesión en Firebase (si existe)
      await signOut(auth);
    } catch (err) {
      console.error("Error cerrando sesión en Firebase:", err);
      // seguir limpiando estado local aunque falle
    } finally {
      setUser(null);
      localStorage.removeItem("user");
    }
  }, []);

  // centralizar onAuthStateChanged aquí
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        localStorage.removeItem("user");
        setAuthReady(true);
        return;
      }

      try {
        const userDoc = await getUserDoc(u.uid);
        const full = userDoc ? { uid: u.uid, ...userDoc } : { uid: u.uid };
        setUser(full);
        localStorage.setItem("user", JSON.stringify(full));
      } catch (err) {
        console.error("Error obteniendo user doc:", err);
        setUser({ uid: u.uid });
        localStorage.setItem("user", JSON.stringify({ uid: u.uid }));
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // inactivity auto-logout (solo cuando hay usuario)
  useEffect(() => {
    if (!user) return;
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout(), 20 * 60 * 1000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, authReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
