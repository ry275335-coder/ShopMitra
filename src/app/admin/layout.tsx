import React from 'react';

export const metadata = {
  title: 'Admin Control Center | ShopMitra',
  description: 'Master Administrative Governance & Discovery Platform Controls',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
