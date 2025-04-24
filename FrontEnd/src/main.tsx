import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'
import Layout from './ui/Layout.tsx';
import ValidateGift from './ui/ValidateGift.tsx';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import ReclaimGift from './ui/ReclaimGift.tsx';

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
        path: "/validatePage",
        element: <ValidateGift /> ,
      },

      {
        path: "/reclaimGift",
        element: <ReclaimGift /> ,
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
