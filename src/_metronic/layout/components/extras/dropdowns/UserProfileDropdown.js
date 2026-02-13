/* eslint-disable no-restricted-imports */
/* eslint-disable no-script-url,jsx-a11y/anchor-is-valid */
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import Dropdown from "react-bootstrap/Dropdown";
import { useSelector } from "react-redux";
import objectPath from "object-path";
import { useHtmlClassService } from "../../../_core/MetronicLayout";
import { toAbsoluteUrl } from "../../../../_helpers";
import { DropdownTopbarItemToggler } from "../../../../_partials/dropdowns";

export function UserProfileDropdown() {
  const { user } = useSelector((state) => state.auth);
  const uiService = useHtmlClassService();
  const layoutProps = useMemo(() => {
    return {
      light:
        objectPath.get(uiService.config, "extras.user.dropdown.style") ===
        "light",
    };
  }, [uiService]);

  // ✅ Protección: si no hay usuario, no renderizar
  if (!user) return null;

  // ✅ Compatibilidad: nuestro backend retorna fullname, username, email
  // Metronic original esperaba firstname y lastname
  const fullname = user.fullname || user.username || "Usuario"
  const firstname = user.firstname || fullname.split(" ")[0] || "Usuario"
  const lastname = user.lastname || fullname.split(" ").slice(1).join(" ") || ""
  const inicial = firstname.charAt(0).toUpperCase()
  const email = user.email || ""
  const role = user.occupation || user.role || "Docente"

  return (
    <Dropdown drop="down" alignRight>
      <Dropdown.Toggle
        as={DropdownTopbarItemToggler}
        id="dropdown-toggle-user-profile"
      >
        <div className="btn btn-icon w-auto btn-clean d-flex align-items-center btn-lg px-2">
          <span className="text-muted font-weight-bold font-size-base d-none d-md-inline mr-1">
            Hola,
          </span>{" "}
          <span className="text-dark-50 font-weight-bolder font-size-base d-none d-md-inline mr-3">
            {firstname} {lastname}
          </span>
          <span className="symbol symbol-35 symbol-light-success">
            <span className="symbol-label font-size-h5 font-weight-bold">
              {inicial}
            </span>
          </span>
        </div>
      </Dropdown.Toggle>

      <Dropdown.Menu className="p-0 m-0 dropdown-menu-right dropdown-menu-anim dropdown-menu-top-unround dropdown-menu-xl">
        <>
          {layoutProps.light && (
            <>
              <div className="d-flex align-items-center p-8 rounded-top">
                <div className="symbol symbol-md bg-light-primary mr-3 flex-shrink-0">
                  <img src={toAbsoluteUrl("/media/users/300_21.jpg")} alt="" />
                </div>
                <div className="text-dark m-0 flex-grow-1 mr-3 font-size-h5">
                  {firstname} {lastname}
                </div>
                <span className="label label-light-success label-lg font-weight-bold label-inline">
                  {role}
                </span>
              </div>
              <div className="separator separator-solid"></div>
            </>
          )}

          {!layoutProps.light && (
            <div
              className="d-flex align-items-center justify-content-between flex-wrap p-8 bgi-size-cover bgi-no-repeat rounded-top"
              style={{
                backgroundImage: `url(${toAbsoluteUrl("/media/misc/bg-1.jpg")})`,
              }}
            >
              <div className="symbol bg-white-o-15 mr-3">
                <span className="symbol-label text-success font-weight-bold font-size-h4">
                  {inicial}
                </span>
              </div>
              <div className="text-white m-0 flex-grow-1 mr-3 font-size-h5">
                {firstname} {lastname}
              </div>
              <span className="label label-success label-lg font-weight-bold label-inline">
                {role}
              </span>
            </div>
          )}
        </>

        <div className="navi navi-spacer-x-0 pt-5">
          {/* Email del usuario */}
          <div className="px-8 py-3">
            <div className="text-muted font-weight-bold font-size-sm">
              {email}
            </div>
          </div>
          <div className="separator separator-solid"></div>

          <Link to="/user-profile" className="navi-item px-8 cursor-pointer">
            <div className="navi-link">
              <div className="navi-icon mr-2">
                <i className="flaticon2-calendar-3 text-success" />
              </div>
              <div className="navi-text">
                <div className="font-weight-bold cursor-pointer">Mi Perfil</div>
                <div className="text-muted">Configuración de cuenta</div>
              </div>
            </div>
          </Link>

          <a className="navi-item px-8">
            <div className="navi-link">
              <div className="navi-icon mr-2">
                <i className="flaticon2-mail text-warning"></i>
              </div>
              <div className="navi-text">
                <div className="font-weight-bold">Mis Mensajes</div>
                <div className="text-muted">Bandeja de entrada</div>
              </div>
            </div>
          </a>

          <a className="navi-item px-8">
            <div className="navi-link">
              <div className="navi-icon mr-2">
                <i className="flaticon2-rocket-1 text-danger"></i>
              </div>
              <div className="navi-text">
                <div className="font-weight-bold">Mis Actividades</div>
                <div className="text-muted">Registros y notificaciones</div>
              </div>
            </div>
          </a>

          <div className="navi-separator mt-3"></div>

          <div className="navi-footer px-8 py-5">
            <Link to="/logout" className="btn btn-light-primary font-weight-bold">
              Cerrar sesión
            </Link>
          </div>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}