import Header from "./Header";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="max-w-5xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}