import React, { Suspense, lazy, useEffect } from "react";
import { Redirect, Switch, Route, useHistory } from "react-router-dom";
import { useSelector } from "react-redux";
import { LayoutSplashScreen, ContentRoute } from "../_metronic/layout";
import { BuilderPage } from "./pages/BuilderPage";
import { MyPage } from "./pages/MyPage";
import DashboardPage from "./pages/DashboardPage";
import MiPerfilPage from "./pages/MiPerfilPage";
import ConvocatoriasPublicasPage from "./pages/ConvocatoriasPublicasPage";
import SeleccionPlazaPage from "./pages/SeleccionPlazaPage";
import MisPostulacionesPage from "./pages/MisPostulacionesPage";
import ReportesConvocatoriaPage from './pages/ReportesConvocatoriaPage'
import GestionUsuarios from './pages/GestionUsuarios'

// ── Admin ────────────────────────────────────────────────────────────────────
import ConvocatoriasPage from './pages/admin/ConvocatoriasPage'
import CrearConvocatoriaPage from './pages/admin/CrearConvocatoriaPage'
import CatalogoPanelPage from './pages/admin/CatalogoPanelPage'

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

  // ✅ Fix definitivo — cubre hidratación tardía de Redux
  const roleNivel = Number(
    user?.role_nivel ??
    user?.nivel ??
    user?.role?.nivel ??
    5
  );

  console.log("🔍 roleNivel resuelto:", roleNivel, "| keys del user:", Object.keys(user))


  useEffect(() => {
    if (!user || Object.keys(user).length === 0) return;
    const currentPath = window.location.pathname;
    if (roleNivel === 5 && currentPath === "/dashboard") {
      history.push("/convocatorias/publicas");
    }
  }, [user, history, roleNivel]);

  return (
    <Suspense fallback={<LayoutSplashScreen />}>
      <Switch>

        {/* ── Perfil e Inicio ── */}
        <ContentRoute path="/mi-perfil" component={MiPerfilPage} />
        <Redirect exact from="/" to="/mi-perfil" />
        <ContentRoute path="/dashboard" component={DashboardPage} />

        {/* ── Docente ── */}
        <ContentRoute path="/seleccion-plaza" component={SeleccionPlazaPage} />
        <ContentRoute path="/mis-postulaciones" component={MisPostulacionesPage} />

        {/* ✅ CRÍTICO: /convocatorias/publicas SIEMPRE antes de /convocatorias */}
        {/* ── Vista Docente ── */}
        <Route
          path="/convocatorias/publicas"
          render={(props) =>
            roleNivel === 5
              ? <ConvocatoriasPublicasPage {...props} />
              : <Redirect to="/convocatorias" />
          }
        />

        {/* ── Vista Admin/SuperAdmin ── */}
        <Route
          path="/convocatorias"
          exact
          render={(props) =>
            roleNivel === 1 || roleNivel === 2
              ? <ConvocatoriasPage {...props} />
              : <Redirect to="/convocatorias/publicas" />
          }
        />

        {/* ── Admin: Crear Convocatoria ── */}
        <Route
          path="/crear-convocatoria"
          exact
          render={(props) =>
            roleNivel === 1 || roleNivel === 2
              ? <CrearConvocatoriaPage {...props} />
              : <Redirect to="/convocatorias" />
          }
        />

        {/* ── Admin: Catálogo ── */}
        <Route
          path="/admin/catalogo"
          exact
          render={(props) =>
            roleNivel === 1
              ? <CatalogoPanelPage {...props} />
              : <Redirect to="/dashboard" />
          }
        />

        {/* ── Reportes y Usuarios ── */}
        <ContentRoute path="/reportes/convocatorias" component={ReportesConvocatoriaPage} />
        <ContentRoute path="/usuarios" component={GestionUsuarios} />

        {/* ── Metronic ── */}
        <ContentRoute path="/builder" component={BuilderPage} />
        <ContentRoute path="/my-page" component={MyPage} />
        <Route path="/google-material" component={GoogleMaterialPage} />
        <Route path="/react-bootstrap" component={ReactBootstrapPage} />
        <Route path="/e-commerce" component={ECommercePage} />
        <Route path="/user-profile" component={UserProfilepage} />

        <Redirect to="/error/error-v1" />
      </Switch>
    </Suspense>
  );
}