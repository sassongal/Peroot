import Image from "next/image";

export function HeroSection() {
  return (
    <div className="flex justify-center max-w-4xl mx-auto w-full px-4 md:px-8 pt-4">
      <div className="hero-logo-container">
        <div className="hero-logo-ring hero-logo-ring-1" />
        <div className="hero-logo-ring hero-logo-ring-2" />
        <div className="hero-logo-ring hero-logo-ring-3" />
        <Image
          src="/Peroot-hero.png"
          alt="Peroot"
          className="hero-logo-image"
          width={720}
          height={392}
          sizes="360px"
          priority
        />
      </div>
    </div>
  );
}
