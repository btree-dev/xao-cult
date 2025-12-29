import React, { ReactNode } from 'react';
import FloatingNav from './FloatingNav';

type LayoutProps = {
  children: ReactNode;
  hideNav?: boolean;
};

const Layout = ({ children, hideNav = false }: LayoutProps) => {
  return (
    <>
      <main>{children}</main>
      {!hideNav && <FloatingNav />}
    </>
  );
};

export default Layout;
