import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

import routes from './routes';

// Uncomment these imports when using miaoda-auth-react for authentication
// import { AuthProvider, RequireAuth } from 'miaoda-auth-react';
// import { supabase } from 'supabase-js';

// 布局组件，根据路径决定是否显示Header和Footer
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  if (isAdminPage) {
    // 管理后台页面：不显示Header和Footer
    return <>{children}</>;
  }

  // 普通页面：显示Header和Footer
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br">
      <Header />
      <main className="flex-grow px-tomato-xl py-tomato-lg max-[729px]:pb-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
{/*
    // USING MIAODA-AUTH-REACT (Uncomment when auth is required):
    // =========================================================
    // Replace the current App structure with this when using miaoda-auth-react:

    // 1. Wrap everything with AuthProvider (must be inside Router)
    // 2. Use RequireAuth to protect routes that need authentication
    // 3. Set whiteList prop for public routes that don't require auth

    // Example structure:
    // <Router>
    //   <AuthProvider client={supabase} debug>
    //     <ScrollToTop />
    //     <Toaster />
    //     <RequireAuth whiteList={["/login", "/403", "/404", "/public/*"]}>
    //       <Routes>
    //         ... your routes here ...
    //       </Routes>
    //     </RequireAuth>
    //   </AuthProvider>
    // </Router>

    // IMPORTANT:
    // - AuthProvider must be INSIDE Router (it uses useNavigate)
    // - RequireAuth should wrap Routes, not be inside it
    // - Add all public paths to the whiteList array
    // - Remove the custom PrivateRoute component when using RequireAuth
*/}
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            {routes.map((route, index) => (
              <Route
                key={index}
                path={route.path}
                element={route.element}
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        <Toaster />
      </AuthProvider>
    </Router>
  );
};

export default App;
