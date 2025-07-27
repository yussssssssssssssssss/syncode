import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import { BASE_URL } from "../config";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await res.json();
      if (res.ok) navigate("/dashboard");
      else alert(data.message || "Registration failed");
    } catch {
      alert("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 border-2 border-black rounded-xl shadow-md bg-white">
        <h1 className="text-4xl font-bold text-center mb-2">syncode</h1>
        <p className="text-center mb-6 text-gray-600">a collaborative text editor</p>
        <form onSubmit={handleRegister} className="space-y-4">
          <InputField placeholder="Enter Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <InputField type="email" placeholder="Enter Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <InputField type="password" placeholder="Enter Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className="w-full py-2 px-4 rounded-md bg-yellow-300 text-black font-semibold border-2 border-black hover:bg-yellow-400 transition">Create Account</button>
        </form>
        <p className="text-center mt-4 text-sm">
          Already have an account? <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => navigate("/login")}>LOGIN</span>
        </p>
      </div>
    </div>
  );
}

export default Register;