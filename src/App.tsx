/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'motion/react';
import Lenis from 'lenis';
import { MapPin, Search, ChevronRight, Star, Leaf, ShoppingBag, Menu, X, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Data ---
const STALLS = [
  { id: 1, name: "SS2 Durian House", location: "Petaling Jaya", coords: [101.6224, 3.1186] as [number, number], rating: 4.8, status: "High Stock", varieties: ["Musang King", "D24"] },
  { id: 2, name: "Durian BB Park", location: "Kuala Lumpur", coords: [101.7115, 3.1466] as [number, number], rating: 4.9, status: "Limited Stock", varieties: ["Black Thorn", "XO"] },
  { id: 3, name: "Ah Seng Durian", location: "Geylang", coords: [103.8822, 1.3119] as [number, number], rating: 4.7, status: "Fresh Arrival", varieties: ["Mao Shan Wang", "Red Prawn"] },
  { id: 4, name: "The Durian Story", location: "Bukit Timah", coords: [103.7700, 1.3400] as [number, number], rating: 4.6, status: "High Stock", varieties: ["Black Gold", "D13"] },
  { id: 5, name: "Raub King", location: "Raub, Pahang", coords: [101.8552, 3.7891] as [number, number], rating: 4.9, status: "High Stock", varieties: ["Musang King", "D24"] },
  { id: 6, name: "Penang Hill Durian", location: "Air Itam, Penang", coords: [100.2765, 5.4012] as [number, number], rating: 4.8, status: "Fresh Arrival", varieties: ["Black Thorn", "Red Prawn"] },
];

// --- Components ---

const InteractiveMap = ({ activeStallId, onStallSelect }: { activeStallId: number | null, onStallSelect: (id: number) => void }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ [key: number]: maplibregl.Marker }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [101.9758, 4.2105], // Focused on Malaysia
      zoom: 5.5,
      pitch: 45, // 3D tilt
      bearing: -10,
    });

    map.current.on('load', () => {
      setIsLoading(false);
      
      // Add 3D buildings if the style supports it
      if (map.current) {
        map.current.addLayer({
          'id': '3d-buildings',
          'source': 'openmaptiles',
          'source-layer': 'building',
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['get', 'render_height'],
            'fill-extrusion-base': ['get', 'render_min_height'],
            'fill-extrusion-opacity': 0.6
          }
        });
      }
    });

    // Add markers
    STALLS.forEach((stall) => {
      const el = document.createElement('div');
      el.className = 'durian-marker-icon';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundImage = 'url(https://img.icons8.com/?size=100&id=32274&format=png&color=000000)';
      el.style.backgroundSize = 'cover';
      el.style.cursor = 'pointer';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(stall.coords)
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2 bg-durian-dark text-white">
            <h4 class="font-display font-bold text-lg">${stall.name}</h4>
            <p class="text-sm opacity-70">${stall.location}</p>
          </div>
        `))
        .addTo(map.current!);

      el.addEventListener('click', () => onStallSelect(stall.id));
      markers.current[stall.id] = marker;
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (activeStallId && map.current) {
      const stall = STALLS.find(s => s.id === activeStallId);
      if (stall) {
        map.current.flyTo({
          center: stall.coords,
          zoom: 14,
          pitch: 60,
          bearing: 0,
          essential: true,
          duration: 2000
        });
        
        // Highlight active marker
        Object.keys(markers.current).forEach(id => {
          const marker = markers.current[Number(id)];
          if (marker) {
            marker.getElement().classList.remove('active-marker');
          }
        });
        
        const activeMarker = markers.current[activeStallId];
        if (activeMarker) {
          activeMarker.getElement().classList.add('active-marker');
          activeMarker.togglePopup();
        }
      }
    }
  }, [activeStallId]);

  return (
    <div className="h-[400px] md:h-full w-full rounded-3xl overflow-hidden border border-white/10 relative z-0 bg-durian-dark" data-lenis-prevent>
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-durian-dark flex flex-col items-center justify-center gap-4"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-durian-gold/20 border-t-durian-gold rounded-full"
            />
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-40">Initializing 3D Map...</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
};

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Experience', href: '#experience' },
    { name: 'Varieties', href: '#varieties' },
    { name: 'Finder', href: '#finder' },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-500 px-4 md:px-6 py-4",
      isScrolled ? "bg-durian-dark/80 backdrop-blur-md border-b border-durian-gold/10 py-3" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl md:text-2xl font-display font-bold tracking-tighter flex items-center gap-2 text-durian-cream"
        >
          <div className="w-7 h-7 md:w-8 md:h-8 bg-durian-gold rounded-full flex items-center justify-center">
            <Leaf className="text-durian-dark w-4 h-4 md:w-5 md:h-5" />
          </div>
          DURIAN<span className="text-durian-gold">RUNTUH</span>
        </motion.div>

        <div className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-widest text-durian-cream/80">
          {navItems.map((item) => (
            <a key={item.name} href={item.href} className="hover:text-durian-gold transition-colors">
              {item.name}
            </a>
          ))}
          <button className="bg-durian-gold text-durian-dark px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform shadow-lg shadow-durian-gold/20">
            GET FRESH
          </button>
        </div>

        <button className="md:hidden p-2 glass rounded-full border-durian-gold/20 text-durian-cream" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full left-0 w-full bg-durian-dark/95 backdrop-blur-xl border-b border-durian-gold/10 overflow-hidden md:hidden"
          >
            <div className="p-6 flex flex-col gap-6">
              {navItems.map((item) => (
                <a 
                  key={item.name} 
                  href={item.href} 
                  onClick={() => setIsMenuOpen(false)} 
                  className="text-3xl font-display font-bold flex items-center justify-between group text-durian-cream"
                >
                  {item.name}
                  <ArrowRight className="opacity-0 group-hover:opacity-100 transition-all text-durian-gold" />
                </a>
              ))}
              <button className="w-full bg-durian-gold text-durian-dark py-4 rounded-2xl font-bold text-lg shadow-xl shadow-durian-gold/20">
                GET FRESH NOW
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.1]);
  const [isAnimating, setIsAnimating] = useState(false);

  return (
    <section className="relative h-[100svh] flex items-center justify-center overflow-hidden spiky-border">
      <motion.div 
        style={{ y: y1, scale }}
        className="absolute inset-0 z-0"
      >
        <img 
          src="/durian2.png?auto=format&fit=crop&q=80&w=2000" 
          alt="Durian Background" 
          className="w-full h-full object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-1000"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-durian-dark/60 via-durian-dark/20 to-durian-dark" />
      </motion.div>

      <div className="relative z-10 text-center px-4 w-full max-w-5xl flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            rotateY: isAnimating ? [0, 360] : 0,
            rotateX: isAnimating ? [0, 20, 0] : 0
          }}
          transition={{ 
            opacity: { duration: 1 },
            scale: { duration: 1 },
            rotateY: { duration: 1.5, ease: "easeInOut" },
            rotateX: { duration: 1.5, ease: "easeInOut" }
          }}
          onClick={() => {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 1500);
          }}
          className="mb-8 cursor-pointer perspective-1000 group"
        >
          <div className="relative w-32 h-32 md:w-48 md:h-48">
            <motion.img 
              src="https://img.icons8.com/?size=100&id=YoLrMrlkxOz8&format=png&color=000000" 
              alt="Floating Durian"
              className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(234,179,8,0.5)] group-hover:drop-shadow-[0_20px_50px_rgba(234,179,8,0.8)] transition-all"
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-durian-gold/20 blur-xl rounded-full" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="font-mono text-durian-gold uppercase tracking-[0.3em] md:tracking-[0.5em] text-[10px] md:text-sm mb-4 md:mb-6 block drop-shadow-lg">
            The King of Fruits
          </span>
          <h1 className="text-[18vw] md:text-[12vw] font-display font-black leading-[0.85] tracking-tighter uppercase text-durian-cream">
            DURIAN<br />
            <span className="text-stroke">RUNTUH</span>
          </h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-sm md:text-lg max-w-md mx-auto font-light tracking-wide px-4 text-durian-cream/80"
          >
            Discover the most exquisite durian varieties from the heart of Southeast Asia.
          </motion.p>
        </motion.div>

        <motion.div 
          style={{ opacity }}
          className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
        >
          <span className="font-mono text-[8px] md:text-[10px] uppercase tracking-widest opacity-50 text-durian-cream">Scroll to explore</span>
          <div className="w-[1px] h-8 md:h-12 bg-gradient-to-b from-durian-gold to-transparent" />
        </motion.div>
      </div>
    </section>
  );
};

const SectionHeading = ({ title, subtitle, number }: { title: string, subtitle: string, number: string }) => {
  return (
    <div className="mb-12 md:mb-16 flex items-end justify-between border-b border-white/10 pb-6 md:pb-8">
      <div>
        <span className="font-mono text-durian-gold text-[10px] md:text-sm mb-2 block uppercase tracking-widest">{subtitle}</span>
        <h2 className="text-4xl md:text-7xl font-display font-bold tracking-tight text-durian-cream">{title}</h2>
      </div>
      <span className="text-6xl md:text-8xl font-display font-black opacity-10 leading-none text-durian-gold">{number}</span>
    </div>
  );
};

const Varieties = () => {
  const varieties = [
    { name: "Musang King", origin: "Pahang", profile: "Creamy, Bitter-Sweet", img: "/durian2.png" },
    { name: "Black Thorn", origin: "Penang", profile: "Intense, Wine-like", img: "/durian2.png" },
    { name: "D24 Sultan", origin: "Johor", profile: "Classic, Milky", img: "/durian2.png" },
    { name: "Red Prawn", origin: "Penang", profile: "Sweet, Fibrous", img: "/durian2.png" },
    { name: "XO Durian", origin: "Pahang", profile: "Alcoholic, Bitter", img: "/durian2.png" },
  ];

  return (
    <section id="varieties" className="py-24 md:py-32 px-4 md:px-6 max-w-7xl mx-auto overflow-hidden">
      <SectionHeading title="The Selection" subtitle="Curated Varieties" number="01" />
      
      {/* Container for the fan effect */}
      <div className="relative flex justify-center items-center min-h-[500px] mt-12">
        {varieties.map((v, i) => {
          // Calculate the distance from the center card
          const centerIndex = (varieties.length - 1) / 2;
          const distanceFromCenter = i - centerIndex;
          
          return (
            <motion.div
              key={v.name}
              initial={{ opacity: 0, y: 100 }}
              whileInView={{ 
                opacity: 1, 
                y: Math.abs(distanceFromCenter) * 30, // Creates the arc/curved bottom
                x: distanceFromCenter * 150, // Spacing between cards
                rotate: distanceFromCenter * 10, // The "Fan" rotation
              }}
              viewport={{ once: true }}
              whileHover={{ 
                y: Math.abs(distanceFromCenter) * 20 - 50, // Lift up on hover
                scale: 1.05,
                zIndex: 50,
                transition: { duration: 0.3 }
              }}
              style={{ 
                zIndex: i,
                position: i === Math.floor(centerIndex) ? 'relative' : 'absolute' 
              }}
              className="group w-[280px] aspect-[3/4] overflow-hidden rounded-3xl bg-durian-dark border border-white/10 shadow-2xl cursor-pointer"
            >
              <img 
                src={v.img} 
                alt={v.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <span className="font-mono text-[10px] text-durian-gold uppercase tracking-widest">{v.origin}</span>
                <h3 className="text-2xl font-display font-bold mb-1 text-durian-cream">{v.name}</h3>
                <p className="text-sm text-durian-cream/60">{v.profile}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

const Finder = () => {
  const [activeStallId, setActiveStallId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStalls = useMemo(() => {
    return STALLS.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <section id="finder" className="py-20 md:py-24 px-4 md:px-6 bg-durian-green/10 spiky-border">
      <div className="max-w-7xl mx-auto">
        <SectionHeading title="The Finder" subtitle="Real-time Availability" number="02" />
        
        <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
          <div className="lg:col-span-4 space-y-6">
            <div className="glass p-6 md:p-8 rounded-3xl border-durian-gold/20">
              <h3 className="text-xl md:text-2xl font-display font-bold mb-6 text-durian-cream">Search Stalls</h3>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-durian-gold/40 w-5 h-5" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter location or name..." 
                  className="w-full bg-durian-dark/50 border border-durian-gold/20 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-durian-gold transition-colors text-sm text-durian-cream placeholder:text-durian-cream/30"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {['Musang King', 'D24', 'Black Thorn', 'XO'].map(tag => (
                  <button key={tag} className="text-[9px] uppercase tracking-widest font-mono px-3 py-1.5 rounded-full border border-durian-gold/20 text-durian-gold hover:bg-durian-gold hover:text-durian-dark transition-all">
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredStalls.map((stall, i) => (
                <motion.div
                  key={stall.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setActiveStallId(stall.id)}
                  className={cn(
                    "group glass p-4 rounded-2xl flex items-center justify-between hover:bg-durian-gold/10 transition-all cursor-pointer border-l-4",
                    activeStallId === stall.id ? "border-l-durian-gold bg-durian-gold/10" : "border-l-transparent"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      activeStallId === stall.id ? "bg-durian-gold text-durian-dark" : "bg-durian-gold/10 text-durian-gold"
                    )}>
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-display font-bold text-durian-cream">{stall.name}</h4>
                      <p className="text-[10px] opacity-50 flex items-center gap-1 uppercase tracking-wider text-durian-cream/60">
                        {stall.location} • <Star className="w-2.5 h-2.5 fill-durian-gold text-durian-gold" /> {stall.rating}
                      </p>
                      <AnimatePresence>
                        {activeStallId === stall.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 flex flex-wrap gap-1.5"
                          >
                            {stall.varieties.map(v => (
                              <span key={v} className="text-[8px] font-mono uppercase tracking-widest bg-durian-gold/20 text-durian-gold px-2 py-1 rounded-md border border-durian-gold/40">
                                {v}
                              </span>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 transition-all",
                    activeStallId === stall.id ? "opacity-100 translate-x-1 text-durian-gold" : "opacity-20"
                  )} />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 h-[400px] md:h-[650px]">
            <InteractiveMap activeStallId={activeStallId} onStallSelect={setActiveStallId} />
          </div>
        </div>
      </div>
    </section>
  );
};

const Experience = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1]);
  const rotate = useTransform(scrollYProgress, [0, 0.5], [3, 0]);

  return (
    <section id="experience" ref={containerRef} className="py-20 md:py-24 px-4 md:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <motion.div style={{ scale, rotate }} className="relative aspect-square rounded-3xl overflow-hidden border border-durian-gold/20">
            <img 
              src="durian.png?auto=format&fit=crop&q=80&w=1000" 
              alt="Durian Detail" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-3xl" />
          </motion.div>
          
          <div className="px-2">
            <span className="font-mono text-durian-gold text-[10px] md:text-sm mb-4 block uppercase tracking-[0.3em]">The Craft</span>
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 md:mb-8 leading-[1.1] text-durian-cream">Beyond just a fruit, it's a legacy.</h2>
            <p className="text-base md:text-lg text-durian-cream/60 leading-relaxed mb-8 font-light">
              We believe that finding the perfect durian should be as exquisite as the fruit itself. Our platform connects connoisseurs with the most reputable orchards and stalls across the region.
            </p>
            <div className="grid grid-cols-2 gap-6 md:gap-10">
              <div className="glass p-4 md:p-6 rounded-2xl border-durian-gold/10">
                <h4 className="text-2xl md:text-4xl font-display font-bold text-durian-gold">50+</h4>
                <p className="text-[9px] md:text-[10px] font-mono uppercase tracking-widest opacity-40 mt-1 text-durian-cream">Verified Stalls</p>
              </div>
              <div className="glass p-4 md:p-6 rounded-2xl border-durian-gold/10">
                <h4 className="text-2xl md:text-4xl font-display font-bold text-durian-gold">12</h4>
                <p className="text-[9px] md:text-[10px] font-mono uppercase tracking-widest opacity-40 mt-1 text-durian-cream">Rare Varieties</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-12 md:py-16 px-4 md:px-6 border-t border-durian-gold/10 bg-durian-dark">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="text-2xl font-display font-bold tracking-tighter text-durian-cream">
          DURIAN<span className="text-durian-gold">RUNTUH</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-[9px] md:text-[10px] font-mono uppercase tracking-widest opacity-40 text-durian-cream">
          <a href="#" className="hover:text-durian-gold transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-durian-gold transition-colors">Instagram</a>
          <a href="#" className="hover:text-durian-gold transition-colors">Twitter</a>
        </div>
        <p className="text-[9px] md:text-[10px] font-mono uppercase tracking-widest opacity-40 text-center text-durian-cream">
          © 2025 DurianRuntuh. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

// --- Main App ---

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-durian-dark selection:bg-durian-gold selection:text-durian-dark">
      <Navbar />
      <main>
        <Hero />
        <Experience />
        <Varieties />
        <Finder />
      </main>
      <Footer />
      
      {/* Global Background Noise/Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('durian.png')]" />
    </div>
  );
}
