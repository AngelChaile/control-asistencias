// simple login page used by App
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const navigate = useNavigate();

  async function login(e) {
    e && e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      navigate("/admin");
    } catch (err) {
      alert("Error login: " + err.message);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Login Admin / RRHH</h2>
      <form onSubmit={login}>
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} /><br/>
        <input placeholder="password" type="password" value={pass} onChange={e => setPass(e.target.value)} /><br/>
        <button type="submit">Ingresar</button>
      </form>
    </div>
  );
}
