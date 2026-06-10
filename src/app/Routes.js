import React from "react";
import { Redirect, Switch, Route } from "react-router-dom";
import { shallowEqual, useSelector } from "react-redux";
import { Layout } from "../_metronic/layout";
import BasePage from "./BasePage";
import { Logout, AuthPage } from "./modules/Auth";
import ErrorsPage from "./modules/ErrorsExamples/ErrorsPage";
import CompletarPerfilPage from './pages/CompletarPerfilPage'

// ── Admin ─────────────────────────────────────────────────────────────────────
import AdminNotasBilinguesPage from './pages/admin/AdminNotasBilinguesPage'
import CatalogoPanelPage from './pages/admin/CatalogoPanelPage'
import DocentesSancionadosPage from './pages/admin/DocentesSancionadosPage'

// ✅ Ya NO se importa ConvocatoriasPublicasPage ni SeleccionPlazaPage aquí
// Ambas están manejadas en BasePage.js con sus guards

export function Routes() {
  const { isAuthorized } = useSelector(
    ({ auth }) => ({ isAuthorized: auth.user != null }),
    shallowEqual
  );

  return (
    <Switch>
      {!isAuthorized ? (
        <Route><AuthPage /></Route>
      ) : (
        <Redirect from="/auth" to="/" />
      )}

      <Route path="/error" component={ErrorsPage} />
      <Route path="/logout" component={Logout} />

      {/* ── General ── */}
      {isAuthorized && (
        <Route path="/completar-perfil" exact>
          <Layout><CompletarPerfilPage /></Layout>
        </Route>
      )}

      {/* ── Admin ── */}
      {isAuthorized && (
        <Route path="/admin/bilingue/notas" exact>
          <Layout><AdminNotasBilinguesPage /></Layout>
        </Route>
      )}

      {isAuthorized && (
        <Route path="/admin/sanciones" exact>
          <Layout><DocentesSancionadosPage /></Layout>
        </Route>
      )}

      {isAuthorized && (
        <Route path="/admin/catalogo" exact>
          <Layout><CatalogoPanelPage /></Layout>
        </Route>
      )}

      {/* ── Todo lo demás → BasePage (con guards por rol) ── */}
      {!isAuthorized ? (
        <Redirect to="/auth/login" />
      ) : (
        <Layout><BasePage /></Layout>
      )}
    </Switch>
  );
}