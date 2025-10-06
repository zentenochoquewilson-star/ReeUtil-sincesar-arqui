import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import QuoteNew from "./pages/QuoteNew";
import MyQuotes from "./pages/MyQuotes";
import QuoteDetail from "./pages/QuoteDetail";
import ErrorPage from "./components/ErrorPage";

// Admin
import RequireRole from "./components/RequireRole";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFormsList from "./pages/admin/AdminFormsList";
import AdminFormNew from "./pages/admin/AdminFormNew";
import AdminQuotes from "./pages/admin/AdminQuotes";
function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-gray-600">Página en construcción…</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Landing /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "services", element: <Services /> },
      { path: "contact", element: <Contact /> },
      { path: "quote/new", element: <QuoteNew /> },
      { path: "quotes", element: <MyQuotes /> },
      { path: "quotes/:id", element: <QuoteDetail /> },
      // ADMIN (protegido por roles)
      {
        path: "admin",
        element: (
          <RequireRole roles={["admin", "staff"]}>
            <AdminLayout />
          </RequireRole>
        ),
        errorElement: <ErrorPage />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: "users", element: <AdminUsers /> },
          { path: "forms", element: <AdminFormsList /> },
          { path: "forms/new", element: <AdminFormNew /> },
          { path: "quotes", element: <AdminQuotes /> },
        ],
      },
    ],
  },
]);
