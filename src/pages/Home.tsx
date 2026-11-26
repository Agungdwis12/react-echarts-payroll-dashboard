import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, LayoutGrid, FileBarChart, Wallet, ChartNoAxesColumnIncreasing, Database } from "lucide-react";

import HomeImage from "../assets/Home.png";

const modules = [
  {
    title: "Kinerja Layanan Divisi",
    description: "Pantau capaian SLA dan kualitas layanan tiap divisi.",
    path: "/dashboard/kinerja-layanan",
    icon: LayoutGrid,
    iconStyle: "bg-sky-400/15 text-sky-300",
  },
  {
    title: "BAPP & Revenue",
    description: "Lihat status BAPP dan rekap pendapatan per periode.",
    path: "/dashboard/bapp",
    icon: FileBarChart,
    iconStyle: "bg-emerald-400/15 text-emerald-300",
  },
  {
    title: "Target & Cost",
    description: "Bandingkan target dengan realisasi biaya operasional.",
    path: "/dashboard/cost",
    icon: Wallet,
    iconStyle: "bg-amber-400/15 text-amber-300",
  },
  {
    title: "Team Performance",
    description: "Evaluasi produktivitas dan kinerja anggota tim.",
    path: "/dashboard/team-performance",
    icon: ChartNoAxesColumnIncreasing,
    iconStyle: "bg-violet-400/15 text-violet-300",
  },
  {
    title: "DMS",
    description: "Kelola dan unggah data melalui Data Management System.",
    path: "/dashboard/dms",
    icon: Database,
    iconStyle: "bg-orange-400/15 text-orange-300",
  },
];

const Home: React.FC = () => {
  const [search, setSearch] = useState("");

  const filteredModules = useMemo(() => modules.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase())), [search]);

  return (
    <main className="relative mx-auto w-full max-w-[1500px] space-y-5 overflow-hidden text-slate-100">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-[24px] border border-slate-700/60 bg-gradient-to-br from-[#14233B] via-[#101D32] to-[#111B2D] px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:px-6 lg:px-7 lg:py-6">
        <div className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-[28%] -z-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="grid items-center gap-5 md:grid-cols-[1fr_0.9fr] lg:gap-7">
          <div className="max-w-[620px]">
            <p className="text-sm text-slate-300">
              Selamat datang, <span className="font-bold text-white">Payroll User</span>
            </p>

            <h1 className="mt-3 text-2xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-3xl lg:text-[2.15rem] xl:text-4xl">
              Kinerja terpantau,
              <span className="block bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-transparent">keputusan lebih terarah.</span>
            </h1>

            <p className="mt-3 max-w-[560px] text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
              Payroll Operation Performance System menyatukan seluruh dashboard kebutuhan Payroll Operation dalam satu tempat — untuk memantau kinerja, dan mengevaluasi operasional dengan lebih mudah.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#akses-cepat"
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById("akses-cepat")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-2.5 text-[11px] font-bold text-[#08213A] shadow-lg shadow-sky-950/25 transition hover:-translate-y-0.5 hover:bg-sky-300"
              >
                Jelajahi Dashboard
                <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[520px] items-center justify-center md:max-w-none">
            <div className="pointer-events-none absolute inset-[12%] rounded-full bg-sky-400/20 blur-3xl" />

            <img
              src={HomeImage}
              alt="Ilustrasi tim Payroll Operation berkolaborasi menggunakan dashboard analitik"
              className="relative z-10 block h-auto max-h-[300px] w-full rounded-[28px] object-contain drop-shadow-[0_18px_35px_rgba(0,0,0,0.3)] sm:max-h-[330px] lg:max-h-[360px]"
            />
          </div>
        </div>
      </section>

      {/* Akses cepat */}
      <section id="akses-cepat" className="scroll-mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">Akses cepat</h2>
            <p className="mt-1 text-xs text-slate-500">Pilih modul untuk mulai bekerja</p>
          </div>

          <span className="text-xs text-slate-500">{search ? `${filteredModules.length} modul ditemukan` : "5 modul tersedia"}</span>
        </div>

        {/* Pencarian modul */}
        <div className="mb-3 flex justify-end">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari modul..."
              className="w-full rounded-lg border border-slate-700 bg-[#111D31] py-2 pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>
        </div>

        {filteredModules.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredModules.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group rounded-xl border border-slate-700/60 bg-[#111D31] p-3 transition duration-200 hover:-translate-y-1 hover:border-sky-400/30 hover:bg-[#15243B] hover:shadow-lg hover:shadow-black/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconStyle}`}>
                      <Icon size={19} />
                    </span>
                  </div>

                  <h3 className="mt-2 text-xs font-bold text-white">{item.title}</h3>

                  <p className="mt-1 min-h-8 text-[11px] leading-4 text-slate-400">{item.description}</p>

                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 transition group-hover:text-sky-300">
                    Buka modul
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700/60 bg-[#111D31] px-5 py-8 text-center">
            <Search className="mx-auto text-slate-500" size={22} />
            <p className="mt-2 text-sm font-semibold text-slate-300">Modul tidak ditemukan</p>
            <p className="mt-1 text-xs text-slate-500">Coba gunakan kata kunci yang berbeda.</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-2 border-t border-slate-800/80 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Infomedia Nusantara · Payroll Operation</span>
        <span>Satu platform, informasi terintegrasi</span>
      </footer>
    </main>
  );
};

export default Home;
