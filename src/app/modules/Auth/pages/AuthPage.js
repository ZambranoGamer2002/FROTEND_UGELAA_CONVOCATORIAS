/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react'
import {Switch, Redirect} from 'react-router-dom'
import {ContentRoute} from '../../../../_metronic/layout'

// Todos estos archivos están en la MISMA carpeta "pages"
import Login from './Login'
import Registration from './Registration'
import ForgotPassword from './ForgotPassword'
// Si ya no quieres los estilos clásicos, puedes comentar o borrar esta línea
// import '../../../../_metronic/_assets/sass/pages/login/classic/login-1.scss'

export function AuthPage() {
  return (
    <>
      <Switch>
        <ContentRoute path='/auth/login' component={Login} />
        <ContentRoute path='/auth/registration' component={Registration} />
        <ContentRoute path='/auth/forgot-password' component={ForgotPassword} />
        <Redirect from='/auth' exact={true} to='/auth/login' />
        <Redirect to='/auth/login' />
      </Switch>
    </>
  )
}
