import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'
import Layout from './ui/Layout.tsx';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import CreateGiftCard from './pages/CreateGiftCard.tsx';

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
      }
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
