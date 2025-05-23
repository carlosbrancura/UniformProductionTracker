import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, format: "short" | "long" = "short") {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (format === "long") {
    return dateObj.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }
  
  return dateObj.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: Date | string) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("pt-BR");
}
