'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ALL_NAV_ITEMS, MOBILE_PRIMARY } from './nav-config';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Logo } from './sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/lib/store/app-store';
import { LogOut } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { resetAll } = useApp();

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden">
        <nav className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
          {MOBILE_PRIMARY.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', active && 'fill-primary/10')} />
                {item.title}
              </Link>
            );
          })}
          <button
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </nav>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Logo />
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
            <nav className="space-y-5">
              {ALL_NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.title}
                    </Link>
                  </div>
                );
              })}
            </nav>
            <div className="mt-6 border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  if (confirm('Reset all data and start over?')) resetAll();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Reset data
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
