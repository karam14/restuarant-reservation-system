
export const metadata = {
  title: 'Admin Dashboard',
};

export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
  return (
            <div>
         {children}
        </div>


  );
}
