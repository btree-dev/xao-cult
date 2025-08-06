import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import FloatingNav from './FloatingNav';

type LayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <FloatingNav />
    </>
  );
};

export default Layout;
