import HomeClient from "./HomeClient";
import { HomeSEOContent } from "@/components/seo/HomeSEOContent";

export default function HomePage() {
  return (
    <>
      <HomeSEOContent />
      <HomeClient />
    </>
  );
}
