// apps/web/src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import QuoteNew from "./pages/QuoteNew";
import MyQuotes from "./pages/MyQuotes";
import ErrorPage from "./components/ErrorPage";

// Admin
import RequireRole from "./components/RequireRole";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFormsList from "./pages/admin/AdminFormsList";
import AdminFormNew from "./pages/admin/AdminFormNew";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminShipments from "./pages/admin/AdminShipments";
import AdminShipValidations from "./pages/admin/AdminShipValidations";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "quote/new", element: <QuoteNew /> },
      // ✅ SOLO esta ruta para "Mis cotizaciones"
      { path: "quotes", element: <MyQuotes /> },

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
          { path: "shipments", element: <AdminShipments /> },
          { path: "ship-validations", element: <AdminShipValidations /> },
        ],
      },
    ],
  },
]);

export default router;
