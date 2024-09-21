import Navbar from "@/components/Navbar";

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
                            <Navbar />

         {children}
        </div>


  );
}
