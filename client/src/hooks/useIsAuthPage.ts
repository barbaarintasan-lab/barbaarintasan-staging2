import { useLocation } from "wouter";

/**
 * Custom hook to check if the current page is an authentication page.
 * Returns true for: /register, /login, /forgot-password, /reset-password/*
 */
export function useIsAuthPage(): boolean {
  const [location] = useLocation();
  
  return (
    location === "/register" ||
    location === "/login" ||
    location === "/forgot-password" ||
    location.startsWith("/reset-password")
  );
}
