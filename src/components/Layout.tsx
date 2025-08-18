import React, { ReactNode } from 'react';
import FloatingNav from './FloatingNav';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <main>{children}</main>
      <FloatingNav />
    </>
  );
};

export default Layout;
