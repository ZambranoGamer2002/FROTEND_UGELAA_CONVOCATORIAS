import React from "react";
import { Redirect, Switch, Route } from "react-router-dom";
import { shallowEqual, useSelector } from "react-redux";
import { Layout } from "../_metronic/layout";
import BasePage from "./BasePage";
import { Logout, AuthPage } from "./modules/Auth";
import ErrorsPage from "./modules/ErrorsExamples/ErrorsPage";
import CompletarPerfilPage from './pages/CompletarPerfilPage'
import SeleccionPlazaPage from './pages/SeleccionPlazaPage'
import AdminNotasBilinguesPage from './pages/admin/AdminNotasBilinguesPage'

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

      {isAuthorized && (
        <Route path="/completar-perfil" exact>
          <Layout><CompletarPerfilPage /></Layout>
        </Route>
      )}

      {isAuthorized && (
        <Route path="/seleccion-plaza" exact>
          <Layout><SeleccionPlazaPage /></Layout>
        </Route>
      )}

      {/* ── NUEVO ── */}
      {isAuthorized && (
        <Route path="/admin/bilingue/notas" exact>
          <Layout><AdminNotasBilinguesPage /></Layout>
        </Route>
      )}

      {!isAuthorized ? (
        <Redirect to="/auth/login" />
      ) : (
        <Layout><BasePage /></Layout>
      )}
    </Switch>
  );
}
