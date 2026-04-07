import React, { Suspense, lazy, useEffect } from "react";
import { Redirect, Switch, Route, useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import { LayoutSplashScreen, ContentRoute } from "../_metronic/layout";
import { BuilderPage } from "./pages/BuilderPage";
import { MyPage } from "./pages/MyPage";
import DashboardPage from "./pages/DashboardPage";
import MiPerfilPage from "./pages/MiPerfilPage";
import ConvocatoriasPage from "./pages/ConvocatoriasPage";
import ConvocatoriasPublicasPage from "./pages/ConvocatoriasPublicasPage";
import SeleccionPlazaPage from "./pages/SeleccionPlazaPage";

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
  const roleNivel = user?.role_nivel || 5;

  useEffect(() => {
    if (!user || Object.keys(user).length === 0) {
      return;
    }

    const currentPath = window.location.pathname;

    console.log("📍 BasePage - Ruta actual:", currentPath);
    console.log("👤 Usuario:", user.username);
    console.log("🎭 Rol nivel:", roleNivel);

    // Docente: si entra al dashboard, llevarlo a convocatorias públicas
    if (roleNivel === 5 && currentPath === "/dashboard") {
      console.log("🚀 BasePage: Redirigiendo docente a /convocatorias/publicas");
      history.push("/convocatorias/publicas");
    }
  }, [user, history, roleNivel]);

  return (
    <Suspense fallback={<LayoutSplashScreen />}>
      <Switch>
        {/* Mi Perfil */}
        <ContentRoute path="/mi-perfil" component={MiPerfilPage} />

        {/* Inicio */}
        <Redirect exact from="/" to="/mi-perfil" />

        {/* Dashboard */}
        <ContentRoute path="/dashboard" component={DashboardPage} />

        {/* Selección de Plaza */}
        <ContentRoute path="/seleccion-plaza" component={SeleccionPlazaPage} />

        {/* Convocatorias - Gestión admin */}
        <Route
          path="/convocatorias"
          exact
          render={(props) => {
            if (roleNivel === 1 || roleNivel === 2) {
              return <ConvocatoriasPage {...props} />;
            }

            return <Redirect to="/convocatorias/publicas" />;
          }}
        />

        {/* Convocatorias públicas - docentes */}
        <Route
          path="/convocatorias/publicas"
          component={ConvocatoriasPublicasPage}
        />

        <ContentRoute path="/builder" component={BuilderPage} />
        <ContentRoute path="/my-page" component={MyPage} />
        <Route path="/google-material" component={GoogleMaterialPage} />
        <Route path="/react-bootstrap" component={ReactBootstrapPage} />
        <Route path="/e-commerce" component={ECommercePage} />
        <Route path="/user-profile" component={UserProfilepage} />

        {/* Página de error si la ruta no existe */}
        <Redirect to="/error/error-v1" />
      </Switch>
    </Suspense>
  );
}