import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Yangiliklar from "./pages/Yangiliklar";
import Elonlar from "./pages/Elonlar";
import Oqituvchilar from "./pages/Oqituvchilar";
import Rahbariyat from "./pages/Rahbariyat";
import Qabul from "./pages/Qabul";
import Sozlamalar from "./pages/Sozlamalar";
import DarsJadvali from "./pages/DarsJadvali";
import Fanlar from "./pages/Fanlar";
import Kafedralar from "./pages/Kafedralar";
import Savollar from "./pages/Savollar";
import Galereya from "./pages/Galereya";
import AlbomRasmlari from "./pages/AlbomRasmlari";
import Videolar from "./pages/Videolar";
import Slayderlar from "./pages/Slayderlar";
import Statistika from "./pages/Statistika";
import Murojaatlar from "./pages/Murojaatlar";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "yangiliklar", Component: Yangiliklar },
      { path: "elonlar", Component: Elonlar },
      { path: "oqituvchilar", Component: Oqituvchilar },
      { path: "rahbariyat", Component: Rahbariyat },
      { path: "kafedralar", Component: Kafedralar },
      { path: "savollar", Component: Savollar },
      { path: "galereya", Component: Galereya },
      { path: "galereya/:slug", Component: AlbomRasmlari },
      { path: "videolar", Component: Videolar },
      { path: "slayderlar", Component: Slayderlar },
      { path: "statistika", Component: Statistika },
      { path: "murojaatlar", Component: Murojaatlar },
      { path: "qabul", Component: Qabul },
      { path: "sozlamalar", Component: Sozlamalar },
      { path: "dars-jadvali", Component: DarsJadvali },
      { path: "fanlar", Component: Fanlar },
    ],
  },
]);
