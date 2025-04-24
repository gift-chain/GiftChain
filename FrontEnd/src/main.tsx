import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'
import Layout from './ui/Layout.tsx';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { GenerateCard } from './pages/GenerateCard.tsx';

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
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
