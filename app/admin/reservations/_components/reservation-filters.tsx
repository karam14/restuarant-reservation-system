import { Dispatch, SetStateAction, useState } from 'react';

interface ReservationFiltersProps {
  filterStatus: string;
  setFilterStatus: Dispatch<SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  filterDate: string;
  setFilterDate: Dispatch<SetStateAction<string>>;
  filterCreationExactDate: string;
  setFilterCreationExactDate: Dispatch<SetStateAction<string>>;
  filterStartDate: string;
  setFilterStartDate: Dispatch<SetStateAction<string>>;
  filterEndDate: string;
  setFilterEndDate: Dispatch<SetStateAction<string>>;
  filterReservationStartDate: string;
  setFilterReservationStartDate: Dispatch<SetStateAction<string>>;
  filterReservationEndDate: string;
  setFilterReservationEndDate: Dispatch<SetStateAction<string>>;
  sortOrder: 'asc' | 'desc';
  setSortOrder: Dispatch<SetStateAction<'asc' | 'desc'>>;
}

export default function ReservationFilters({
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  filterDate,
  setFilterDate,
  filterCreationExactDate,
  setFilterCreationExactDate,
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate,
  filterReservationStartDate,
  setFilterReservationStartDate,
  filterReservationEndDate,
  setFilterReservationEndDate,
  sortOrder,
  setSortOrder
}: ReservationFiltersProps) {
  const [isReservationFiltersOpen, setReservationFiltersOpen] = useState(false);
  const [isCreationFiltersOpen, setCreationFiltersOpen] = useState(false);
  const [isSortingFiltersOpen, setSortingFiltersOpen] = useState(false);

  return (
    <div className="flex flex-col space-y-4">
      {/* Search Input */}
      <div className="flex flex-col">
        <label className="text-gray-700 text-sm font-medium mb-1">Zoeken op naam</label>
        <input
          type="text"
          placeholder="Naam invoeren..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Reserveringsdatum Filters */}
      <div className="border border-gray-300 rounded-lg p-3">
        <button
          className="w-full text-left font-semibold text-gray-700 flex justify-between"
          onClick={() => setReservationFiltersOpen(!isReservationFiltersOpen)}
        >
          📅 Reserveringsdatum Filters
          <span>{isReservationFiltersOpen ? '▲' : '▼'}</span>
        </button>
        {isReservationFiltersOpen && (
          <div className="mt-3 space-y-2">
            {/* Exact Date Filter */}
            <label className="text-gray-700 text-sm font-medium">Reserveringsdatum (exact)</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setFilterReservationStartDate('');
                  setFilterReservationEndDate('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 w-full"
              />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-red-500">✖</button>
              )}
            </div>

            {/* Date Range Filter */}
            <label className="text-gray-700 text-sm font-medium">Reserveringsdatum (range)</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filterReservationStartDate}
                onChange={(e) => {
                  setFilterReservationStartDate(e.target.value);
                  setFilterDate('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 w-full"
              />
              <input
                type="date"
                value={filterReservationEndDate}
                onChange={(e) => {
                  setFilterReservationEndDate(e.target.value);
                  setFilterDate('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 w-full"
              />
              {(filterReservationStartDate || filterReservationEndDate) && (
                <button onClick={() => { setFilterReservationStartDate(''); setFilterReservationEndDate(''); }} className="text-red-500">✖</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sorting Filter */}
      <div className="border border-gray-300 rounded-lg p-3">
        <button
          className="w-full text-left font-semibold text-gray-700 flex justify-between"
          onClick={() => setSortingFiltersOpen(!isSortingFiltersOpen)}
        >
          🔄 Sorteeropties
          <span>{isSortingFiltersOpen ? '▲' : '▼'}</span>
        </button>
        {isSortingFiltersOpen && (
          <div className="mt-3 space-y-2">
            <label className="text-gray-700 text-sm font-medium">Sorteer op</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 w-full"
            >
              <option value="asc">Oudste eerst</option>
              <option value="desc">Nieuwste eerst</option>
            </select>
          </div>
        )}
      </div>

      {/* Aanmaakdatum Filters */}
      <div className="border border-gray-300 rounded-lg p-3">
        <button
          className="w-full text-left font-semibold text-gray-700 flex justify-between"
          onClick={() => setCreationFiltersOpen(!isCreationFiltersOpen)}
        >
          🗓️ Aanmaakdatum Filters
          <span>{isCreationFiltersOpen ? '▲' : '▼'}</span>
        </button>
        {isCreationFiltersOpen && (
          <div className="mt-3 space-y-2">
            {/* Exact Date Filter */}
            <label className="text-gray-700 text-sm font-medium">Gemaakt op (exact)</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filterCreationExactDate}
                onChange={(e) => {
                  setFilterCreationExactDate(e.target.value);
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 w-full"
              />
              {filterCreationExactDate && (
                <button onClick={() => setFilterCreationExactDate('')} className="text-red-500">✖</button>
              )}
            </div>

            {/* Date Range Filter */}
            <label className="text-gray-700 text-sm font-medium">Gemaakt tussen</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setFilterCreationExactDate('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 w-full"
              />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setFilterCreationExactDate('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 w-full"
              />
              {(filterStartDate || filterEndDate) && (
                <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="text-red-500">✖</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
