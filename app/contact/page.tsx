"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  MessageCircleCheck,
  Phone,
  Globe,
  MapPin,
  Send,
  Home,
} from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const { error } = await supabase.from("contact_messages").insert([
        {
          name: formData.name,
          email: formData.email,
          message: formData.message,
          status: "unread",
        },
      ]);

      if (error) throw error;

      setStatus("success");
      setFormData({ name: "", email: "", message: "" });
    } catch (error: any) {
      console.error("Supabase Error:", error.message);
      setStatus("error");
    }
  };

  const contactMethods = [
    {
      icon: Phone,
      title: "Phone",
      value: "+91 98920 160376",
      link: "tel:+9198920160376",
    },
    {
      icon: MessageCircleCheck,
      title: "WhatsApp",
      value: "+91 97024 85146",
      link: "https://wa.me/9702485146",
    },
    {
      icon: Globe,
      title: "Website",
      value: "www.cricsynclive.in",
      link: "https://www.cricsynclive.in",
    },
    {
      icon: MapPin,
      title: "Location",
      value: "Mumbai, Maharashtra",
      link: null,
    },
  ];

  const socialLinks = [
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 93 93"
          fill="none"
          className="w-6 h-6 shrink-0"
        >
          <rect
            x="1.13867"
            y="1"
            width="91.5618"
            height="91.5618"
            rx="15"
            fill="#FF0000"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M67.5615 29.2428C69.8115 29.8504 71.58 31.6234 72.1778 33.8708C73.2654 37.9495 73.2654 46.4647 73.2654 46.4647C73.2654 46.4647 73.2654 54.98 72.1778 59.0586C71.5717 61.3144 69.8032 63.0873 67.5615 63.6866C63.4932 64.7771 47.1703 64.7771 47.1703 64.7771C47.1703 64.7771 30.8557 64.7771 26.7791 63.6866C24.5291 63.079 22.7606 61.306 22.1628 59.0586C21.0752 54.98 21.0752 46.4647 21.0752 46.4647C21.0752 46.4647 21.0752 37.9495 22.1628 33.8708C22.7689 31.615 24.5374 29.8421 26.7791 29.2428C30.8557 28.1523 47.1703 28.1523 47.1703 28.1523C47.1703 28.1523 63.4932 28.1523 67.5615 29.2428ZM55.5142 46.4647L41.9561 54.314V38.6154L55.5142 46.4647Z"
            fill="white"
          />
        </svg>
      ),
      name: "YouTube",
      link: "https://www.youtube.com/@CricSyncLive",
      color: "hover:text-red-500 hover:bg-red-500/10",
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 93 92"
          fill="none"
          className="w-6 h-6 shrink-0"
        >
          <rect
            x="1.13867"
            width="91.5618"
            height="91.5618"
            rx="15"
            fill="url(#paint0_linear_7092_54439)"
          />
          <path
            d="M38.3762 45.7808C38.3762 41.1786 42.1083 37.4468 46.7132 37.4468C51.3182 37.4468 55.0522 41.1786 55.0522 45.7808C55.0522 50.383 51.3182 54.1148 46.7132 54.1148C42.1083 54.1148 38.3762 50.383 38.3762 45.7808ZM33.8683 45.7808C33.8683 52.8708 39.619 58.618 46.7132 58.618C53.8075 58.618 59.5581 52.8708 59.5581 45.7808C59.5581 38.6908 53.8075 32.9436 46.7132 32.9436C39.619 32.9436 33.8683 38.6908 33.8683 45.7808ZM57.0648 32.4346C57.0646 33.0279 57.2404 33.608 57.5701 34.1015C57.8997 34.595 58.3684 34.9797 58.9168 35.2069C59.4652 35.4342 60.0688 35.4939 60.6511 35.3784C61.2334 35.2628 61.7684 34.9773 62.1884 34.5579C62.6084 34.1385 62.8945 33.6041 63.0105 33.0222C63.1266 32.4403 63.0674 31.8371 62.8404 31.2888C62.6134 30.7406 62.2289 30.2719 61.7354 29.942C61.2418 29.6122 60.6615 29.436 60.0679 29.4358H60.0667C59.2708 29.4361 58.5077 29.7522 57.9449 30.3144C57.3821 30.8767 57.0655 31.6392 57.0648 32.4346ZM36.6072 66.1302C34.1683 66.0192 32.8427 65.6132 31.9618 65.2702C30.7939 64.8158 29.9606 64.2746 29.0845 63.4002C28.2083 62.5258 27.666 61.6938 27.2133 60.5266C26.8699 59.6466 26.4637 58.3214 26.3528 55.884C26.2316 53.2488 26.2073 52.4572 26.2073 45.781C26.2073 39.1048 26.2336 38.3154 26.3528 35.678C26.4639 33.2406 26.8731 31.918 27.2133 31.0354C27.668 29.8682 28.2095 29.0354 29.0845 28.1598C29.9594 27.2842 30.7919 26.7422 31.9618 26.2898C32.8423 25.9466 34.1683 25.5406 36.6072 25.4298C39.244 25.3086 40.036 25.2844 46.7132 25.2844C53.3904 25.2844 54.1833 25.3106 56.8223 25.4298C59.2612 25.5408 60.5846 25.9498 61.4677 26.2898C62.6356 26.7422 63.4689 27.2854 64.345 28.1598C65.2211 29.0342 65.7615 29.8682 66.2161 31.0354C66.5595 31.9154 66.9658 33.2406 67.0767 35.678C67.1979 38.3154 67.2221 39.1048 67.2221 45.781C67.2221 52.4572 67.1979 53.2466 67.0767 55.884C66.9656 58.3214 66.5573 59.6462 66.2161 60.5266C65.7615 61.6938 65.2199 62.5266 64.345 63.4002C63.4701 64.2738 62.6356 64.8158 61.4677 65.2702C60.5872 65.6134 59.2612 66.0194 56.8223 66.1302C54.1855 66.2514 53.3934 66.2756 46.7132 66.2756C40.033 66.2756 39.2432 66.2514 36.6072 66.1302ZM36.4001 20.9322C33.7371 21.0534 31.9174 21.4754 30.3282 22.0934C28.6824 22.7316 27.2892 23.5878 25.897 24.977C24.5047 26.3662 23.6502 27.7608 23.0116 29.4056C22.3933 30.9948 21.971 32.8124 21.8497 35.4738C21.7265 38.1394 21.6982 38.9916 21.6982 45.7808C21.6982 52.57 21.7265 53.4222 21.8497 56.0878C21.971 58.7494 22.3933 60.5668 23.0116 62.156C23.6502 63.7998 24.5049 65.196 25.897 66.5846C27.289 67.9732 28.6824 68.8282 30.3282 69.4682C31.9204 70.0862 33.7371 70.5082 36.4001 70.6294C39.0687 70.7506 39.92 70.7808 46.7132 70.7808C53.5065 70.7808 54.3592 70.7526 57.0264 70.6294C59.6896 70.5082 61.5081 70.0862 63.0983 69.4682C64.7431 68.8282 66.1373 67.9738 67.5295 66.5846C68.9218 65.1954 69.7745 63.7998 70.4149 62.156C71.0332 60.5668 71.4575 58.7492 71.5768 56.0878C71.698 53.4202 71.7262 52.57 71.7262 45.7808C71.7262 38.9916 71.698 38.1394 71.5768 35.4738C71.4555 32.8122 71.0332 30.9938 70.4149 29.4056C69.7745 27.7618 68.9196 26.3684 67.5295 24.977C66.1395 23.5856 64.7431 22.7316 63.1003 22.0934C61.5081 21.4754 59.6894 21.0514 57.0284 20.9322C54.3612 20.811 53.5085 20.7808 46.7152 20.7808C39.922 20.7808 39.0687 20.809 36.4001 20.9322Z"
            fill="white"
          />
          <defs>
            <linearGradient
              id="paint0_linear_7092_54439"
              x1="90.9407"
              y1="91.5618"
              x2="-0.621143"
              y2="-2.46459e-06"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FBE18A" />
              <stop offset="0.21" stopColor="#FCBB45" />
              <stop offset="0.38" stopColor="#F75274" />
              <stop offset="0.52" stopColor="#D53692" />
              <stop offset="0.74" stopColor="#8F39CE" />
              <stop offset="1" stopColor="#5B4FE9" />
            </linearGradient>
          </defs>
        </svg>
      ),
      name: "Instagram",
      link: "https://www.instagram.com/cricsynclive",
      color: "hover:text-pink-500 hover:bg-pink-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans pb-20 transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in">
        {/* Navigation Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)] uppercase tracking-widest mt-4 mb-8 transition-colors"
        >
          <Home size={14} /> Back to Hub
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4 text-[var(--accent)]">
            Get in Touch
          </h1>
          <p className="text-lg max-w-2xl mx-auto font-medium text-[var(--text-muted)]">
            Have a question about onboarding your tournament? <br />
            Need technical support? We are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* --- LEFT: CONTACT DETAILS --- */}
          <div className="lg:col-span-5 space-y-8">
            <div className="p-8 rounded-[2.5rem] border bg-[var(--surface-1)] border-[var(--border-1)] shadow-xl transition-colors">
              <h3 className="text-2xl font-black text-[var(--foreground)] uppercase tracking-widest mb-6 leading-tight">
                Contact <br />
                <span className="text-[var(--accent)]">Information</span>
              </h3>

              <div className="space-y-6">
                {contactMethods.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)] transition-colors">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                        {item.title}
                      </p>
                      {item.link ? (
                        <a
                          href={item.link}
                          className="font-bold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="font-bold text-[var(--foreground)]">
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="mt-8 pt-6 border-t border-[var(--border-1)] transition-colors">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-4 text-[var(--text-muted)]">
                  Follow Us
                </p>
                <div className="flex gap-4">
                  {socialLinks.map((social, i) => (
                    <a
                      key={i}
                      href={social.link}
                      target="_blank"
                      rel="noreferrer"
                      className={`p-3 rounded-xl border transition-all duration-300 flex items-center gap-2 bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--text-muted)] ${social.color}`}
                    >
                      {social.icon}
                      <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline-block">
                        {social.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT: SUPABASE FORM --- */}
          <div className="lg:col-span-7">
            <div className="p-8 md:p-10 rounded-[2.5rem] border relative overflow-hidden h-full bg-[var(--surface-1)] border-[var(--border-1)] shadow-xl transition-colors">
              <h3 className="text-2xl font-black text-[var(--foreground)] uppercase tracking-widest mb-2">
                Send a Message
              </h3>
              <p className="text-sm font-medium mb-8 text-[var(--text-muted)]">
                Fill out the form below and our team will get back to you within
                24 hours.
              </p>

              {status === "success" ? (
                <div className="p-8 border rounded-3xl text-center flex flex-col items-center justify-center h-64 bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)] transition-colors">
                  <div className="w-16 h-16 bg-[var(--accent)] text-[var(--background)] rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <Send size={24} className="ml-1" />
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-widest mb-2">
                    Message Sent!
                  </h4>
                  <p className="text-sm font-medium opacity-80 text-[var(--foreground)]">
                    We've received your inquiry and will be in touch shortly.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-6 text-xs font-bold uppercase tracking-widest underline underline-offset-4 text-[var(--accent)] hover:opacity-80"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 relative z-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-[var(--text-muted)]">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Full Name"
                        required
                        className="w-full p-4 rounded-2xl border outline-none font-medium transition-colors bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-[var(--text-muted)]">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        required
                        className="w-full p-4 rounded-2xl border outline-none font-medium transition-colors bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block text-[var(--text-muted)]">
                      Your Message
                    </label>
                    <textarea
                      placeholder="Tell us about your tournament..."
                      required
                      rows={6}
                      className="w-full p-4 rounded-2xl border outline-none font-medium resize-none transition-colors bg-[var(--surface-2)] border-[var(--border-1)] text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      Failed to send message. Please try again later.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full py-4 bg-[var(--accent)] text-[var(--background)] font-black rounded-2xl uppercase tracking-widest hover:opacity-90 transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-lg disabled:opacity-70 disabled:active:scale-100"
                  >
                    {status === "submitting" ? (
                      <span className="animate-pulse">Sending...</span>
                    ) : (
                      <>
                        Send Message <Send size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
