import { Outlet } from "react-router-dom";
import TopNav from "./components/TopNav";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <Outlet />
    </div>
  );
}
