import { lazy } from 'react';
import { createHashRouter } from 'react-router-dom';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const CoursePlayer = lazy(() => import('./pages/CoursePlayer'));

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'course/:courseId',
        element: <CoursePlayer />,
      },
    ],
  },
]);
