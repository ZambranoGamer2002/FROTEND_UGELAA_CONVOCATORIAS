import React, { Suspense, lazy, useEffect } from "react";
import { Redirect, Switch, Route, useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import { LayoutSplashScreen, ContentRoute } from "../_metronic/layout";
import { BuilderPage } from "./pages/BuilderPage";
import { MyPage } from "./pages/MyPage";
import DashboardPage from './pages/DashboardPage';
import CompletarPerfilPage from './pages/CompletarPerfilPage';

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

  // ========== VERIFICAR PERFIL COMPLETO ==========
  useEffect(() => {
    // Esperar a que el usuario esté cargado
    if (!user || Object.keys(user).length === 0) {
      console.log('⏳ BasePage: Esperando carga de usuario...');
      return;
    }

    console.log('👤 BasePage - Usuario cargado:', user);
    console.log('📊 perfil_completo:', user.perfil_completo);
    console.log('🎭 role_nivel:', user.role_nivel);

    const perfilCompleto = user.perfil_completo;
    const roleNivel = user.role_nivel;
    const currentPath = window.location.pathname;

    // SOLO DOCENTES (nivel 5) sin perfil → redirigir a completar-perfil
    if (roleNivel === 5 && perfilCompleto === false) {
      // No redirigir si ya está en /completar-perfil
      if (currentPath !== '/completar-perfil') {
        console.log('🚀 BasePage: Redirigiendo a /completar-perfil');
        history.push('/completar-perfil');
      }
    }
  }, [user, history]);

  return (
    <Suspense fallback={<LayoutSplashScreen />}>
      <Switch>
        {/* Ruta de completar perfil */}
        <ContentRoute path="/completar-perfil" component={CompletarPerfilPage} />

        {/* Redirect from root URL to /dashboard */}
        <Redirect exact from="/" to="/dashboard" />

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