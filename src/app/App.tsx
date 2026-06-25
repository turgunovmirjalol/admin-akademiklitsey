import { RouterProvider } from "react-router";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import { router } from "./routes";
import { Toaster } from "sonner";
import { SettingsProvider } from "./context/SettingsContext";

export default function App() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={login} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <SettingsProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </SettingsProvider>
  );
}
