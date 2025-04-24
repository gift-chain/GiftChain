import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'
import Layout from './ui/Layout.tsx';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';

import { GenerateCard } from './pages/GenerateCard.tsx';
// import { GiftCard } from './ui/GiftCard.tsx';

import Dashboard from './pages/Dashboard.tsx';
import { Gift } from 'lucide-react';


const RouterLayout = () => {
  return (

    <Layout>
      <Outlet />
    </Layout>

  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RouterLayout />,
    children: [
      {
        path: "/",
        element: <App />,
      },
      {
        path: "/generate-card",
        element: <GenerateCard />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      // {
      //   path: "/claim-card",
      //   element: <GiftCard />,
      // },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
