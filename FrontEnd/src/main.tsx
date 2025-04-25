import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'
import Layout from './ui/Layout.tsx';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import ClaimGift from './pages/ClaimGift.tsx';
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
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/create-gift",
        element: <CreateGiftCard/>
      },
      {
        path: "/claim-gift",
        element: <ClaimGift/>
      }
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
