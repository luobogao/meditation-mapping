import React from "react";
import {Outlet} from "react-router-dom";
import Navbar from "../navbar";

const Layout = () => {
  return (
    <>
      
      <Outlet />
    </>
  );
};

export default Layout;