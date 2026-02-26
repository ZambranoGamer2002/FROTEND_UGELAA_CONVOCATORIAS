import React, { Suspense, lazy, useEffect } from "react";
import { Redirect, Switch, Route, useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import { LayoutSplashScreen, ContentRoute } from "../_metronic/layout";
import { BuilderPage } from "./pages/BuilderPage";
import { MyPage } from "./pages/MyPage";
import DashboardPage from './pages/DashboardPage';
import MiPerfilPage from './pages/MiPerfilPage';

const GoogleMaterialPage = lazy(() =>
  import("./modules/GoogleMaterialExamples/GoogleMaterialPage")
);
const ReactBootstrapPage = lazy(() =>
  import("./modules/ReactBootstrapExamples/ReactBootstrapPage")
);
const ECommercePage = lazy(() =>
  import("./modules/ECommerce/pages/eCommercePage")
);
const UserProfilepage = lazy(() =>
  import("./modules/UserProfile/UserProfilePage")
);

export default function BasePage() {
  const history = useHistory();
  const auth = useSelector((state) => state.auth);
  const user = auth?.user || {};

  // ========== VERIFICAR PERFIL Y REDIRIGIR ==========
  useEffect(() => {
    if (!user || Object.keys(user).length === 0) {
      return;
    }

    const roleNivel = user.role_nivel;
    const currentPath = window.location.pathname;

    console.log('📍 BasePage - Ruta actual:', currentPath);
    console.log('👤 Usuario:', user.username);
    console.log('🎭 Rol nivel:', roleNivel);

    // DOCENTES (nivel 5): Si no están en /mi-perfil, redirigir
    if (roleNivel === 5 && currentPath === '/dashboard') {
      console.log('🚀 BasePage: Redirigiendo docente a /mi-perfil desde /dashboard');
      history.push('/mi-perfil');
    }
  }, [user, history]);

  return (
    <Suspense fallback={<LayoutSplashScreen />}>
      <Switch>
        {/* Ruta de Mi Perfil */}
        <ContentRoute path="/mi-perfil" component={MiPerfilPage} />

        {/* Redirect from root URL to /mi-perfil (TODOS LOS USUARIOS) */}
        <Redirect exact from="/" to="/mi-perfil" />

        <ContentRoute path="/dashboard" component={DashboardPage} />
        <ContentRoute path="/builder" component={BuilderPage} />
        <ContentRoute path="/my-page" component={MyPage} />
        <Route path="/google-material" component={GoogleMaterialPage} />
        <Route path="/react-bootstrap" component={ReactBootstrapPage} />
        <Route path="/e-commerce" component={ECommercePage} />
        <Route path="/user-profile" component={UserProfilepage} />
        <Redirect to="error/error-v1" />
      </Switch>
    </Suspense>
  );
}