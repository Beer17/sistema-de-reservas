import Dashboard from "@/components/Dashboard";
import StoreHydration from "@/components/StoreHydration";

export default function HomePage() {
  return (
    <StoreHydration>
      <Dashboard />
    </StoreHydration>
  );
}
