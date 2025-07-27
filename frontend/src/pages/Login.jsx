import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import { BASE_URL } from "../config";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Store user data in localStorage - this was missing!
        const userData = {
          id: data.user.id,
          username: data.user.name, // Note: backend returns 'name', frontend expects 'username'
          email: data.user.email
        };
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Redirect to dashboard
        navigate("/dashboard");
      } else {
        alert(data.message || "Login failed.");
      }
    } catch (err) {
      alert("Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 border-2 border-black rounded-xl shadow-md bg-white">
        <h1 className="text-4xl font-bold text-center mb-2">syncode</h1>
        <p className="text-center mb-6 text-gray-600">a collaborative text editor</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <InputField
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <InputField
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full py-2 px-4 rounded-md bg-yellow-300 text-black font-semibold border-2 border-black hover:bg-yellow-400 transition"
          >
            Login
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          Don't have an account?{" "}
          <span
            className="text-orange-600 cursor-pointer hover:underline"
            onClick={() => navigate("/register")}
          >
            CREATE
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;