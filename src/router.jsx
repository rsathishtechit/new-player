import { lazy } from "react";
import { createHashRouter } from "react-router-dom";
import Layout from "./components/Layout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const CoursePlayer = lazy(() => import("./pages/CoursePlayer"));
const CourseLibrary = lazy(() => import("./pages/CourseLibrary"));
const Settings = lazy(() => import("./pages/Settings"));

export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "course/:courseId",
        element: <CoursePlayer />,
      },
      {
        path: "library",
        element: <CourseLibrary />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
    ],
  },
]);
