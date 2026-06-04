"use client";

import * as React from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface DateRangePreset {
  label: string;
  value: string;
  range: () => { from: Date; to: Date };
}

interface DateRangePickerLabels {
  filterByHeader: string;
  quickSelectHeader: string;
  clearFilter: string;
}

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  presets: DateRangePreset[];
  labels: DateRangePickerLabels;
  dateFnsLocale: Locale;
  placeholder?: string;
  triggerClassName?: string;
  secondaryOptions?: {
    label: string;
    value: string;
    active: boolean;
    onClick: () => void;
  }[];
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  presets,
  labels,
  dateFnsLocale,
  placeholder,
  triggerClassName,
  secondaryOptions,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<string | null>(null);

  const handlePreset = (preset: DateRangePreset) => {
    const { from, to } = preset.range();
    onDateRangeChange({ from, to });
    setActivePreset(preset.value);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onDateRangeChange(range);
    setActivePreset(null);
  };

  const handleClear = () => {
    onDateRangeChange(undefined);
    setActivePreset(null);
  };

  const displayValue = React.useMemo(() => {
    if (activePreset) {
      const preset = presets.find((p) => p.value === activePreset);
      if (preset) return preset.label;
    }
    if (dateRange?.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, "d MMM yyyy", { locale: dateFnsLocale })} – ${format(dateRange.to, "d MMM yyyy", { locale: dateFnsLocale })}`;
      }
      return format(dateRange.from, "d MMM yyyy", { locale: dateFnsLocale });
    }
    return null;
  }, [dateRange, activePreset, presets, dateFnsLocale]);

  const triggerButton = (
    <Button
      variant="outline"
      className={cn(
        "justify-start text-left font-normal",
        !displayValue && "text-muted-foreground",
        triggerClassName
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
      <span className="truncate">{displayValue || placeholder}</span>
    </Button>
  );

  const presetsContent = (
    <>
      {secondaryOptions && secondaryOptions.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
            {labels.filterByHeader}
          </p>
          <div className="flex flex-col gap-0.5 mb-2">
            {secondaryOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={opt.active ? "secondary" : "ghost"}
                size="sm"
                className="justify-start text-xs h-7"
                onClick={opt.onClick}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <Separator className="mb-2" />
        </>
      )}
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
        {labels.quickSelectHeader}
      </p>
      {presets.map((preset) => (
        <Button
          key={preset.value}
          variant={activePreset === preset.value ? "secondary" : "ghost"}
          size="sm"
          className="justify-start text-xs h-7"
          onClick={() => handlePreset(preset)}
        >
          {preset.label}
        </Button>
      ))}
      <Separator className="my-1" />
      <Button
        variant="ghost"
        size="sm"
        className="justify-start text-xs h-7 text-muted-foreground"
        onClick={handleClear}
      >
        {labels.clearFilter}
      </Button>
    </>
  );

  return (
    <>
      {/* Desktop: Popover */}
      <div className="hidden md:block">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {triggerButton}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="flex flex-col gap-1 border-r p-3 w-48">
                {presetsContent}
              </div>
              <div className="p-3">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={2}
                  locale={dateFnsLocale as any}
                  weekStartsOn={1}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile: Sheet from bottom */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            {triggerButton}
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] px-0">
            <SheetHeader className="px-4 pb-2">
              <SheetTitle>Datum filter</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full px-4 pb-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {secondaryOptions?.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={opt.active ? "secondary" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={opt.onClick}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {presets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={activePreset === preset.value ? "secondary" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => handlePreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={handleClear}
                >
                  {labels.clearFilter}
                </Button>
              </div>

              <Separator className="mb-4" />

              <div className="flex justify-center">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={1}
                  locale={dateFnsLocale as any}
                  weekStartsOn={1}
                />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

export function getDefaultPresets(t: (key: string) => string): DateRangePreset[] {
  const now = new Date();

  return [
    {
      label: t("dateRange.today"),
      value: "today",
      range: () => ({ from: startOfDay(now), to: endOfDay(now) }),
    },
    {
      label: t("dateRange.yesterday"),
      value: "yesterday",
      range: () => {
        const yesterday = subDays(now, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      },
    },
    {
      label: t("dateRange.thisWeek"),
      value: "this-week",
      range: () => ({
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      }),
    },
    {
      label: t("dateRange.last7Days"),
      value: "last-7",
      range: () => ({ from: startOfDay(subDays(now, 6)), to: endOfDay(now) }),
    },
    {
      label: t("dateRange.thisMonth"),
      value: "this-month",
      range: () => ({
        from: startOfMonth(now),
        to: endOfMonth(now),
      }),
    },
    {
      label: t("dateRange.last30Days"),
      value: "last-30",
      range: () => ({ from: startOfDay(subDays(now, 29)), to: endOfDay(now) }),
    },
    {
      label: t("dateRange.last3Months"),
      value: "last-3-months",
      range: () => ({ from: startOfDay(subMonths(now, 3)), to: endOfDay(now) }),
    },
  ];
}
