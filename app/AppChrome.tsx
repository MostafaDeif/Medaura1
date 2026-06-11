"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/nav/nav";
import Footer from "@/components/footer/footer";

type ClientLocation = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export default function AppChrome({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearLocation = () => {
      localStorage.removeItem("client_latitude");
      localStorage.removeItem("client_longitude");
      localStorage.removeItem("client_city");
      localStorage.removeItem("client_region");
      localStorage.removeItem("client_country");
    };

    const cacheLocation = (location: ClientLocation) => {
      if (
        typeof location.latitude !== "number" ||
        typeof location.longitude !== "number"
      ) {
        clearLocation();
        return;
      }

      localStorage.setItem("client_latitude", String(location.latitude));
      localStorage.setItem("client_longitude", String(location.longitude));

      if (location.city) localStorage.setItem("client_city", location.city);
      else localStorage.removeItem("client_city");

      if (location.region) {
        localStorage.setItem("client_region", location.region);
      } else {
        localStorage.removeItem("client_region");
      }

      if (location.country) {
        localStorage.setItem("client_country", location.country);
      } else {
        localStorage.removeItem("client_country");
      }
    };

    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      const lat = localStorage.getItem("client_latitude");
      const lon = localStorage.getItem("client_longitude");
      const city = localStorage.getItem("client_city");
      const region = localStorage.getItem("client_region");
      const country = localStorage.getItem("client_country");

      if (lat && lon) {
        init = init || {};
        const headers = new Headers(
          input instanceof Request ? input.headers : undefined
        );

        if (init.headers) {
          new Headers(init.headers).forEach((val, key) => {
            headers.set(key, val);
          });
        }

        if (!headers.has("x-client-latitude")) {
          headers.set("X-Client-Latitude", lat);
        }
        if (!headers.has("x-client-longitude")) {
          headers.set("X-Client-Longitude", lon);
        }
        if (city && !headers.has("x-client-city")) {
          headers.set("X-Client-City", encodeURIComponent(city));
        }
        if (region && !headers.has("x-client-region")) {
          headers.set("X-Client-Region", encodeURIComponent(region));
        }
        if (country && !headers.has("x-client-country")) {
          headers.set("X-Client-Country", encodeURIComponent(country));
        }

        init.headers = headers;
      }

      return originalFetch.call(this, input, init);
    };

    const loadLocationFromApi = (url: string) =>
      originalFetch(url, {
        cache: "no-store",
        credentials: "include",
      })
        .then((response) => response.json())
        .then((result) => {
          if (!result?.success || !result.data) {
            throw new Error("Location is unavailable");
          }

          return result.data as ClientLocation;
        });

    const loadIpLocation = () =>
      loadLocationFromApi("/api/location")
        .then(cacheLocation)
        .catch(clearLocation);

    clearLocation();

    loadIpLocation();

    window.addEventListener("medaura:refresh-location", loadIpLocation);

    return () => {
      window.removeEventListener("medaura:refresh-location", loadIpLocation);
      window.fetch = originalFetch;
    };
  }, []);
  const pathname = usePathname();
  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/doctorDash") ||
    pathname.startsWith("/clinicDash");
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/verify-reset-otp") ||
    pathname.startsWith("/resetPassword") ||
    pathname.startsWith("/passwordResetSent") ||
    pathname.startsWith("/emailVerfication") ||
    pathname.startsWith("/doctorDocument") ||
    pathname.startsWith("/pending");

  if (isDashboardRoute || isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="lg:px-12 xl:px-24">{children}</div>
      <Footer />
    </>
  );
}
