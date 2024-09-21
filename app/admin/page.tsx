import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">Beheer Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="border border-gray-300 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Reserveringen Beheren</h2>
          <p className="mb-4">Bekijk en beheer alle reserveringen die door gasten zijn gemaakt.</p>
          <Link href="/admin/reservations" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Ga naar Reserveringen
          </Link>
        </div>

        <div className="border border-gray-300 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Tijdsloten Beheren</h2>
          <p className="mb-4">Definieer en beheer beschikbare tijdsloten voor reserveringen.</p>
          <Link href="/admin/time-slots" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Ga naar Tijdsloten
          </Link>
        </div>

        <div className="border border-gray-300 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Feestdagen Beheren</h2>
          <p className="mb-4">Configureer feestdagen en andere speciale dagen waarop reserveringen gesloten moeten zijn.</p>
          <Link href="/admin/holidays" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Ga naar Feestdagen
          </Link>
        </div>
      </div>
    </div>
  );
}
