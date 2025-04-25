import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'
import Layout from './ui/Layout.tsx';
import ValidateGift from './ui/ValidateGift.tsx';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import ReclaimGift from './ui/ReclaimGift.tsx';

// import { GenerateCard } from './pages/GenerateCard.tsx';
// import { GiftCard } from './ui/GiftCard.tsx';

import Dashboard from './pages/Dashboard.tsx';
import CreateGiftCard from './pages/CreateGiftCard.tsx';
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
      // {
      //   path: "/",
      //   element: ,
      // },

      {
        path: "/validateGift",
        element: <ValidateGift /> ,
      },

      {
        path: "/reclaimGift",
        element: <ReclaimGift /> ,
      },
     
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/create-gift",
        element: <CreateGiftCard/>
      }
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
