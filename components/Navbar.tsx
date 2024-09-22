'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown, LogOut } from 'lucide-react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isReservationsOpen, setIsReservationsOpen] = useState(false);
  const [isTimeSlotsOpen, setIsTimeSlotsOpen] = useState(false);

  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const router = useRouter();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsReservationsOpen(false);
    setIsTimeSlotsOpen(false);
  };

  const toggleReservationsDropdown = () => {
    setIsReservationsOpen(!isReservationsOpen);
  };

  const toggleTimeSlotsDropdown = () => {
    setIsTimeSlotsOpen(!isTimeSlotsOpen);
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center">
        <div className="text-white text-2xl font-bold mb-4 lg:mb-0">Admin Dashboard</div>
        <Button
          variant="ghost"
          className="lg:hidden text-white self-end"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} w-full lg:w-auto lg:flex lg:space-x-4 lg:items-center`}>
          <div className="flex flex-col lg:flex-row lg:space-x-4 w-full">
            <div className="w-full lg:w-auto">
              <Link href="/admin" onClick={toggleMobileMenu} className="block w-full py-2 px-4 text-left text-white">
                Home
              </Link>
            </div>

            <div className="w-full lg:w-auto relative">
              <div className="flex justify-between items-center lg:inline-block">
                <Link
                  href="/admin/reservations"
                  onClick={toggleMobileMenu}
                  className="block w-full py-2 px-4 text-left text-white bg-gray-700 hover:bg-gray-600"
                >
                  Reserveringen
                </Link>
                <Button
                  variant="ghost"
                  className="lg:hidden text-white"
                  onClick={toggleReservationsDropdown}
                  aria-label="Toggle Reservations"
                >
                  <ChevronDown />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden lg:inline-flex text-white">
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className={`bg-gray-700 text-white mt-2 rounded-md p-2 ${isReservationsOpen ? 'block' : 'hidden'} lg:block`}
                >
                  <DropdownMenuItem>
                    <Link href="/admin/reservations/create" onClick={toggleMobileMenu} className="block w-full text-left">
                      Nieuwe Reservering
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/admin/reservations" onClick={toggleMobileMenu} className="block w-full text-left">
                      Reserveringen Beheren
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="w-full lg:w-auto relative">
              <div className="flex justify-between items-center lg:inline-block">
                <Link
                  href="/admin/time-slots"
                  onClick={toggleMobileMenu}
                  className="block w-full py-2 px-4 text-left text-white bg-gray-700 hover:bg-gray-600"
                >
                  Tijdslots
                </Link>
                <Button
                  variant="ghost"
                  className="lg:hidden text-white"
                  onClick={toggleTimeSlotsDropdown}
                  aria-label="Toggle Time Slots"
                >
                  <ChevronDown />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden lg:inline-flex text-white">
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className={`bg-gray-700 text-white mt-2 rounded-md p-2 ${isTimeSlotsOpen ? 'block' : 'hidden'} lg:block`}
                >
                  <DropdownMenuItem>
                    <Link href="/admin/time-slots/create" onClick={toggleMobileMenu} className="block w-full text-left">
                      Nieuw Tijdslot
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/admin/time-slots" onClick={toggleMobileMenu} className="block w-full text-left">
                      Tijdslots Beheren
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link
                      href="/admin/time-slots/create-day-time-slot"
                      onClick={toggleMobileMenu}
                      className="block w-full text-left"
                    >
                      Nieuwe Dag Tijdslot
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link
                      href="/admin/time-slots/edit-day-time-slot"
                      onClick={toggleMobileMenu}
                      className="block w-full text-left"
                    >
                      Dag Tijdslot Bewerken
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {session && (
              <div className="w-full lg:w-auto">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="block w-full py-2 px-4 text-left text-white bg-gray-700 hover:bg-gray-600"
                >
                  <LogOut className="inline-block mr-2" />
                  Uitloggen
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
