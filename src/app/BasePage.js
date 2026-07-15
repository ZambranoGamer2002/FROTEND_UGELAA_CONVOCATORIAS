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
import ReportesConvocatoriaPage from "./pages/ReportesConvocatoriaPage";
import GestionUsuarios from "./pages/GestionUsuarios";

// Admin
import ConvocatoriasPage from "./pages/admin/ConvocatoriasPage";
import CrearConvocatoriaPage from "./pages/admin/CrearConvocatoriaPage";
import CatalogoPanelPage from "./pages/admin/CatalogoPanelPage";
import RequisitosFormacionPage from './pages/RequisitosFormacionPage'

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

  const roleNivel = Number(
    user?.role_nivel ??
    user?.nivel ??
    user?.role?.nivel ??
    5
  );

  const esSuperAdmin = roleNivel === 1;
  const esAdmin = roleNivel === 2;
  const esComision = roleNivel === 3;
  const esDocente = roleNivel === 5;
  const esStaff = roleNivel <= 3;

  useEffect(() => {
    if (!user || Object.keys(user).length === 0) return;

    const currentPath = window.location.pathname;

    if (esDocente && currentPath === "/dashboard") {
      history.push("/convocatorias/publicas");
    }
  }, [user, history, esDocente]);

  return (
    <Suspense fallback={<LayoutSplashScreen />}>
      <Switch>
        {/* Perfil e inicio */}
        <ContentRoute path="/mi-perfil" component={MiPerfilPage} />
        <Redirect exact from="/" to="/mi-perfil" />
        <ContentRoute path="/dashboard" component={DashboardPage} />

        {/* Docente: Selección de Plaza */}
        <Route
          path="/seleccion-plaza"
          exact
          render={(props) =>
            esDocente ? (
              <SeleccionPlazaPage {...props} />
            ) : (
              <Redirect to="/dashboard" />
            )
          }
        />

        {/* Docente: Formación Académica y Profesional */}
        <Route
          path="/requisitos-formacion/:postulacionId?"
          exact
          render={(props) =>
            esDocente ? (
              <RequisitosFormacionPage {...props} />
            ) : (
              <Redirect to="/dashboard" />
            )
          }
        />

        {/* Docente: Mis Postulaciones */}
        <Route
          path="/mis-postulaciones"
          exact
          render={(props) =>
            esDocente ? (
              <MisPostulacionesPage {...props} />
            ) : (
              <Redirect to="/dashboard" />
            )
          }
        />

        {/* Vista docente: convocatorias disponibles */}
        <Route
          path="/convocatorias/publicas"
          exact
          render={(props) =>
            esDocente ? (
              <ConvocatoriasPublicasPage {...props} />
            ) : (
              <Redirect to="/convocatorias" />
            )
          }
        />

        {/* Vista Admin / SuperAdmin / Comisión */}
        <Route
          path="/convocatorias"
          exact
          render={(props) =>
            esStaff ? (
              <ConvocatoriasPage {...props} />
            ) : (
              <Redirect to="/convocatorias/publicas" />
            )
          }
        />

        {/* Crear Convocatoria */}
        <Route
          path="/crear-convocatoria"
          exact
          render={(props) =>
            esSuperAdmin || esAdmin ? (
              <CrearConvocatoriaPage {...props} />
            ) : (
              <Redirect to="/convocatorias" />
            )
          }
        />

        {/* Panel de Catálogo */}
        <Route
          path="/admin/catalogo"
          exact
          render={(props) =>
            esSuperAdmin ? (
              <CatalogoPanelPage {...props} />
            ) : (
              <Redirect to="/dashboard" />
            )
          }
        />

        {/* Reportes de Convocatorias */}
        <Route
          path="/reportes/convocatorias"
          exact
          render={(props) =>
            esStaff ? (
              <ReportesConvocatoriaPage {...props} />
            ) : (
              <Redirect to="/dashboard" />
            )
          }
        />

        {/* Gestión de Usuarios */}
        <Route
          path="/usuarios"
          exact
          render={(props) =>
            esSuperAdmin || esAdmin ? (
              <GestionUsuarios {...props} />
            ) : (
              <Redirect to="/dashboard" />
            )
          }
        />

        {/* Metronic */}
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